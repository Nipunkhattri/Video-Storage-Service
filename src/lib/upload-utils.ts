// Utility for handling upload errors and monitoring
export interface UploadError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

export const handleUploadError = (error: any, context: string): UploadError => {
  const timestamp = new Date()
  console.error(`Upload error in ${context} at ${timestamp.toISOString()}:`, error)
  
  // AWS S3 specific errors
  if (error.name === 'NoSuchBucket') {
    return {
      code: 'S3_BUCKET_NOT_FOUND',
      message: 'S3 bucket does not exist',
      details: error,
      timestamp
    }
  }
  
  if (error.name === 'AccessDenied') {
    return {
      code: 'S3_ACCESS_DENIED',
      message: 'Access denied to S3 bucket',
      details: error,
      timestamp
    }
  }
  
  // Network/timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return {
      code: 'NETWORK_TIMEOUT',
      message: 'Network timeout during upload',
      details: error,
      timestamp
    }
  }
  
  // Memory errors
  if (error.message?.includes('heap out of memory')) {
    return {
      code: 'MEMORY_ERROR',
      message: 'Insufficient memory for file processing',
      details: error,
      timestamp
    }
  }
  
  // Database errors
  if (error.code?.startsWith('PGRST')) {
    return {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      details: error,
      timestamp
    }
  }
  
  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown upload error',
    details: error,
    timestamp
  }
}

export const logUploadMetrics = (videoId: string, fileSize: number, startTime: Date) => {
  const endTime = new Date()
  const duration = endTime.getTime() - startTime.getTime()
  
  console.log('Upload metrics:', {
    videoId,
    fileSize,
    duration: `${duration}ms`,
    throughput: `${(fileSize / (duration / 1000) / 1024 / 1024).toFixed(2)} MB/s`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  })
}
