import { NextRequest, NextResponse } from 'next/server';
import { videoProcessingQueue, emailQueue, videoProcessingWorker, emailWorker } from '@/lib/queue';

export async function GET(request: NextRequest) {
  try {
    const result = {
      timestamp: new Date().toISOString(),
      redis_connection: process.env.UPSTASH_REDIS_URL ? 'configured' : 'missing',
      queues: {
        video_processing: {
          available: videoProcessingQueue !== null,
          waiting: videoProcessingQueue ? await videoProcessingQueue.getWaiting() : [],
          active: videoProcessingQueue ? await videoProcessingQueue.getActive() : [],
          completed: videoProcessingQueue ? await videoProcessingQueue.getCompleted() : [],
          failed: videoProcessingQueue ? await videoProcessingQueue.getFailed() : [],
          counts: videoProcessingQueue ? await videoProcessingQueue.getJobCounts() : null,
        },
        email: {
          available: emailQueue !== null,
          waiting: emailQueue ? await emailQueue.getWaiting() : [],
          active: emailQueue ? await emailQueue.getActive() : [],
          completed: emailQueue ? await emailQueue.getCompleted() : [],
          failed: emailQueue ? await emailQueue.getFailed() : [],
          counts: emailQueue ? await emailQueue.getJobCounts() : null,
        }
      },
      workers: {
        video_processing: {
          available: videoProcessingWorker !== null,
          is_running: videoProcessingWorker ? videoProcessingWorker.isRunning() : false,
        },
        email: {
          available: emailWorker !== null,
          is_running: emailWorker ? emailWorker.isRunning() : false,
        }
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        uptime: process.uptime(),
      }
    };

    // Get job details for active and recent jobs
    if (videoProcessingQueue) {
      const recentJobs = await videoProcessingQueue.getJobs(['completed', 'failed'], 0, 10);
      result.queues.video_processing.recent_jobs = recentJobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get queue status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Add ability to manually trigger a test job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'test_video_processing') {
      if (!videoProcessingQueue) {
        return NextResponse.json({ error: 'Video processing queue not available' }, { status: 503 });
      }
      
      const testJob = await videoProcessingQueue.add('test-process', {
        videoId: 'test-video-id',
        videoKey: 'test/video.mp4',
        userId: 'test-user-id',
        isTest: true
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test job added',
        jobId: testJob.id 
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Queue action error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
