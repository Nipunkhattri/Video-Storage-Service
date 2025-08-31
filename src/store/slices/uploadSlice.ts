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
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    if (!token) {
      throw new Error('No authentication token available')
    }
    
    const xhr = new XMLHttpRequest()
    
    return new Promise((resolve, reject) => {
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
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          dispatch(fetchUserVideos(userId))
          resolve(response)
        } else {
          reject(new Error('Upload failed'))
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })
      
      xhr.open('POST', '/api/upload')
      
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      
      xhr.send(formData)
    })
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
