import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { emailQueue } from '@/lib/queue'
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
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { videoId, visibility, allowedEmails, expiryPreset } = body

    if (!videoId || !visibility) {
      return NextResponse.json(
        { error: 'videoId and visibility are required' },
        { status: 400 }
      )
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      )
    }

    const shareToken = uuidv4()

    let expiresAt = null
    if (expiryPreset && expiryPreset !== 'forever') {
      const now = new Date()
      switch (expiryPreset) {
        case '1h':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
          break
        case '12h':
          expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
          break
        case '1d':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          break
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          break
      }
    }

    const { data: shareLink, error } = await supabase
      .from('share_links')
      .insert({
        video_id: videoId,
        user_id: user.id,
        token: shareToken,
        visibility,
        allowed_emails: allowedEmails || null,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      )
    }

    if (visibility === 'PRIVATE' && allowedEmails && allowedEmails.length > 0) {
      for (const email of allowedEmails) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (user) {
          try {
            await emailQueue.add('send-email', {
              to: email,
              subject: 'You have been invited to view a video',
              htmlBody: `
                <h2>Video Share Invitation</h2>
                <p>You have been invited to view a private video.</p>
                <p>Click the link below to access the video:</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/share/${shareToken}">View Video</a>
              `,
            })
          } catch (emailError) {
            console.error(`Failed to send email notification to ${email}:`, emailError)
          }
        }
      }
    }

    return NextResponse.json(shareLink)
  } catch (error) {
    console.error('Create share link error:', error)
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const { data: shareLinks, error } = await supabase
      .from('share_links')
      .select(`
        *,
        videos (title, filename)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch share links' },
        { status: 500 }
      )
    }

    return NextResponse.json(shareLinks)
  } catch (error) {
    console.error('Fetch share links error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    )
  }
}
