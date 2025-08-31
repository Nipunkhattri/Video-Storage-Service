'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { VideoPlayer } from '@/components/VideoPlayer'
import { VideoMetadata } from '@/components/VideoMetadata'
import { Loader2, Lock, AlertTriangle } from 'lucide-react'

interface SharedVideoData {
  video: {
    id: string;
    title: string;
    s3_key: string;
    [key: string]: unknown;
  };
  shareLink: {
    id: string;
    visibility: 'PUBLIC' | 'PRIVATE';
    expires_at: string | null;
    download_url: string;
  };
}

interface AccessError {
  error: string
  requiresEmail?: boolean
  allowedEmails?: string[]
}

export default function SharedVideoPage() {
  const params = useParams()
  const token = params.token as string
  const [videoData, setVideoData] = useState<SharedVideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AccessError | null>(null)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const fetchSharedVideo = useCallback(async (userEmail?: string) => {
    try {
      const verified = false
      const url = userEmail
        ? `/api/share/${token}?email=${encodeURIComponent(userEmail)}${verified ? '&verified=1' : ''}`
        : `/api/share/${token}`

      const response = await fetch(url)

      if (response.status === 404) setError({ error: 'Share link not found' })
      else if (response.status === 410) setError({ error: 'Share link has expired' })
      else if (response.status === 403) setError(await response.json())
      else if (!response.ok) setError({ error: 'Failed to load video' })
      else {
        const data = await response.json()
        setVideoData(data)
        setError(null)
      }
    } catch {
      setError({ error: 'Failed to load video' })
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }, [token])

  useEffect(() => {
    fetchSharedVideo()
  }, [fetchSharedVideo])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', email: email.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError({ error: err.error || 'Failed to request OTP' })
      } else {
        setOtpRequested(true)
      }
    } catch {
      setError({ error: 'Failed to request OTP' })
    }
    setSubmitting(false)
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return
    setVerifyingOtp(true)

    try {
      const res = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', email: email.trim(), code: otpCode.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError({ error: err.error || 'OTP verification failed' })
      } else {
        setError(null)
        setOtpRequested(false)
        setOtpCode('')
        setVideoData(null)
        setLoading(true)

        const videoRes = await fetch(`/api/share/${token}?email=${encodeURIComponent(email.trim())}&verified=1`)
        if (!videoRes.ok) {
          setError(await videoRes.json())
        } else {
          setVideoData(await videoRes.json())
        }
      }
    } catch {
      setError({ error: 'OTP verification failed' })
    } finally {
      setVerifyingOtp(false)
      setLoading(false)
    }
  }

  // ---- UI STATES ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Loading your video...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center border border-red-100">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h1>
          <p className="text-gray-600 mb-6">{error.error}</p>

          {error.requiresEmail && (
            <form onSubmit={handleEmailSubmit} className="space-y-5 text-left">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {error.allowedEmails?.length > 0 && (
                <p className="text-xs text-gray-500">
                  Allowed emails: <span className="font-medium">{error.allowedEmails.join(', ')}</span>
                </p>
              )}

              {!otpRequested ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Requesting...' : 'Request OTP'}
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    id="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {verifyingOtp ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpRequested(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-xl hover:bg-gray-300 transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    )
  }

  if (!videoData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Video not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">{videoData.video.title}</h1>
          <div className="flex items-center gap-3 text-sm">
            {videoData.shareLink.visibility === 'PRIVATE' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                <Lock className="h-4 w-4" /> Private
              </span>
            )}
            {videoData.shareLink.expires_at && (
              <span className="text-gray-500">
                Expires: {new Date(videoData.shareLink.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200">
            <VideoPlayer video={videoData.video} />
          </div>
          <VideoMetadata video={videoData.video} />
        </div>
      </div>
    </div>
  )
}
