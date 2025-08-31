import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Video, VideoWithThumbnails, VideoWithShareLinks } from '@/types/database'
import api from '@/lib/api'

interface VideosState {
  videos: VideoWithThumbnails[]
  currentVideo: VideoWithShareLinks | null
  loading: boolean
  error: string | null
  loaded: boolean
  streamUrls: Record<string, string>   
}

const initialState: VideosState = {
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  loaded: false,
  streamUrls: {}, 
}

// Async thunks
export const fetchUserVideos = createAsyncThunk(
  'videos/fetchUserVideos',
  async (userId: string) => {
    const response = await api.get(`/videos?userId=${userId}`)
    return response.data
  }
)

export const fetchVideoById = createAsyncThunk(
  'videos/fetchVideoById',
  async (videoId: string) => {
    const response = await api.get(`/videos/${videoId}`)
    return response.data
  }
)

export const updateVideoStatus = createAsyncThunk(
  'videos/updateVideoStatus',
  async ({ videoId, status }: { videoId: string; status: Video['status'] }) => {
    const response = await api.patch(`/videos/${videoId}`, { status })
    return response.data
  }
)

export const fetchVideoStreamUrl = createAsyncThunk(
  'videos/fetchVideoStreamUrl',
  async (videoId: string) => {
    const response = await api.get(`/videos/${videoId}/stream`)
    console.log('fetchVideoStreamUrl response', response)
    return { videoId, streamUrl: response.data.streamUrl }
  }
)

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    addVideo: (state, action: PayloadAction<VideoWithThumbnails>) => {
      state.videos.unshift(action.payload)
    },
    updateVideo: (state, action: PayloadAction<VideoWithThumbnails>) => {
      const index = state.videos.findIndex(v => v.id === action.payload.id)
      if (index !== -1) {
        state.videos[index] = action.payload
      }
      if (state.currentVideo?.id === action.payload.id) {
        state.currentVideo = { ...state.currentVideo, ...action.payload }
      }
    },
    clearCurrentVideo: (state) => {
      state.currentVideo = null
    },
    clearError: (state) => {
      state.error = null
    },
    clearVideos: (state) => {
      state.videos = []
      state.loaded = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserVideos.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUserVideos.fulfilled, (state, action) => {
        state.loading = false
        state.videos = action.payload
        state.loaded = true
      })
      .addCase(fetchUserVideos.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch videos'
      })
      .addCase(fetchVideoById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchVideoById.fulfilled, (state, action) => {
        state.loading = false
        state.currentVideo = action.payload
      })
      .addCase(fetchVideoById.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch video'
      })
      .addCase(updateVideoStatus.fulfilled, (state, action) => {
        const updatedVideo = action.payload
        const index = state.videos.findIndex(v => v.id === updatedVideo.id)
        if (index !== -1) {
          state.videos[index] = updatedVideo
        }
        if (state.currentVideo?.id === updatedVideo.id) {
          state.currentVideo = { ...state.currentVideo, ...updatedVideo }
        }
      })
      .addCase(fetchVideoStreamUrl.fulfilled, (state, action) => {
        state.streamUrls[action.payload.videoId] = action.payload.streamUrl
      })
  },
})

export const { addVideo, updateVideo, clearCurrentVideo, clearError, clearVideos } = videosSlice.actions
export default videosSlice.reducer
