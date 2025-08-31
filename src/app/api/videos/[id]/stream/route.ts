import { NextRequest, NextResponse } from 'next/server'
import { getSignedDownloadUrl } from '@/lib/aws'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Streaming video with ID:', id)
    
    const supabase = createServerSupabaseClient()

    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !video) {
      console.error('Video not found in database:', error)
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    console.log('Video found:', { id: video.id, s3_key: video.s3_key, title: video.title })

    if (!video.s3_key) {
      console.error('No S3 key found for video:', video.id)
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      )
    }

    try {
      const streamUrl = await getSignedDownloadUrl(video.s3_key, 3600)
      console.log('Generated signed URL for video:', video.id)

      const response = NextResponse.json({ streamUrl }, { status: 200 })
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      return response
    } catch (s3Error) {
      console.error('Failed to generate signed URL:', s3Error)
      return NextResponse.json(
        { error: 'Failed to generate video stream URL' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Video stream error:', error)
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
