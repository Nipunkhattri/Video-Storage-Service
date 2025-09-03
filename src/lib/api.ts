/**
 * API Client Configuration
 * 
 * Centralized HTTP client using Axios with automatic authentication.
 * Automatically injects Supabase auth tokens into requests and handles
 * authentication errors gracefully.
 */

import axios from 'axios'
import { supabase } from './supabase'

// Create base API client with default configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Automatically add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('API request interceptor - session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      endpoint: config.url 
    })
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
      console.log('Added auth token to request:', config.url)
    } else {
      console.log('No auth token available for request:', config.url)
    }
  } catch (error) {
    console.error('Error getting session in API interceptor:', error)
  }
  return config
})

// Response interceptor: Handle auth errors and logging
api.interceptors.response.use(
  // Success response handler
  (response) => {
    console.log('API response success:', response.config.url, response.status)
    return response
  },
  // Error response handler
  async (error) => {
    console.log('API response error:', error.config?.url, error.response?.status, error.message)
    
    // Handle authentication errors by signing out user
    if (error.response?.status === 401) {
      console.log('API request returned 401 - token may be invalid')
      
      // Only sign out if not already on login page
      if (!window.location.pathname.includes('/login')) {
        await supabase.auth.signOut()
      }
    }
    return Promise.reject(error)
  }
)

export default api
