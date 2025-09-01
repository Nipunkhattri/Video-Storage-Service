import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getPresignedUploadUrl } from '@/lib/aws'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
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
        status: 'PENDING_UPLOAD',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insertion failed:', dbError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    // Generate presigned URL for direct S3 upload
    const presignedUrl = await getPresignedUploadUrl(videoKey, fileType, 3600) // 1 hour expiry

    return NextResponse.json({
      success: true,
      videoId,
      uploadUrl: presignedUrl,
      message: 'Upload URL generated successfully',
    })

  } catch (error) {
    console.error('Presigned URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
