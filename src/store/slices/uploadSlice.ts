import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase'
import { fetchUserVideos } from './videosSlice'

interface UploadProgress {
  bytesUploaded: number
  totalBytes: number
  percentage: number
}

interface UploadState {
  isUploading: boolean
  progress: UploadProgress | null
  currentFile: File | null
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

      // Step 2: Upload directly to S3 using presigned URL
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
            
            // Step 3: Confirm upload completion
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
                reject(new Error(errorData.error || 'Failed to confirm upload'))
              }
            } catch (confirmError) {
              console.error('Confirmation error:', confirmError)
              reject(new Error('Upload completed but confirmation failed'))
            }
          } else {
            console.error('S3 upload failed with status:', xhr.status)
            reject(new Error(`S3 upload failed: ${xhr.statusText}`))
          }
        })
        
        xhr.addEventListener('error', (error) => {
          console.error('S3 upload error:', error)
          reject(new Error('Direct upload to S3 failed'))
        })
        
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
    } catch (error) {
      console.error('Upload process error:', error)
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
    setCurrentFile: (state, action: PayloadAction<File | null>) => {
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
