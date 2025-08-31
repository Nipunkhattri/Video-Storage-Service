import { videoProcessingWorker, emailWorker } from './lib/queue'

console.log('Starting background workers...')
console.log('Current working directory:', process.cwd())
console.log('Platform:', process.platform)
console.log('Architecture:', process.arch)

videoProcessingWorker.on('error', (error) => {
  console.error('Video processing worker error:', error)
})

videoProcessingWorker.on('failed', (job, error) => {
  console.error('Video processing job failed:', job?.id || 'unknown', error)
})

videoProcessingWorker.on('completed', (job) => {
  console.log('Video processing job completed:', job?.id || 'unknown')
})

emailWorker.on('error', (error) => {
  console.error('Email worker error:', error)
})

emailWorker.on('failed', (job, error) => {
  console.error('Email job failed:', job?.id || 'unknown', error)
})

emailWorker.on('completed', (job) => {
  console.log('Email job completed:', job?.id || 'unknown')
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers...')
  await videoProcessingWorker.close()
  await emailWorker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down workers...')
  await videoProcessingWorker.close()
  await emailWorker.close()
  process.exit(0)
})

console.log('Background workers started successfully')
console.log('- Video processing worker: Ready')
console.log('- Email worker: Ready')
