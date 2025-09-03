import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
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

    console.log(`Cleaning up all stale uploads for user ${user.id}`)

    // Delete all records with UPLOADING or PENDING_UPLOAD status
    // These are considered failed/abandoned uploads
    const { data: deletedRecords, error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('user_id', user.id)
      .in('status', ['UPLOADING', 'PENDING_UPLOAD'])
      .select('id, title')

    if (deleteError) {
      console.error('Failed to cleanup stale uploads:', deleteError)
      return NextResponse.json(
        { error: 'Failed to cleanup stale uploads' },
        { status: 500 }
      )
    }

    const count = deletedRecords?.length || 0
    console.log(`Successfully cleaned up ${count} stale upload records`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${count} stale upload records`,
      cleanedRecords: deletedRecords
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup stale uploads' },
      { status: 500 }
    )
  }
}
