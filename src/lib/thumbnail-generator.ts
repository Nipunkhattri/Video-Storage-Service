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
  console.log(`🎬 Generating thumbnail for videoId: ${videoId}`);
  console.log('📝 Input parameters:', { videoId, videoKey, userId });

  const supabase = createServerSupabaseClient();
  
  // Update video status to show thumbnail generation started
  try {
    const { error: statusError } = await supabase
      .from('videos')
      .update({ 
        status: 'PROCESSING',
        processing_stage: 'thumbnail_generation',
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (statusError) {
      console.error('⚠️ Failed to update video status to processing:', statusError);
    } else {
      console.log('✅ Updated video status to processing');
    }
  } catch (error) {
    console.error('⚠️ Error updating video status:', error);
  }

  const resolvedFfmpegPath = getFfmpegPath();
  
  console.log('🔧 Resolved FFmpeg path:', resolvedFfmpegPath);
  console.log('📁 Current working directory:', process.cwd());
  console.log('💻 Platform:', process.platform);
  console.log('🏗️ Architecture:', process.arch);

  const thumbnailKey = `thumbnails/${userId}/${videoId}/thumbnail.jpg`;
  console.log('📍 Thumbnail key:', thumbnailKey);

  try {
    console.log('📥 Downloading video from S3...');
    const getObjectCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: videoKey,
    });
    const { Body } = await s3Client.send(getObjectCommand);

    if (!Body) {
      const error = new Error('Video file not found in S3.');
      console.error('❌', error.message);
      throw error;
    }

    console.log('✅ Video downloaded from S3 successfully');

  const videoStream = (Body as unknown) as PassThrough;

    const ffmpegPromise = new Promise<Buffer>((resolve, reject) => {
      console.log('🚀 Spawning FFmpeg with path:', resolvedFfmpegPath);
      
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

      console.log('⚡ FFmpeg process spawned with PID:', ffmpegProcess.pid);

      videoStream.on('error', (err) => {
        console.error('🔴 Video stream error:', err);
        if ((err as { code?: string }).code !== 'EPIPE') {
          reject(err);
        }
      });

      ffmpegProcess.stdin.on('error', (err) => {
        console.error('🔴 FFmpeg stdin error:', err);
        if ((err as { code?: string }).code !== 'EPIPE') {
          reject(err);
        }
      });

      const chunks: Buffer[] = [];
      ffmpegProcess.stdout.on('data', (chunk) => {
        console.log(`📊 Received ${chunk.length} bytes from FFmpeg`);
        chunks.push(chunk);
      });

      ffmpegProcess.on('error', (err) => {
        console.error('❌ FFmpeg process error:', err);
        reject(err);
      });

      ffmpegProcess.on('close', (code) => {
        console.log(`🏁 FFmpeg process closed with code: ${code}`);
        if (code !== 0) {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        } else {
          const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          console.log(`📊 Total thumbnail size: ${totalSize} bytes`);
          resolve(Buffer.concat(chunks));
        }
      });

      ffmpegProcess.on('exit', (code) => {
        console.log(`🚪 FFmpeg process exited with code: ${code}`);
        if (code !== 0) {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      console.log('🔄 Starting video stream pipe to FFmpeg...');
      videoStream.pipe(ffmpegProcess.stdin, { end: false });
      
      videoStream.on('end', () => {
        console.log('✅ Video stream ended, closing FFmpeg stdin');
        ffmpegProcess.stdin.end();
      });
    });

    console.log('⏳ Waiting for thumbnail generation...');
    const thumbnailBuffer = await ffmpegPromise;
    console.log(`✅ Thumbnail generated successfully (${thumbnailBuffer.length} bytes)`);

    console.log('📤 Uploading thumbnail to S3...');
    const putObjectCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    });
    await s3Client.send(putObjectCommand);
    console.log('✅ Thumbnail uploaded to S3 successfully');

    console.log('💾 Saving thumbnail record to database...');
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
      console.error('❌ Supabase thumbnail insert failed:', thumbnailError);
      throw thumbnailError;
    }
    console.log('✅ Thumbnail record saved to database');

    console.log('🔄 Updating video status to READY...');
    const { error: videoError } = await supabase
      .from('videos')
      .update({ 
        status: 'READY',
        processing_stage: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (videoError) {
      console.error('❌ Supabase video update failed:', videoError);
      throw videoError;
    }
    console.log('✅ Video status updated to READY');

    console.log(`🎉 Thumbnail generated and saved to S3 at key: ${thumbnailKey}`);
  } catch (error) {
    console.error('💥 Error generating thumbnail:', error);
    
    // Update video status to failed
    try {
      const supabase = createServerSupabaseClient();
      await supabase
        .from('videos')
        .update({ 
          status: 'FAILED',
          processing_stage: null,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);
      console.log('⚠️ Video status updated to FAILED');
    } catch (statusError) {
      console.error('❌ Failed to update video status to FAILED:', statusError);
    }
    
    throw error;
  }
}
