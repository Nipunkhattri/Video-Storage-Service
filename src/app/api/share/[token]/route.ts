import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getSignedDownloadUrl } from '@/lib/aws'

const OTP_TTL_MINUTES = 10

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServerSupabaseClient()

    const { data: shareLink, error } = await supabase
      .from('share_links')
      .select(`
        *,
        videos (*)
      `)
      .eq('token', token)
      .single()

    if (error || !shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      )
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    if (shareLink.visibility === 'PRIVATE') {
      const userEmail = request.nextUrl.searchParams.get('email')
      const verified = request.nextUrl.searchParams.get('verified') === '1'

      if (!userEmail) {
        return NextResponse.json(
          { 
            error: 'Email required for private access',
            requiresEmail: true,
            allowedEmails: shareLink.allowed_emails 
          },
          { status: 403 }
        )
      }

      if (!shareLink.allowed_emails || !shareLink.allowed_emails.includes(userEmail)) {
        return NextResponse.json(
          { 
            error: 'Access denied. Your email is not authorized to view this video.',
            requiresEmail: true,
            allowedEmails: shareLink.allowed_emails 
          },
          { status: 403 }
        )
      }

      if (!verified) {
        return NextResponse.json(
          { 
            error: 'Email not verified. Please request an OTP and verify.',
            requiresEmail: true,
            allowedEmails: shareLink.allowed_emails,
            requiresOtp: true,
          },
          { status: 403 }
        )
      }
    }

    await supabase
      .from('share_links')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('id', shareLink.id)

    const downloadUrl = await getSignedDownloadUrl(shareLink.videos.s3_key, 3600)

    return NextResponse.json({
      video: shareLink.videos,
      shareLink: {
        id: shareLink.id,
        visibility: shareLink.visibility,
        expires_at: shareLink.expires_at,
        download_url: downloadUrl,
      },
    })
  } catch (error) {
    console.error('Share link access error:', error)
    return NextResponse.json(
      { error: 'Failed to access share link' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action, email, code } = body || {}

    const supabase = createServerSupabaseClient()

    const { data: shareLink, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    if (action === 'request_otp') {
      if (shareLink.visibility !== 'PRIVATE') {
        return NextResponse.json({ error: 'OTP not required for public links' }, { status: 400 })
      }

      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      }

      if (!shareLink.allowed_emails || !shareLink.allowed_emails.includes(email)) {
        return NextResponse.json({ error: 'Email not authorized for this link' }, { status: 403 })
      }

      const otp = (Math.floor(100000 + Math.random() * 900000)).toString() // 6-digit
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

      await supabase.from('share_link_otps').insert({
        share_link_id: shareLink.id,
        email,
        code: otp,
        expires_at: expiresAt,
      })

      try {
        const html = `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`
        await sendEmail(email, 'Your verification code', html)
      } catch (err) {
        console.error('Failed to send OTP email:', err)
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'verify_otp') {
      if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
      }

      const { data: otpRows } = await supabase
        .from('share_link_otps')
        .select('*')
        .eq('share_link_id', shareLink.id)
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)

      const row = otpRows && otpRows[0]
      if (!row) {
        return NextResponse.json({ error: 'No OTP found for this email' }, { status: 404 })
      }

      if (row.is_verified) {
        return NextResponse.json({ success: true })
      }

      if (new Date(row.expires_at) < new Date()) {
        return NextResponse.json({ error: 'OTP expired' }, { status: 410 })
      }

      if (row.code !== code) {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })
      }

      await supabase.from('share_link_otps').update({ is_verified: true }).eq('id', row.id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('OTP request error:', error)
    return NextResponse.json({ error: 'Failed to process OTP request' }, { status: 500 })
  }
}
