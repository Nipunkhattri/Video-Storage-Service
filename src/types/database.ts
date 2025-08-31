export interface Database {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string
          user_id: string
          title: string
          filename: string
          s3_key: string
          size: number
          duration: number | null
          status: 'UPLOADING' | 'PROCESSING' | 'READY'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          filename: string
          s3_key: string
          size: number
          duration?: number | null
          status?: 'UPLOADING' | 'PROCESSING' | 'READY'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          filename?: string
          s3_key?: string
          size?: number
          duration?: number | null
          status?: 'UPLOADING' | 'PROCESSING' | 'READY'
          created_at?: string
          updated_at?: string
        }
      }
      thumbnails: {
        Row: {
          id: string
          video_id: string
          s3_key: string
          timestamp: number
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          s3_key: string
          timestamp: number
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          s3_key?: string
          timestamp?: number
          position?: number
          created_at?: string
        }
      }
      share_links: {
        Row: {
          id: string
          video_id: string
          user_id: string
          token: string
          visibility: 'PUBLIC' | 'PRIVATE'
          allowed_emails: string[] | null
          expires_at: string | null
          last_viewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          token: string
          visibility: 'PUBLIC' | 'PRIVATE'
          allowed_emails?: string[] | null
          expires_at?: string | null
          last_viewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          token?: string
          visibility?: 'PUBLIC' | 'PRIVATE'
          allowed_emails?: string[] | null
          expires_at?: string | null
          last_viewed_at?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Video = Database['public']['Tables']['videos']['Row']
export type Thumbnail = Database['public']['Tables']['thumbnails']['Row']
export type ShareLink = Database['public']['Tables']['share_links']['Row']
export type User = Database['public']['Tables']['users']['Row']

export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY'
export type ShareLinkVisibility = 'PUBLIC' | 'PRIVATE'

export interface VideoWithThumbnails extends Video {
  thumbnails: Thumbnail[]
}

export interface VideoWithShareLinks extends Video {
  share_links: ShareLink[]
  thumbnails?: Thumbnail[]
}

export interface MinimalVideo {
  id: string
  title: string
  s3_key: string
  size?: number
  duration?: number | null
  created_at?: string
  filename?: string
  thumbnails?: Thumbnail[]
}
