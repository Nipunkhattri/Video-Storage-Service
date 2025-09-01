// 'use client'

// import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
// import { VideoWithShareLinks, MinimalVideo } from '@/types/database'
// import { Play, Pause, Volume2, VolumeX, Maximize, Download, AlertCircle } from 'lucide-react'
// import { fetchVideoStreamUrl, updateVideo } from '@/store/slices/videosSlice'
// import { useSelector, useDispatch } from 'react-redux'
// import { RootState, AppDispatch } from '@/store/store'

// /**
//  * Guess a MIME type from the URL extension.
//  * Defaults to video/mp4 when uncertain.
//  */
// function guessMimeType(url: string | undefined): string {
//   if (!url) return 'video/mp4'
//   const clean = url.split('?')[0]
//   const ext = clean.split('.').pop()?.toLowerCase()
//   switch (ext) {
//     case 'mp4':
//       return 'video/mp4'
//     case 'webm':
//       return 'video/webm'
//     case 'ogv':
//     case 'ogg':
//       return 'video/ogg'
//     case 'm3u8':
//       return 'application/vnd.apple.mpegurl'
//     case 'mpd':
//       return 'application/dash+xml'
//     default:
//       return 'video/mp4'
//   }
// }

// function mediaErrorToMessage(error: MediaError | null): { code: number; message: string } {
//   if (!error) return { code: 0, message: 'Unknown error' }
//   switch (error.code) {
//     case MediaError.MEDIA_ERR_ABORTED:
//       return { code: error.code, message: 'Playback was aborted. Please try again.' }
//     case MediaError.MEDIA_ERR_NETWORK:
//       return { code: error.code, message: 'Network error occurred while fetching the video.' }
//     case MediaError.MEDIA_ERR_DECODE:
//       return { code: error.code, message: 'Video decoding failed. The file may be corrupted or unsupported.' }
//     case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
//       return { code: error.code, message: 'Video format not supported by this browser.' }
//     default:
//       return { code: error.code, message: 'An unknown video error occurred.' }
//   }
// }

// interface VideoPlayerProps {
//   video: VideoWithShareLinks | MinimalVideo
// }

// export function VideoPlayer({ video }: VideoPlayerProps) {
//   const videoRef = useRef<HTMLVideoElement>(null)
//   const [isPlaying, setIsPlaying] = useState(false)
//   const [isMuted, setIsMuted] = useState(false)
//   const [currentTime, setCurrentTime] = useState(0)
//   const [duration, setDuration] = useState(0)
//   const [error, setError] = useState<string | null>(null)
//   const [videoLoaded, setVideoLoaded] = useState(false)

//   // new states from your custom player
//   const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
//   const [meta, setMeta] = useState<{ duration: number; videoWidth: number; videoHeight: number } | null>(null)
//   const [isLoading, setIsLoading] = useState(false)
//   const [showControls, setShowControls] = useState(false)

//   const dispatch = useDispatch<AppDispatch>()
//   const streamUrl = useSelector((state: RootState) => state.videos.streamUrls[video.id])

//   // resolve mime type
//   const resolvedType = useMemo(() => guessMimeType(streamUrl), [streamUrl])

//   // check support
//   const canPlay = useMemo(() => {
//     if (typeof document === 'undefined') return true
//     const tester = document.createElement('video')
//     const support = tester.canPlayType(resolvedType)
//     return support === 'probably' || support === 'maybe'
//   }, [resolvedType])

//   useEffect(() => {
//     if (!streamUrl) {
//       dispatch(fetchVideoStreamUrl(video.id))
//     }
//   }, [video.id, streamUrl, dispatch])

//   useEffect(() => {
//     if (streamUrl && videoRef.current) {
//       setStatus('loading')
//       setError(null)
//       setMeta(null)
//       setIsLoading(true)
//       setVideoLoaded(false)
//       videoRef.current.load()
//     }
//   }, [streamUrl])

