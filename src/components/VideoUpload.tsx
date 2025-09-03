'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { AppDispatch, RootState } from '@/store/store'
import { useDropzone } from 'react-dropzone'
import { uploadVideo, setCurrentFile } from '@/store/slices/uploadSlice'
import { fetchUserVideos } from '@/store/slices/videosSlice'
import { Upload, X, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function VideoUpload() {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.user)
  const { isUploading, progress, currentFile, error } = useSelector((state: RootState) => state.upload)
  const { videos } = useSelector((state: RootState) => state.videos)
  const [processingVideos, setProcessingVideos] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  // Clean up any stale upload records on component mount
  useEffect(() => {
    const cleanupStaleUploads = async () => {
      if (!user) return
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        
        if (!token) return
        
        await fetch('/api/upload/cleanup', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        // Refresh videos after cleanup
        dispatch(fetchUserVideos(user.id))
      } catch (error) {
        console.error('Error cleaning up stale uploads:', error)
      }
    }

    cleanupStaleUploads()
  }, [user, dispatch])

  // Track processing state
  useEffect(() => {
    const processing = videos
      .filter(v => v.status === 'PROCESSING' || v.status === 'UPLOADING')
      .map(v => v.id)

    if (processingVideos.length > 0 && processing.length === 0) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    setProcessingVideos(processing)
  }, [videos, processingVideos.length])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file && user) {
        // Convert File to FileInfo to avoid Redux non-serializable value warning
        const fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type
        }
        dispatch(setCurrentFile(fileInfo))
        dispatch(uploadVideo({ file, userId: user.id }))
      }
    },
    [dispatch, user]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'] },
    maxFiles: 1,
    disabled: isUploading,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatProgress = (bytesUploaded: number, totalBytes: number) =>
    `${formatFileSize(bytesUploaded)} / ${formatFileSize(totalBytes)}`

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 transition-all">
      <h2 className="text-xl font-semibold text-gray-900 mb-5">📤 Upload Your Video</h2>

      {!isUploading && !currentFile && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 
            ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-14 w-14 text-blue-500 mb-4" />
          <p className="text-gray-700 font-medium">
            {isDragActive ? 'Drop the video here...' : 'Drag & drop a video, or click to browse'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Max file size: <span className="font-medium">500MB</span> | Formats: MP4, AVI, MOV, WMV, FLV, WebM
          </p>
        </div>
      )}

      {currentFile && (
        <div className="border rounded-lg p-5 mt-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Upload className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{currentFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(currentFile.size)}</p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={() => dispatch(setCurrentFile(null))}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {isUploading && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{formatProgress(progress.bytesUploaded, progress.totalBytes)}</p>
            </div>
          )}

          {!isUploading && progress?.percentage === 100 && (
            <div className="flex items-center space-x-2 text-green-600 mt-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Upload complete! Processing video...</span>
            </div>
          )}
        </div>
      )}

      {processingVideos.length > 0 && (
        <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-700">
            <Clock className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">
              {processingVideos.length} video{processingVideos.length !== 1 && 's'} processing...
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">Videos will appear once ready.</p>
        </div>
      )}

      {showSuccess && (
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Video is ready to view 🎉</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

    </div>
  )
}