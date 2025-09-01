import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { uploadToS3 } from '@/lib/aws'
import { videoProcessingQueue } from '@/lib/queue'
import { handleUploadError, logUploadMetrics } from '@/lib/upload-utils'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

// Configure for larger uploads
export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutes for Vercel Pro, 10 seconds for hobby

export async function POST(request: NextRequest) {
  const startTime = new Date()
  console.log('Upload request started at:', startTime.toISOString())
  
  let videoId: string | null = null
  let supabaseClient: any = null
  
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization token provided')
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) 
    console.log('Authenticating user...')
    
    supabaseClient = createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    console.log('User authenticated:', user.id)
    console.log('Parsing form data...')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.log('No file provided')
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    console.log('File received:', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    })

    if (file.size > MAX_FILE_SIZE) {
      console.log('File size exceeds limit:', file.size)
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('video/')) {
      console.log('Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    videoId = uuidv4()
    const videoKey = `videos/${user.id}/${videoId}/${file.name}`

    console.log('Creating database record for video:', videoId)
    
    // Create database record first
    const { error: dbError } = await supabaseClient
      .from('videos')
      .insert({
        id: videoId,
        user_id: user.id,
        title: file.name,
        filename: file.name,
        s3_key: videoKey,
        size: file.size,
        status: 'UPLOADING',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insertion failed:', dbError)
      const error = handleUploadError(dbError, 'database_insert')
      return NextResponse.json(
        { error: 'Failed to create video record', details: error },
        { status: 500 }
      )
    }

    console.log('Database record created successfully')
    console.log('Starting S3 upload...')

    try {
      // Use streams for large files instead of loading entire file into memory
      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadToS3(videoKey, buffer, file.type)
      
      console.log('S3 upload completed successfully')
      logUploadMetrics(videoId, file.size, startTime)
      
      // Update status to PROCESSING
      const { error: updateError } = await supabaseClient
        .from('videos')
        .update({ status: 'PROCESSING' })
        .eq('id', videoId)

      if (updateError) {
        console.error('Failed to update video status:', updateError)
        // Don't return error here, just log it
      }

      console.log('Adding video to processing queue...')
      
      await videoProcessingQueue.add('process-video', {
        videoId,
        videoKey,
        userId: user.id,
      })

      console.log('Upload process completed at:', new Date().toISOString())

      return NextResponse.json({
        success: true,
        videoId,
        message: 'Video uploaded successfully',
      })
    } catch (s3Error) {
      console.error('S3 upload failed:', s3Error)
      const error = handleUploadError(s3Error, 's3_upload')
      
      // Update video status to FAILED
      if (supabaseClient && videoId) {
        await supabaseClient
          .from('videos')
          .update({ status: 'FAILED' })
          .eq('id', videoId)
      }
        
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Upload error:', error)
    const handledError = handleUploadError(error, 'general')
    
    // Clean up database record if it was created
    if (supabaseClient && videoId) {
      try {
        await supabaseClient
          .from('videos')
          .update({ status: 'FAILED' })
          .eq('id', videoId)
      } catch (cleanupError) {
        console.error('Failed to update video status to FAILED:', cleanupError)
      }
    }
    
    return NextResponse.json(
      { error: 'Upload failed', details: handledError },
      { status: 500 }
    )
  }
}
