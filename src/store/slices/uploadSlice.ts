import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase'
import { fetchUserVideos } from './videosSlice'

interface UploadProgress {
  bytesUploaded: number
  totalBytes: number
  percentage: number
}

interface FileInfo {
  name: string
  size: number
  type: string
}

interface UploadState {
  isUploading: boolean
  progress: UploadProgress | null
  currentFile: FileInfo | null
  error: string | null
}

const initialState: UploadState = {
  isUploading: false,
  progress: null,
  currentFile: null,
  error: null,
}

export const uploadVideo = createAsyncThunk(
  'upload/uploadVideo',
  async ({ file, userId }: { file: File; userId: string }, { dispatch }) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    if (!token) {
      throw new Error('No authentication token available')
    }

    try {
      // Step 1: Get presigned URL
      console.log('Requesting presigned URL for file:', file.name)
      const presignedResponse = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      })

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const { videoId, uploadUrl } = await presignedResponse.json()
      console.log('Got presigned URL for video:', videoId)

      // Step 2: Mark upload as started
      await fetch(`/api/upload/start/${videoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      // Step 3: Upload directly to S3 using presigned URL
      const xhr = new XMLHttpRequest()
      
      return new Promise<string>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = {
              bytesUploaded: event.loaded,
              totalBytes: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            }
            dispatch(setUploadProgress(progress))
          }
        })
        
        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            console.log('S3 upload completed, confirming with server...')
            
            // Step 4: Confirm upload completion
            try {
              const confirmResponse = await fetch(`/api/upload/confirm/${videoId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })

              if (confirmResponse.ok) {
                dispatch(fetchUserVideos(userId))
                resolve('Upload completed successfully')
              } else {
                const errorData = await confirmResponse.json()
                // Clean up failed upload record
                await fetch(`/api/upload/cleanup/${videoId}`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                })
                dispatch(fetchUserVideos(userId))
                reject(new Error(errorData.error || 'Failed to confirm upload'))
              }
            } catch (confirmError) {
              console.error('Confirmation error:', confirmError)
              // Clean up failed upload record
              await fetch(`/api/upload/cleanup/${videoId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })
              dispatch(fetchUserVideos(userId))
              reject(new Error('Upload completed but confirmation failed'))
            }
          } else {
            console.error('S3 upload failed with status:', xhr.status)
            console.error('S3 upload response text:', xhr.responseText)
            console.error('S3 upload response headers:', xhr.getAllResponseHeaders())
            
            // Log detailed error information
            const errorInfo = {
              status: xhr.status,
              statusText: xhr.statusText,
              responseText: xhr.responseText,
              responseHeaders: xhr.getAllResponseHeaders(),
              uploadUrl: uploadUrl.substring(0, 100) + '...', // Log partial URL for debugging
            }
            console.error('S3 upload error details:', errorInfo)
            
            // Clean up failed upload record
            await fetch(`/api/upload/cleanup/${videoId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            dispatch(fetchUserVideos(userId))
            reject(new Error(`S3 upload failed: ${xhr.statusText} (Status: ${xhr.status})`))
          }
        })
        
        xhr.addEventListener('error', async (error) => {
          console.error('S3 upload network error:', error)
          console.error('XHR status:', xhr.status)
          console.error('XHR response text:', xhr.responseText)
          console.error('XHR ready state:', xhr.readyState)
          
          // Detect common error types
          let errorMessage = 'Direct upload to S3 failed - Network error'
          
          if (xhr.status === 0) {
            errorMessage = 'Upload failed - Possible CORS configuration issue. Check your S3 bucket CORS settings.'
          } else if (xhr.status === 403) {
            errorMessage = 'Upload failed - Access denied. Check your S3 bucket permissions and AWS credentials.'
          } else if (xhr.status === 400) {
            errorMessage = 'Upload failed - Bad request. This might be a Content-Type mismatch or invalid presigned URL.'
          }
          
          // Clean up failed upload record
          await fetch(`/api/upload/cleanup/${videoId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          dispatch(fetchUserVideos(userId))
          reject(new Error(errorMessage))
        })
        
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
    } catch (error) {
      console.error('Upload process error:', error)
      dispatch(fetchUserVideos(userId)) // Refresh videos to show current state
      throw error
    }
  }
)

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<UploadProgress>) => {
      state.progress = action.payload
    },
    setCurrentFile: (state, action: PayloadAction<FileInfo | null>) => {
      state.currentFile = action.payload
    },
    clearUpload: (state) => {
      state.isUploading = false
      state.progress = null
      state.currentFile = null
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isUploading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadVideo.pending, (state) => {
        state.isUploading = true
        state.error = null
      })
      .addCase(uploadVideo.fulfilled, (state) => {
        state.isUploading = false
        state.progress = null
        state.currentFile = null
      })
      .addCase(uploadVideo.rejected, (state, action) => {
        state.isUploading = false
        state.error = action.error.message || 'Upload failed'
      })
  },
})

export const { setUploadProgress, setCurrentFile, clearUpload, setError } = uploadSlice.actions
export default uploadSlice.reducer
