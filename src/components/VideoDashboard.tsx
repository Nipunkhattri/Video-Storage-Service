'use client'

import { useSelector, useDispatch } from 'react-redux'
import { VideoWithThumbnails } from '@/types/database'
import { VideoCard } from './VideoCard'
import { Loader2, RefreshCw } from 'lucide-react'
import { RootState, AppDispatch } from '@/store/store'
import { fetchUserVideos } from '@/store/slices/videosSlice'

interface VideoDashboardProps {
  videos: VideoWithThumbnails[]
  loading: boolean
}

export function VideoDashboard({ videos, loading }: VideoDashboardProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.user)

  const handleRefresh = () => {
    if (user) {
      dispatch(fetchUserVideos(user.id))
    }
  }

  const Header = (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
        Your Videos
      </h2>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium 
                   text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                   transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        {Header}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 text-sm">Loading your videos...</p>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        {Header}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 text-base">
            No videos uploaded yet. 
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Upload your first video to get started 🎥
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {Header}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}