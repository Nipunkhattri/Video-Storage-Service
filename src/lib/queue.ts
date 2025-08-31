// lib/queue.ts
import { Queue, Worker, Job } from 'bullmq';

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null,  
};

export const videoProcessingQueue = new Queue('video-processing', { connection });

export const videoProcessingWorker = new Worker(
  'video-processing',
  async (job: Job) => {
    const { videoId, videoKey, userId } = job.data;

    console.log(`Starting video processing for videoId: ${videoId}`);
    console.log('Worker process info:', {
      cwd: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    });

    try {
      const { generateThumbnails } = await import('./thumbnail-generator');
      await generateThumbnails(videoId, videoKey, userId);

      console.log(`Video processing completed successfully for videoId: ${videoId}`);

    } catch (error) {
      console.error('Error processing video:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  },
  { connection }
);


export const emailQueue = new Queue('email-notifications', { connection });

export const emailWorker = new Worker(
  'email-notifications',
  async (job: Job) => {
    const { to, subject, htmlBody } = job.data;

    try {
      const { sendEmail } = await import('./aws');
      await sendEmail(to, subject, htmlBody);
      console.log(`Email sent successfully to: ${to}`);
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('not verified')) {
          console.error(`Email address ${to} is not verified in AWS SES. Please verify the email address in AWS SES console.`);
        } else if (error.message.includes('MessageRejected')) {
          console.error(`Email rejected for ${to}. This might be due to SES sandbox mode or unverified email.`);
        }
      }
      console.log(`Email job completed with errors for ${to}`);
    }
  },
  { connection }
);
