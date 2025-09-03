import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createServerSupabaseClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    console.log(`Cleaning up failed upload for video ${videoId}`)

    // Check if the video exists and belongs to the user
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('id, status, user_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Only allow cleanup for failed uploads or uploads that never completed
    if (video.status === 'READY' || video.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Cannot cleanup completed or processing videos' },
        { status: 400 }
      )
    }

    // Option 1: Set status to FAILED (keeps record for debugging)
    // Option 2: Delete the record entirely (cleaner UI)
    // We'll use Option 2 for better user experience
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete video record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to cleanup video record' },
        { status: 500 }
      )
    }

    console.log(`Successfully cleaned up video ${videoId}`)

    return NextResponse.json({
      success: true,
      message: 'Upload record cleaned up successfully',
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup upload' },
      { status: 500 }
    )
  }
}
