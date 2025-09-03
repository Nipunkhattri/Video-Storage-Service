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

    console.log(`Starting upload for video ${videoId}`)

    // Update status to UPLOADING
    const { error: updateError } = await supabase
      .from('videos')
      .update({ 
        status: 'UPLOADING',
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update video status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update video status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Upload started',
    })

  } catch (error) {
    console.error('Start upload error:', error)
    return NextResponse.json(
      { error: 'Failed to start upload' },
      { status: 500 }
    )
  }
}
