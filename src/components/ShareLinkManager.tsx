'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { Share2, Copy, Trash2, Clock, Infinity, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface ShareLink {
  id: string
  video_id: string
  token: string
  visibility: 'PUBLIC' | 'PRIVATE'
  allowed_emails: string[] | null
  expires_at: string | null
  last_viewed_at: string | null
  created_at: string
}

interface ShareLinkManagerProps {
  videoId: string
}

export function ShareLinkManager({ videoId }: ShareLinkManagerProps) {
  const { user } = useSelector((state: RootState) => state.user)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
    allowedEmails: '',
    expiryPreset: 'forever'
  })
  const [emailError, setEmailError] = useState('')

  const validateEmails = (emailString: string): string[] => {
    const emails = emailString.split(',').map(email => email.trim()).filter(Boolean)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email format: ${email}`)
      }
    }
    
    return emails
  }

  const fetchShareLinks = useCallback(async () => {
    if (!user) return
    try {
      const response = await api.get('/share-links')
      setShareLinks(response.data.filter((link: ShareLink) => link.video_id === videoId))
    } catch (error) {
      console.error('Failed to fetch share links:', error)
    }
  }, [user, videoId])

  useEffect(() => {
    fetchShareLinks()
  }, [fetchShareLinks])

  const createShareLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    if (formData.visibility === 'PRIVATE') {
      try {
        validateEmails(formData.allowedEmails)
        setEmailError('')
      } catch (error) {
        setEmailError(error instanceof Error ? error.message : 'Invalid email format')
        return
      }
    }
    
    setLoading(true)
    try {
      await api.post('/share-links', {
        videoId,
        visibility: formData.visibility,
        allowedEmails: formData.visibility === 'PRIVATE'
          ? validateEmails(formData.allowedEmails)
          : null,
        expiryPreset: formData.expiryPreset,
      })
      await fetchShareLinks()
      setShowCreateForm(false)
      setFormData({ visibility: 'PUBLIC', allowedEmails: '', expiryPreset: 'forever' })
      setEmailError('')
    } catch (error) {
      console.error('Failed to create share link:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('✅ Share link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const deleteShareLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this share link?')) return
    try {
      await api.delete(`/share-links/${linkId}`)
      await fetchShareLinks()
    } catch (error) {
      console.error('Failed to delete share link:', error)
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  const isExpired = (expiresAt: string | null) => expiresAt ? new Date(expiresAt) < new Date() : false

  const getExpiryText = (expiresAt: string | null) => {
    if (!expiresAt) return 'Forever'
    if (isExpired(expiresAt)) return 'Expired'
    return formatDate(expiresAt)
  }

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto p-4 sm:p-6">
      
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 transition hover:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-900">🔗 Share Links</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all"
          >
            <Share2 className="h-4 w-4" />
            <span>{showCreateForm ? 'Close Form' : 'Create Share Link'}</span>
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={createShareLink} className="space-y-6 border-t pt-6 animate-fadeIn">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PUBLIC"
                    checked={formData.visibility === 'PUBLIC'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'PUBLIC' | 'PRIVATE' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">🌍 Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PRIVATE"
                    checked={formData.visibility === 'PRIVATE'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'PUBLIC' | 'PRIVATE' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">🔒 Private</span>
                </label>
              </div>
            </div>

            {formData.visibility === 'PRIVATE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Email Addresses</label>
                <input
                  type="text"
                  value={formData.allowedEmails}
                  onChange={(e) => {
                    setFormData({ ...formData, allowedEmails: e.target.value })
                    setEmailError('')
                  }}
                  placeholder="email1@example.com, email2@example.com"
                  className={`w-full px-4 text-black py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    emailError ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {emailError && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
              <select
                value={formData.expiryPreset}
                onChange={(e) => setFormData({ ...formData, expiryPreset: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="forever" className="text-gray-800">Forever</option>
                <option value="1h" className="text-gray-800">1 hour</option>
                <option value="12h" className="text-gray-800">12 hours</option>
                <option value="1d" className="text-gray-800">1 day</option>
                <option value="30d" className="text-gray-800">30 days</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || (formData.visibility === 'PRIVATE' && !formData.allowedEmails.trim())}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? '⏳ Creating...' : '✅ Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEmailError('')
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📂 Active Share Links</h3>
        </div>

        {shareLinks.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500 italic">
            No share links created yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {shareLinks.map((link) => (
              <div key={link.id} className="px-6 py-5 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      link.visibility === 'PUBLIC'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {link.visibility === 'PUBLIC' ? '🌍 Public' : '🔒 Private'}
                    </span>

                    <div className="flex items-center gap-2 text-sm">
                      {link.expires_at ? <Clock className="h-4 w-4 text-gray-400" /> : <Infinity className="h-4 w-4 text-gray-400" />}
                      <span className={`${isExpired(link.expires_at) ? 'text-red-500' : 'text-gray-600'}`}>
                        {getExpiryText(link.expires_at)}
                      </span>
                    </div>

                    {link.last_viewed_at && (
                      <span className="text-sm text-gray-500">
                        👀 Last viewed: {formatDate(link.last_viewed_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => copyToClipboard(link.token)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteShareLink(link.id)}
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition"
                      title="Delete link"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {link.allowed_emails && link.allowed_emails.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    Allowed emails: <span className="font-medium">{link.allowed_emails.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
