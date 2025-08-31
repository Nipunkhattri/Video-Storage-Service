import { NextRequest, NextResponse } from 'next/server'
import { getSignedDownloadUrl } from '@/lib/aws'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const downloadUrl = await getSignedDownloadUrl(video.s3_key, 7200)

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error('Video download error:', error)
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
}