//   const handlePlayPause = async () => {
//     if (videoRef.current) {
//       try {
//         if (isPlaying) {
//           videoRef.current.pause()
//         } else {
//           await videoRef.current.play()
//         }
//         setIsPlaying(!isPlaying)
//       } catch {
//         setError('Failed to play video')
//         setStatus('error')
//       }
//     }
//   }

//   const handleMute = () => {
//     if (videoRef.current) {
//       videoRef.current.muted = !isMuted
//       setIsMuted(!isMuted)
//     }
//   }

//   const handleTimeUpdate = () => {
//     if (videoRef.current) {
//       setCurrentTime(videoRef.current.currentTime)
//     }
//   }

//   const handleLoadedMetadata = useCallback(() => {
//     if (videoRef.current) {
//       const info = {
//         duration: Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0,
//         videoWidth: videoRef.current.videoWidth,
//         videoHeight: videoRef.current.videoHeight,
//       }
//       setDuration(info.duration)
//       setMeta(info)
//       setStatus('ready')
//     }
//   }, [])

//   const handleLoadedData = () => {
//     setIsLoading(false)
//     setVideoLoaded(true)
//     if (videoRef.current) {
//       try {
//         // Only update video if it's a full video object (not a minimal shared video)
//         if ('user_id' in video && 'status' in video) {
//           const videoToUpdate = { 
//             ...video, 
//             duration: videoRef.current.duration, 
//             thumbnails: video.thumbnails ?? [] 
//           }
//           dispatch(updateVideo(videoToUpdate))
//         }
//       } catch {}
//     }
//   }

//   const handleError = useCallback(() => {
//     const mapped = mediaErrorToMessage(videoRef.current?.error ?? null)
//     setError(mapped.message)
//     setStatus('error')
//     setIsLoading(false)
//     setVideoLoaded(false)
//   }, [])

//   const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const time = parseFloat(e.target.value)
//     if (videoRef.current) {
//       videoRef.current.currentTime = time
//       setCurrentTime(time)
//     }
//   }

//   const handleFullscreen = () => {
//     if (videoRef.current) {
//       if (document.fullscreenElement) {
//         document.exitFullscreen()
//       } else {
//         videoRef.current.requestFullscreen()
//       }
//     }
//   }

//   const handleDownload = async () => {
//     try {
//       const response = await fetch(`/api/videos/${video.id}/download`)
//       if (response.ok) {
//         const { downloadUrl } = await response.json()
//         window.open(downloadUrl, '_blank')
//       }
//     } catch {}
//   }

//   const handleRetry = () => {
//     setError(null)
//     setStatus('loading')
//     setIsLoading(true)
//     setVideoLoaded(false)
//     if (videoRef.current && streamUrl) {
//       videoRef.current.load()
//     } else if (!streamUrl) {
//       dispatch(fetchVideoStreamUrl(video.id))
//     }
//   }

//   const formatTime = (time: number) => {
//     const minutes = Math.floor(time / 60)
//     const seconds = Math.floor(time % 60)
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`
//   }

//   return (
//     <div className="bg-black rounded-xl overflow-hidden shadow-lg">
//       <div className="relative group">
// <video ref={videoRef} className="w-full h-auto min-h-[200px] rounded-md bg-black" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onLoadedData={handleLoadedData} onError={handleError} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} controls={false} preload="metadata" playsInline crossOrigin="use-credentials" > {streamUrl && <source src={streamUrl} type={resolvedType} />} Your browser does not support the video tag. </video>

//         {/* 🔴 Error Overlay */}
//         {status === 'error' && error && (
//           <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-white">
//             <AlertCircle className="h-14 w-14 mb-4 text-red-400" />
//             <p className="font-semibold text-lg">{error}</p>
//             <button
//               onClick={handleRetry}
//               className="mt-5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow hover:from-blue-700 hover:to-blue-600 transition"
//             >
//               Retry
//             </button>
//           </div>
//         )}

//         {status === 'loading' && !error && (
//           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
//             <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent mb-3"></div>
//             <span className="text-sm">Loading video…</span>
//           </div>
//         )}

//         {!error && videoLoaded && (
//           <div
//             className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition duration-300 ease-in-out ${
//               showControls ? 'opacity-100' : 'opacity-0'
//             }`}
//           >
//             <button
//               onClick={handlePlayPause}
//               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 p-5 rounded-full text-white shadow-lg transition"
//             >
//               {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
//             </button>

