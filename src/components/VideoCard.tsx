'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store/store'
import { fetchUserVideos } from '@/store/slices/videosSlice'
import { VideoWithThumbnails } from '@/types/database'
import { Play, Download, Share2, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import api from '@/lib/api'

interface VideoCardProps {
  video: VideoWithThumbnails
}

export function VideoCard({ video }: VideoCardProps) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.user)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusIcon = () => {
    switch (video.status) {
      case 'UPLOADING':
        return <Clock className="h-4 w-4 text-yellow-400" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'READY':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (video.status) {
      case 'UPLOADING':
        return 'Uploading'
      case 'PROCESSING':
        return 'Processing'
      case 'READY':
        return 'Ready'
      default:
        return 'Error'
    }
  }

  const handleVideoClick = () => {
    router.push(`/video/${video.id}`)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/videos/${video.id}/download`)
      if (response.ok) {
        const { downloadUrl } = await response.json()
        window.open(downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleShare = () => {
    router.push(`/video/${video.id}?tab=share`)
  }

  const handleDelete = async () => {
    const ok = confirm('Delete this video? This action cannot be undone.')
    if (!ok) return

    try {
      const res = await api.delete(`/videos/${video.id}`)
      if (res.status === 200) {
        if (user && user.id) {
          dispatch(fetchUserVideos(user.id))
        } else {
          router.refresh()
        }
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete video')
    }
  }

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
      <div className="relative aspect-video bg-gray-100">
        {video.thumbnails && video.thumbnails.length > 0 && !imageError ? (
          <img
            src={`/api/thumbnails/${video.thumbnails[0].s3_key}`}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-12 w-12 text-gray-400" />
          </div>
        )}

        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-xs text-white">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-2 truncate group-hover:text-blue-600 transition-colors">
          {video.title}
        </h3>

        <div className="text-sm text-gray-500 space-y-1 mb-4">
          <p>{formatFileSize(video.size)}</p>
          <p>Uploaded {formatDate(video.created_at)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <button
            onClick={handleVideoClick}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
          >
            View
          </button>

          {video.status === 'READY' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                onClick={handleShare}
                className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
