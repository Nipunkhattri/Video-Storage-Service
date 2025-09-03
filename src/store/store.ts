/**
 * Redux Store Configuration
 * 
 * Centralized state management for the Video Storage Service application.
 * Combines three main slices:
 * - videos: Manages video data and metadata
 * - upload: Handles file upload state and progress
 * - user: Manages user authentication and profile data
 */

import { configureStore } from '@reduxjs/toolkit'
import videosReducer from './slices/videosSlice'
import uploadReducer from './slices/uploadSlice'
import userReducer from './slices/userSlice'

export const store = configureStore({
  reducer: {
    videos: videosReducer,
    upload: uploadReducer,
    user: userReducer,
  },
})

// Export types for TypeScript support
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
