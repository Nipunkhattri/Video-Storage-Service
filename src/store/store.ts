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

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