//             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
//               <div className="mb-3">
//                 <input
//                   type="range"
//                   min="0"
//                   max={duration || 0}
//                   value={currentTime}
//                   onChange={handleSeek}
//                   className="w-full h-1 accent-blue-500 cursor-pointer"
//                 />
//               </div>

//               <div className="flex items-center justify-between">
//                 <div className="flex items-center space-x-5 text-white">
//                   <button
//                     onClick={handlePlayPause}
//                     className="hover:text-blue-400 transition"
//                   >
//                     {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
//                   </button>
//                   <button
//                     onClick={handleMute}
//                     className="hover:text-blue-400 transition"
//                   >
//                     {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
//                   </button>
//                   <span className="text-xs md:text-sm font-medium">
//                     {formatTime(currentTime)} / {formatTime(duration)}
//                   </span>
//                 </div>

//                 <div className="flex items-center space-x-3 text-white">
//                   <button
//                     onClick={handleDownload}
//                     className="hover:text-blue-400 transition"
//                     title="Download"
//                   >
//                     <Download className="h-5 w-5" />
//                   </button>
//                   <button
//                     onClick={handleFullscreen}
//                     className="hover:text-blue-400 transition"
//                     title="Fullscreen"
//                   >
//                     <Maximize className="h-5 w-5" />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       <div className="mt-3 text-xs text-gray-400 px-2">
//         {!canPlay && (
//           <p className="italic text-red-400">
//             ⚠️ This browser can’t play {resolvedType}. Try MP4 (H.264).
//           </p>
//         )}
//         {meta && (
//           <p>
//             Duration: {meta.duration.toFixed(2)}s • {meta.videoWidth}×{meta.videoHeight}px
//           </p>
//         )}
//       </div>
//     </div>
//   )
// }

'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { VideoWithShareLinks,MinimalVideo } from '@/types/database'
import { Play, Pause, Volume2, VolumeX, Maximize, Download, AlertCircle } from 'lucide-react'
import { fetchVideoStreamUrl, updateVideo } from '@/store/slices/videosSlice'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store/store'

/**
 * Guess a MIME type from the URL extension.
 * Defaults to video/mp4 when uncertain.
 */
function guessMimeType(url: string | undefined): string {
  if (!url) return 'video/mp4'
  const clean = url.split('?')[0]
  const ext = clean.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogv':
    case 'ogg':
      return 'video/ogg'
    case 'm3u8':
      return 'application/vnd.apple.mpegurl'
    case 'mpd':
      return 'application/dash+xml'
    default:
      return 'video/mp4'
  }
}

function mediaErrorToMessage(error: MediaError | null): { code: number; message: string } {
  if (!error) return { code: 0, message: 'Unknown error' }
  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return { code: error.code, message: 'Playback was aborted. Please try again.' }
    case MediaError.MEDIA_ERR_NETWORK:
      return { code: error.code, message: 'Network error occurred while fetching the video.' }
    case MediaError.MEDIA_ERR_DECODE:
      return { code: error.code, message: 'Video decoding failed. The file may be corrupted or unsupported.' }
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return { code: error.code, message: 'Video format not supported by this browser.' }
    default:
      return { code: error.code, message: 'An unknown video error occurred.' }
  }
}

interface VideoPlayerProps {
  video: VideoWithShareLinks | MinimalVideo
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(false)

  // new states from your custom player
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [meta, setMeta] = useState<{ duration: number; videoWidth: number; videoHeight: number } | null>(null)

