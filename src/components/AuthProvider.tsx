'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '@/lib/supabase'
import { setUser, clearUser, fetchCurrentUser } from '@/store/slices/userSlice'
import { clearVideos } from '@/store/slices/videosSlice'
import { AppDispatch, RootState } from '@/store/store'
import { Loader2 } from 'lucide-react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const { user, loaded: userLoaded } = useSelector((state: RootState) => state.user)
  const hasFetchedUser = useRef(false)
  const isInitializing = useRef(true)
  const [loading, setLoading] = useState(true)

  // Function to fetch user data
  const fetchUserData = async () => {
    try {
      const userData = await dispatch(fetchCurrentUser()).unwrap()
      dispatch(setUser(userData))
      return userData
    } catch (error) {
      dispatch(clearUser())
      throw error
    }
  }

  // Function to check session and fetch user data
  const checkSessionAndFetchUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && !hasFetchedUser.current) {
        hasFetchedUser.current = true
        await fetchUserData()
      } else if (!session?.user) {
        hasFetchedUser.current = false
        dispatch(clearUser())
      }
    } catch {
      dispatch(clearUser())
    }
  }

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && !userLoaded && !hasFetchedUser.current) {
          hasFetchedUser.current = true
          await fetchUserData()
        } else if (!session?.user) {
          dispatch(clearUser())
        }
      } catch {
        dispatch(clearUser())
      } finally {
        isInitializing.current = false
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          hasFetchedUser.current = true
          setTimeout(async () => {
            try {
              await fetchUserData()
            } catch {
              dispatch(clearUser())
            }
          }, 100)
        } else if (event === 'SIGNED_OUT') {
          hasFetchedUser.current = false
          dispatch(clearUser())
          dispatch(clearVideos())
        } else if (event === 'USER_UPDATED') {
          try {
            await fetchUserData()
          } catch {
            dispatch(clearUser())
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [dispatch, router, userLoaded])

  useEffect(() => {
    (window as any).checkAuth = checkSessionAndFetchUser
    return () => {
      delete (window as any).checkAuth
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-gray-600">
            Checking authentication...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
