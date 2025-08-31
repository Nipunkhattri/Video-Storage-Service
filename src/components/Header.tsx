'use client'

import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store/store'
import { signOut } from '@/store/slices/userSlice'
import { User, LogOut, Video } from 'lucide-react'

export function Header() {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.user)

  const handleSignOut = async () => {
    await dispatch(signOut())
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/70 backdrop-blur-lg shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center space-x-2">
          <Video className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Video Storage
          </h1>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 rounded-md bg-gray-50 px-3 py-1.5">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{user.email}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