  const dispatch = useDispatch<AppDispatch>()
  const streamUrl = useSelector((state: RootState) => state.videos.streamUrls[video.id])

  // resolve mime type
  const resolvedType = useMemo(() => guessMimeType(streamUrl), [streamUrl])

  // check support
  const canPlay = useMemo(() => {
    if (typeof document === 'undefined') return true
    const tester = document.createElement('video')
    const support = tester.canPlayType(resolvedType)
    return support === 'probably' || support === 'maybe'
  }, [resolvedType])

  useEffect(() => {
    if (!streamUrl) {
      dispatch(fetchVideoStreamUrl(video.id))
    }
  }, [video.id, streamUrl, dispatch])

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      setStatus('loading')
      setError(null)
      setMeta(null)
      setIsLoading(true)
      setVideoLoaded(false)
      videoRef.current.load()
    }
  }, [streamUrl])

  const handlePlayPause = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          await videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
      } catch (err) {
        setError('Failed to play video')
        setStatus('error')
      }
    }
  }

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const info = {
        duration: Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
      }
      setDuration(info.duration)
      setMeta(info)
      setStatus('ready')
    }
  }, [])

  const handleLoadedData = () => {
    setIsLoading(false)
    setVideoLoaded(true)
    if (videoRef.current) {
      try {
        // Only update video if it's a full video object (not a minimal shared video)
        if ('user_id' in video && 'status' in video) {
          const videoToUpdate = { 
            ...video, 
            duration: videoRef.current.duration, 
            thumbnails: video.thumbnails ?? [] 
          }
          dispatch(updateVideo(videoToUpdate))
        }
      } catch {}
    }
  }

  const handleError = useCallback(() => {
    const mapped = mediaErrorToMessage(videoRef.current?.error ?? null)
    setError(mapped.message)
    setStatus('error')
    setIsLoading(false)
    setVideoLoaded(false)
  }, [])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/videos/${video.id}/download`)
      if (response.ok) {
        const { downloadUrl } = await response.json()
        window.open(downloadUrl, '_blank')
      }
    } catch {}
  }

  const handleRetry = () => {
    setError(null)
    setStatus('loading')
    setIsLoading(true)
    setVideoLoaded(false)
    if (videoRef.current && streamUrl) {
      videoRef.current.load()
    } else if (!streamUrl) {
      dispatch(fetchVideoStreamUrl(video.id))
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      <div className="relative group">
        <video
          ref={videoRef}
          className="w-full h-auto min-h-[200px] rounded-md bg-black"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={false}
          preload="metadata"
          playsInline
          crossOrigin="use-credentials"
        >
          {streamUrl && <source src={streamUrl} type={resolvedType} />}
          Your browser does not support the video tag.
        </video>

        {/* Error overlay */}
        {status === 'error' && error && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 text-center text-white">
            <div>
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="font-medium">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {status === 'loading' && !error && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
            <span className="text-sm">Loading video…</span>
          </div>
        )}

        {/* Custom controls (play, pause, volume, fullscreen, download, progress) */}
        {!error && videoLoaded && (
          <div
            className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={handlePlayPause}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white p-4 rounded-full"
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </button>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <div className="mb-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button onClick={handlePlayPause} className="text-white">
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button onClick={handleMute} className="text-white">
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={handleDownload} className="text-white" title="Download">
                    <Download className="h-5 w-5" />
                  </button>
                  <button onClick={handleFullscreen} className="text-white" title="Fullscreen">
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meta info */}
      <div className="mt-2 text-xs text-muted-foreground">
        {!canPlay && <p>Heads up: this browser can’t play {resolvedType}. Try MP4 (H.264).</p>}
        {meta && (
          <p>
            Duration: {meta.duration.toFixed(2)}s • {meta.videoWidth}×{meta.videoHeight}px
          </p>
        )}
      </div>
    </div>
  )
}