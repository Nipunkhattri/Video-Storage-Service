import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createServerSupabaseClient } from './supabase';
import { PassThrough } from 'stream';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET!;

function getFfmpegPath(): string {
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    return ffmpegPath;
  }

  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  throw new Error('FFmpeg executable not found. Tried paths: ' + possiblePaths.join(', '));
}

/**
 * Generates a thumbnail for a video and uploads it to S3.
 *
 * @param videoId - The UUID of the video.
 * @param videoKey - The S3 key of the original video file.
 * @param userId - The ID of the user who owns the video.
 */
export async function generateThumbnails(
  videoId: string,
  videoKey: string,
  userId: string
): Promise<void> {
  console.log(`Generating thumbnail for videoId: ${videoId}`);

  const resolvedFfmpegPath = getFfmpegPath();
  
  console.log('Resolved FFmpeg path:', resolvedFfmpegPath);
  console.log('Current working directory:', process.cwd());
  console.log('Platform:', process.platform);
  console.log('Architecture:', process.arch);

  const thumbnailKey = `thumbnails/${userId}/${videoId}/thumbnail.jpg`;

  try {
    const getObjectCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: videoKey,
    });
    const { Body } = await s3Client.send(getObjectCommand);

    if (!Body) {
      throw new Error('Video file not found in S3.');
    }

  const videoStream = (Body as unknown) as PassThrough;
    const thumbnailStream = new PassThrough();

    const ffmpegPromise = new Promise<Buffer>((resolve, reject) => {
      console.log('Spawning FFmpeg with path:', resolvedFfmpegPath);
      
      const ffmpegProcess = spawn(
        resolvedFfmpegPath,
        [
          '-i', 'pipe:0', 
          '-ss', '00:00:05',
          '-vframes', '1',
          '-f', 'image2pipe', 
          'pipe:1',
        ],
        { 
          stdio: ['pipe', 'pipe', 'inherit'], 
          cwd: process.cwd() 
        }
      );

      videoStream.on('error', (err) => {
        console.error('Video stream error:', err);
        if ((err as any).code !== 'EPIPE') {
          reject(err);
        }
      });

      ffmpegProcess.stdin.on('error', (err) => {
        console.error('FFmpeg stdin error:', err);
        if ((err as any).code !== 'EPIPE') {
          reject(err);
        }
      });

      const chunks: Buffer[] = [];
      ffmpegProcess.stdout.on('data', (chunk) => chunks.push(chunk));

      ffmpegProcess.on('error', (err) => {
        console.error('FFmpeg process error:', err);
        reject(err);
      });

      ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process closed with code: ${code}`);
        if (code !== 0) {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });

      ffmpegProcess.on('exit', (code) => {
        console.log(`FFmpeg process exited with code: ${code}`);
        if (code !== 0) {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      videoStream.pipe(ffmpegProcess.stdin, { end: false });
      
      videoStream.on('end', () => {
        console.log('Video stream ended');
        ffmpegProcess.stdin.end();
      });
    });

    const thumbnailBuffer = await ffmpegPromise;

    const putObjectCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    });
    await s3Client.send(putObjectCommand);

    const supabase = createServerSupabaseClient();
    const { error: thumbnailError } = await supabase
      .from('thumbnails')
      .insert({
        video_id: videoId,
        s3_key: thumbnailKey,
        timestamp: 5, 
        position: 1
      });

    if (thumbnailError) {
      console.error('Supabase thumbnail insert failed:', thumbnailError);
      throw thumbnailError;
    }

    const { error: videoError } = await supabase
      .from('videos')
      .update({ status: 'READY' })
      .eq('id', videoId);

    if (videoError) {
      console.error('Supabase video update failed:', videoError);
      throw videoError;
    }

    console.log(`Thumbnail generated and saved to S3 at key: ${thumbnailKey}`);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
}
