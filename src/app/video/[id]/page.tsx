'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store/store'
import { fetchVideoById } from '@/store/slices/videosSlice'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ShareLinkManager } from '@/components/ShareLinkManager'
import { VideoMetadata } from '@/components/VideoMetadata'
import { Header } from '@/components/Header'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function VideoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const dispatch = useDispatch<AppDispatch>()
  const { currentVideo, loading } = useSelector((state: RootState) => state.videos)
  const [activeTab, setActiveTab] = useState<'player' | 'share'>('player')

  const videoId = params.id as string
  const tabParam = searchParams.get('tab')

  useEffect(() => {
    if (videoId) {
      dispatch(fetchVideoById(videoId))
    }
  }, [dispatch, videoId])

  useEffect(() => {
    if (tabParam === 'share') {
      setActiveTab('share')
    }
  }, [tabParam])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-gray-500 text-lg">⚠️ Video not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">
          {currentVideo.title}
        </h1>

        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('player')}
              className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'player'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎥 Video Player
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'share'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔗 Share Links
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 transition-all">
          {activeTab === 'player' ? (
            <div className="space-y-8">
              <VideoPlayer video={currentVideo} />
              <VideoMetadata video={currentVideo} />
            </div>
          ) : (
            <ShareLinkManager videoId={currentVideo.id} />
          )}
        </div>
      </main>
    </div>
  )
}
