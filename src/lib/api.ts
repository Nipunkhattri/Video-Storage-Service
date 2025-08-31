import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

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

api.interceptors.response.use(
  (response) => {
    console.log('API response success:', response.config.url, response.status)
    return response
  },
  async (error) => {
    console.log('API response error:', error.config?.url, error.response?.status, error.message)
    
    if (error.response?.status === 401) {
      console.log('API request returned 401 - token may be invalid')
      
      if (!window.location.pathname.includes('/login')) {
        await supabase.auth.signOut()
      }
    }
    return Promise.reject(error)
  }
)

export default api
