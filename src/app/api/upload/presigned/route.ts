/**
 * Presigned URL Generation API Route
 * 
 * Generates presigned URLs for direct S3 uploads, bypassing Vercel's 4.5MB limit.
 * This allows large video files to be uploaded directly to S3.
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Validate file metadata
 * 3. Create video record in database
 * 4. Generate presigned S3 upload URL
 * 5. Return URL and video ID to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getPresignedUploadUrl } from '@/lib/aws'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  console.log('Presigned URL request received')
  
  try {
    // Validate AWS configuration first
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
      console.error('Missing AWS environment variables:', {
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
        AWS_REGION: !!process.env.AWS_REGION,
      })
      return NextResponse.json(
        { error: 'AWS configuration is incomplete. Please check environment variables.' },
        { status: 500 }
      )
    }
    
    // Authenticate user via Bearer token
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    const { fileName, fileSize, fileType } = await request.json()

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, fileType' },
        { status: 400 }
      )
    }

    const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      )
    }

    if (!fileType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    const videoId = uuidv4()
    const videoKey = `videos/${user.id}/${videoId}/${fileName}`
    
    console.log('Creating database record for video:', { videoId, userId: user.id, fileName, fileSize })

    // Create database record
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        id: videoId,
        user_id: user.id,
        title: fileName,
        filename: fileName,
        s3_key: videoKey,
        size: fileSize,
        status: 'UPLOADING',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insertion failed:', dbError)
      return NextResponse.json(
        { error: 'Failed to create video record', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('Database record created successfully, generating presigned URL...')

    // Generate presigned URL for direct S3 upload
    try {
      const presignedUrl = await getPresignedUploadUrl(videoKey, fileType, 3600) // 1 hour expiry
      
      console.log('Presigned URL generated successfully')
      
      return NextResponse.json({
        success: true,
        videoId,
        uploadUrl: presignedUrl,
        message: 'Upload URL generated successfully',
      })
    } catch (awsError) {
      console.error('AWS presigned URL generation failed:', awsError)
      
      // Clean up the database record since AWS failed
      await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
      
      return NextResponse.json(
        { error: 'Failed to generate presigned URL', details: awsError instanceof Error ? awsError.message : 'Unknown AWS error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Presigned URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
