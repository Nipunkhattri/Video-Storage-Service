// Utility for handling upload errors and monitoring
export interface UploadError {
  code: string
  message: string
  details?: Error | unknown
  timestamp: Date
}

export const handleUploadError = (error: Error | unknown, context: string): UploadError => {
  const timestamp = new Date()
  console.error(`Upload error in ${context} at ${timestamp.toISOString()}:`, error)
  
  // Type guard for Error objects
  const isError = (err: unknown): err is Error => err instanceof Error
  const hasProperty = (obj: unknown, prop: string): boolean => 
    typeof obj === 'object' && obj !== null && prop in obj
  
  // AWS S3 specific errors
  if (hasProperty(error, 'name') && (error as { name: string }).name === 'NoSuchBucket') {
    return {
      code: 'S3_BUCKET_NOT_FOUND',
      message: 'S3 bucket does not exist',
      details: error,
      timestamp
    }
  }
  
  if (hasProperty(error, 'name') && (error as { name: string }).name === 'AccessDenied') {
    return {
      code: 'S3_ACCESS_DENIED',
      message: 'Access denied to S3 bucket',
      details: error,
      timestamp
    }
  }
  
  // Network/timeout errors
  if (hasProperty(error, 'code')) {
    const errorCode = (error as { code: string }).code
    if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNRESET') {
      return {
        code: 'NETWORK_TIMEOUT',
        message: 'Network timeout during upload',
        details: error,
        timestamp
      }
    }
  }
  
  // Memory errors
  if (isError(error) && error.message?.includes('heap out of memory')) {
    return {
      code: 'MEMORY_ERROR',
      message: 'Insufficient memory for file processing',
      details: error,
      timestamp
    }
  }
  
  // Database errors
  if (hasProperty(error, 'code') && 
      typeof (error as { code: unknown }).code === 'string' && 
      (error as { code: string }).code.startsWith('PGRST')) {
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
    message: isError(error) ? error.message : 'Unknown upload error',
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
