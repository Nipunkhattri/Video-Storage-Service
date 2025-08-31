'use client'

import { VideoWithShareLinks } from '@/types/database'
import { Download, Calendar, HardDrive, Clock, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'

interface VideoMetadataProps {
  video: VideoWithShareLinks
}

export function VideoMetadata({ video }: VideoMetadataProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 transition hover:shadow-xl">
      <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-indigo-500" />
        Video Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">File Size</p>
              <p className="text-sm text-gray-600">{formatFileSize(video.size)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Duration</p>
              <p className="text-sm text-gray-600">{formatDuration(video.duration)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Upload Date</p>
              <p className="text-sm text-gray-600">{formatDate(video.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Filename</p>
              <p className="text-sm text-gray-600 break-all">{video.filename}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-indigo-500" /> Thumbnails
          </h4>
          {video.thumbnails && video.thumbnails.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {video.thumbnails.map((thumbnail) => (
                <div key={thumbnail.id} className="relative group overflow-hidden rounded-lg shadow border">
                  <img
                    src={`/api/thumbnails/${thumbnail.s3_key}`}
                    alt={`Thumbnail ${thumbnail.position}`}
                    className="w-full h-24 object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                    {Math.floor(thumbnail.timestamp / 60)}:{(thumbnail.timestamp % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No thumbnails available</p>
          )}
        </div>
      </div>

      {video.share_links && video.share_links.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-indigo-500" /> Share Links
          </h4>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="bg-gray-100 px-2 py-1 rounded-md">
              {video.share_links.length} active link{video.share_links.length !== 1 ? 's' : ''}
            </span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md">
              {video.share_links.filter(link => link.visibility === 'PUBLIC').length} public
            </span>
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">
              {video.share_links.filter(link => link.visibility === 'PRIVATE').length} private
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
