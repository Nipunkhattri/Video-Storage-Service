'use client'

import { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store/store'
import { fetchUserVideos } from '@/store/slices/videosSlice'

import { VideoUpload } from '@/components/VideoUpload'
import { VideoDashboard } from '@/components/VideoDashboard'
import { Header } from '@/components/Header'
import { LoginPage } from '@/components/LoginPage'
import { VideoPlayer } from '@/components/VideoPlayer'
import { VideoMetadata } from '@/components/VideoMetadata'
import { X } from 'lucide-react'

interface SharedVideoData {
  video: {
    id: string;
    title: string;
    s3_key: string;
    [key: string]: unknown;
  };
  shareLink: {
    id: string;
    visibility: string;
    expires_at: string | null;
    download_url: string;
  };
}

export default function Home() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, loading: userLoading, loaded: userLoaded } = useSelector((state: RootState) => state.user)
  const { videos, loading: videosLoading, loaded: videosLoaded } = useSelector((state: RootState) => state.videos)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [sharedToken, setSharedToken] = useState<string | null>(null)
  const [sharedData, setSharedData] = useState<SharedVideoData | null>(null)
  const [sharedLoading, setSharedLoading] = useState(false)
  const [sharedError, setSharedError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      const t = e?.detail
      if (t) setSharedToken(t)
    }
    window.addEventListener('openSharedToken', handler as EventListener)
    return () => window.removeEventListener('openSharedToken', handler as EventListener)
  }, [])

  useEffect(() => {
    if (!sharedToken) return
    const fetchShared = async () => {
      setSharedLoading(true)
      setSharedError(null)
      setSharedData(null)
      try {
        const res = await fetch(`/api/share/${sharedToken}`)
        if (res.status === 404) {
          setSharedError('Share link not found')
        } else if (res.status === 410) {
          setSharedError('Share link has expired')
        } else if (!res.ok) {
          setSharedError('Failed to load shared video')
        } else {
          const data = await res.json()
          setSharedData(data)
          try {
            const url = new URL(window.location.href)
            url.searchParams.delete('share')
            window.history.replaceState({}, '', url.toString())
          } catch {}
        }
      } catch {
        setSharedError('Failed to load shared video')
      } finally {
        setSharedLoading(false)
      }
    }
    fetchShared()
  }, [sharedToken])

  useEffect(() => {
    if (user && !videosLoaded) {
      dispatch(fetchUserVideos(user.id))
    }
  }, [dispatch, user, videosLoaded])

  useEffect(() => {
    if (!user || !videosLoaded) return
    const hasProcessingVideos = videos.some(video => video.status === 'PROCESSING' || video.status === 'UPLOADING')
    if (hasProcessingVideos) {
      pollingIntervalRef.current = setInterval(() => {
        dispatch(fetchUserVideos(user.id))
      }, 5000)
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [dispatch, user, videos, videosLoaded])

  if (userLoading && !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user && userLoaded) {
    return <LoginPage />
  }

  if (!userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-10">
          <VideoUpload />
          <VideoDashboard videos={videos} loading={videosLoading} />
        </div>
      </main>

      {sharedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setSharedToken(null); setSharedData(null); setSharedError(null); }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Shared Video</h3>
              <button
                className="p-1 rounded-full hover:bg-gray-200 transition"
                onClick={() => { setSharedToken(null); setSharedData(null); setSharedError(null); }}
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              {sharedLoading && <div className="text-center py-8 text-gray-600">Loading shared video...</div>}
              {sharedError && <div className="text-center py-8 text-red-600">{sharedError}</div>}
              {sharedData && (
                <div className="space-y-6">
                  <VideoPlayer video={{
                    id: sharedData.video.id,
                    title: sharedData.video.title,
                    s3_key: sharedData.video.s3_key,
                    user_id: '',
                    filename: sharedData.video.title,
                    size: 0,
                    duration: null,
                    status: 'READY',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    share_links: [],
                    thumbnails: []
                  }} />
                  <VideoMetadata video={{
                    id: sharedData.video.id,
                    title: sharedData.video.title,
                    s3_key: sharedData.video.s3_key,
                    user_id: '',
                    filename: sharedData.video.title,
                    size: 0,
                    duration: null,
                    status: 'READY',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    share_links: [],
                    thumbnails: []
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          try {
            const params = new URLSearchParams(window.location.search)
            const t = params.get('share')
            if (t) {
              var sharePath = '/share/' + encodeURIComponent(t)
              if (window.location.pathname === '/' || window.location.pathname === '') {
                window.location.replace(sharePath)
              } else {
                window.location.href = sharePath
              }
            }
          } catch(e){}
        })()
      `}} />
    </div>
  )
}
