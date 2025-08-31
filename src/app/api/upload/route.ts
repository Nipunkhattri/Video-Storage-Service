import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { uploadToS3 } from '@/lib/aws'
import { videoProcessingQueue } from '@/lib/queue'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    const videoId = uuidv4()
    const videoKey = `videos/${user.id}/${videoId}/${file.name}`

    const { data: video, error: dbError } = await supabase
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
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadToS3(videoKey, buffer, file.type)

    await supabase
      .from('videos')
      .update({ status: 'PROCESSING' })
      .eq('id', videoId)

    await videoProcessingQueue.add('process-video', {
      videoId,
      videoKey,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      videoId,
      message: 'Video uploaded successfully',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
