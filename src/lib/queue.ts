// lib/queue.ts
import { Queue, Worker, Job } from 'bullmq';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Redis URL:', process.env.UPSTASH_REDIS_URL);

// Create a Redis connection config for BullMQ with basic configuration for Upstash
const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null,
};

export let videoProcessingQueue: Queue | null = null;
export let videoProcessingWorker: Worker | null = null;
export let emailQueue: Queue | null = null;
export let emailWorker: Worker | null = null;

// Initialize queues and workers with error handling
try {
  if (connection.url) {
    console.log('🔄 Initializing queues with Redis URL...');
    videoProcessingQueue = new Queue('video-processing', { connection });
    console.log('✅ Video processing queue created');

    videoProcessingWorker = new Worker(
      'video-processing',
      async (job: Job) => {
        const { videoId, videoKey, userId, isTest } = job.data;

        console.log(`🎬 Starting video processing for videoId: ${videoId}`);
        console.log('📊 Job details:', {
          jobId: job.id,
          videoId,
          videoKey,
          userId,
          isTest,
          timestamp: new Date().toISOString()
        });
        console.log('🔧 Worker process info:', {
          cwd: process.cwd(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        });

        // Handle test jobs
        if (isTest) {
          console.log('🧪 Processing test job - skipping actual thumbnail generation');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
          console.log('✅ Test job completed successfully');
          return { success: true, message: 'Test job completed' };
        }

        // Validate required parameters
        if (!videoId || !videoKey || !userId) {
          throw new Error(`Missing required parameters: videoId=${videoId}, videoKey=${videoKey}, userId=${userId}`);
        }

        try {
          console.log('📦 Importing thumbnail generator...');
          const { generateThumbnails } = await import('./thumbnail-generator');
          
          console.log('🚀 Starting thumbnail generation...');
          await generateThumbnails(videoId, videoKey, userId);

          console.log(`✅ Video processing completed successfully for videoId: ${videoId}`);

        } catch (error) {
          console.error('❌ Error processing video:', error);
          if (error instanceof Error) {
            console.error('🔍 Error details:', {
              message: error.message,
              stack: error.stack,
              name: error.name,
              videoId,
              jobId: job.id
            });
          }
          throw error;
        }
      },
      { 
        connection,
        concurrency: 1, // Process one job at a time
        maxStalledCount: 3, // Retry stalled jobs up to 3 times
        stalledInterval: 30000, // Check for stalled jobs every 30 seconds
      }
    );
    console.log('✅ Video processing worker created');

    emailQueue = new Queue('email-notifications', { connection });
    console.log('✅ Email queue created');

    emailWorker = new Worker(
      'email-notifications',
      async (job: Job) => {
        const { to, subject, htmlBody } = job.data;

        // Validate required parameters
        if (!to || !subject || !htmlBody) {
          throw new Error(`Missing required parameters: to=${to}, subject=${subject}, htmlBody length=${htmlBody?.length}`);
        }

        try {
          console.log('📧 Sending email...');
          const { sendEmail } = await import('./aws');
          await sendEmail(to, subject, htmlBody);
          console.log(`✅ Email sent successfully to: ${to}`);
        } catch (error) {
          console.error(`❌ Error sending email to ${to}:`, error);
          
          if (error instanceof Error) {
            if (error.message.includes('not verified')) {
              console.error(`📧 Email address ${to} is not verified in AWS SES. Please verify the email address in AWS SES console.`);
            } else if (error.message.includes('MessageRejected')) {
              console.error(`📧 Email rejected for ${to}. This might be due to SES sandbox mode or unverified email.`);
            }
          }
          console.log(`⚠️ Email job completed with errors for ${to}`);
        }
      },
      { 
        connection,
        concurrency: 5, // Can process multiple emails simultaneously
      }
    );
    console.log('✅ Email worker created');

    console.log('🎉 Queues and workers initialized successfully');
  } else {
    console.warn('⚠️ Redis connection failed, queues will not be available');
    console.warn('Environment check:', {
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL ? 'Set' : 'Missing',
      NODE_ENV: process.env.NODE_ENV
    });
  }
} catch (error) {
  console.error('❌ Failed to initialize queues and workers:', error);
  if (error instanceof Error) {
    console.error('Initialization error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Helper function to safely add jobs to queues
export async function safeAddVideoProcessingJob(jobData: { videoId: string; videoKey: string; userId: string }) {
  console.log('🚀 Attempting to add video processing job:', jobData);
  
  if (videoProcessingQueue) {
    try {
      const job = await videoProcessingQueue.add('process-video', jobData);
      console.log('✅ Video processing job added successfully:', {
        jobId: job.id,
        videoId: jobData.videoId,
        timestamp: new Date().toISOString()
      });
      return { success: true, message: 'Job added to processing queue', jobId: job.id };
    } catch (error) {
      console.error('❌ Failed to add job to video processing queue:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      return { success: false, message: 'Failed to add job to queue', error };
    }
  } else {
    console.warn('⚠️ Video processing queue not available, job will be skipped');
    console.warn('Queue status:', {
      queue: videoProcessingQueue,
      redisUrl: process.env.UPSTASH_REDIS_URL ? 'configured' : 'missing'
    });
    return { success: false, message: 'Queue not available' };
  }
}

export async function safeAddEmailJob(jobData: { to: string; subject: string; htmlBody: string }) {
  console.log('📧 Attempting to add email job:', { to: jobData.to, subject: jobData.subject });
  
  if (emailQueue) {
    try {
      const job = await emailQueue.add('send-email', jobData);
      console.log('✅ Email job added successfully:', {
        jobId: job.id,
        to: jobData.to,
        timestamp: new Date().toISOString()
      });
      return { success: true, message: 'Email job added to queue', jobId: job.id };
    } catch (error) {
      console.error('❌ Failed to add email job to queue:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      return { success: false, message: 'Failed to add email job', error };
    }
  } else {
    console.warn('⚠️ Email queue not available, email will be skipped');
    console.warn('Queue status:', {
      queue: emailQueue,
      redisUrl: process.env.UPSTASH_REDIS_URL ? 'configured' : 'missing'
    });
    return { success: false, message: 'Email queue not available' };
  }
}
