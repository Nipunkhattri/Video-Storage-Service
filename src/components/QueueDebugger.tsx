import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';

interface JobData {
  videoId?: string;
  [key: string]: unknown;
}

interface QueueJob {
  id: string | number;
  data?: JobData;
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
  timestamp?: number;
  opts?: Record<string, unknown>;
}

interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed?: number;
  paused?: number;
}

interface QueueInfo {
  available: boolean;
  waiting: QueueJob[];
  active: QueueJob[];
  completed: QueueJob[];
  failed: QueueJob[];
  counts: JobCounts;
  recent_jobs?: QueueJob[];
}

interface WorkerInfo {
  available: boolean;
  is_running: boolean;
}

interface EnvironmentInfo {
  node_version: string;
  platform: string;
  arch: string;
  memory: {
    total: string;
    free: string;
    used: string;
  };
  uptime: number;
  cwd: string;
}

interface QueueStatus {
  timestamp: string;
  redis_connection: string;
  queues: {
    video_processing: QueueInfo;
    email: QueueInfo;
  };
  workers: {
    video_processing: WorkerInfo;
    email: WorkerInfo;
  };
  environment: EnvironmentInfo;
}

export function QueueDebugger() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/queue');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setQueueStatus(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue status');
      console.error('Error fetching queue status:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerTestJob = async () => {
    try {
      const response = await fetch('/api/debug/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_video_processing' })
      });
      
      if (response.ok) {
        alert('Test job added successfully!');
        fetchQueueStatus(); // Refresh status
      } else {
        const error = await response.json();
        alert(`Failed to add test job: ${error.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (available: boolean, running?: boolean) => {
    if (!available) return <XCircle className="w-5 h-5 text-red-500" />;
    if (running === false) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  if (loading && !queueStatus) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading queue status...</span>
        </div>
      </div>
    );
  }

  if (error && !queueStatus) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <div className="flex items-center space-x-2 text-red-700">
          <XCircle className="w-4 h-4" />
          <span>Error: {error}</span>
        </div>
        <button 
          onClick={fetchQueueStatus}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Queue Debug Dashboard</h2>
        <div className="flex space-x-2">
          <button 
            onClick={triggerTestJob}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center space-x-1"
          >
            <Play className="w-4 h-4" />
            <span>Test Job</span>
          </button>
          <button 
            onClick={fetchQueueStatus}
            disabled={loading}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center space-x-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          Warning: {error}
        </div>
      )}

      <div className="text-sm text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {queueStatus && (
        <>
          {/* Redis Connection Status */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Redis Connection</h3>
            <div className="flex items-center space-x-2">
              {getStatusIcon(queueStatus.redis_connection === 'configured')}
              <span>Status: {queueStatus.redis_connection}</span>
            </div>
          </div>

          {/* Workers Status */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Workers Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(
                  queueStatus.workers.video_processing.available,
                  queueStatus.workers.video_processing.is_running
                )}
                <span>Video Processing: {
                  queueStatus.workers.video_processing.available 
                    ? (queueStatus.workers.video_processing.is_running ? 'Running' : 'Stopped')
                    : 'Not Available'
                }</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(
                  queueStatus.workers.email.available,
                  queueStatus.workers.email.is_running
                )}
                <span>Email: {
                  queueStatus.workers.email.available 
                    ? (queueStatus.workers.email.is_running ? 'Running' : 'Stopped')
                    : 'Not Available'
                }</span>
              </div>
            </div>
          </div>

          {/* Queue Counts */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Video Processing Queue</h3>
            {queueStatus.queues.video_processing.available ? (
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span>Waiting: {queueStatus.queues.video_processing.counts?.waiting || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span>Active: {queueStatus.queues.video_processing.counts?.active || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Completed: {queueStatus.queues.video_processing.counts?.completed || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>Failed: {queueStatus.queues.video_processing.counts?.failed || 0}</span>
                </div>
              </div>
            ) : (
              <div className="text-red-500">Queue not available</div>
            )}
          </div>

          {/* Recent Jobs */}
          {queueStatus.queues.video_processing.recent_jobs && queueStatus.queues.video_processing.recent_jobs.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Recent Jobs</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {queueStatus.queues.video_processing.recent_jobs.map((job: QueueJob) => (
                  <div key={job.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Job {job.id}</div>
                        <div className="text-gray-600">Video ID: {job.data?.videoId}</div>
                        {job.failedReason && (
                          <div className="text-red-600 mt-1">Error: {job.failedReason}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'In progress'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environment Info */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Environment</h3>
            <div className="text-sm space-y-1">
              <div>Node.js: {queueStatus.environment.node_version}</div>
              <div>Platform: {queueStatus.environment.platform} ({queueStatus.environment.arch})</div>
              <div>Uptime: {Math.floor(queueStatus.environment.uptime / 60)} minutes</div>
              <div>Working Directory: {queueStatus.environment.cwd}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
