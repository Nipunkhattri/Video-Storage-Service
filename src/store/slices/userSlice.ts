import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User } from '@/types/database'
import api from '@/lib/api'

interface UserState {
  user: User | null
  loading: boolean
  error: string | null
  loaded: boolean
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
  loaded: false,
}

export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async () => {
    console.log('fetchCurrentUser thunk called')
    try {
      const response = await api.get('/auth/me')
      console.log('fetchCurrentUser response:', response.data)
      return response.data
    } catch (error) {
      console.error('fetchCurrentUser error:', error)
      throw error
    }
  }
)

export const signOut = createAsyncThunk(
  'user/signOut',
  async () => {
    const response = await api.post('/auth/signout')
    return response.data
  }
)

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      console.log('setUser reducer called with:', action.payload)
      state.user = action.payload
      state.loaded = true
      state.error = null
    },
    clearUser: (state) => {
      console.log('clearUser reducer called')
      state.user = null
      state.loaded = true
      state.error = null
      state.loading = false
    },
    clearError: (state) => {
      state.error = null
    },
    setLoaded: (state, action: PayloadAction<boolean>) => {
      state.loaded = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        console.log('fetchCurrentUser pending')
        state.loading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        console.log('fetchCurrentUser fulfilled with:', action.payload)
        state.loading = false
        state.user = action.payload
        state.loaded = true
        state.error = null
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        console.log('fetchCurrentUser rejected:', action.error.message)
        state.loading = false
        state.loaded = true
        state.error = action.error.message || 'Failed to fetch user'
        state.user = null
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null
        state.loaded = true
        state.error = null
        state.loading = false
      })
  },
})

export const { setUser, clearUser, clearError, setLoaded } = userSlice.actions
export default userSlice.reducer
