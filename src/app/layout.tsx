/**
 * Root Layout Component
 * 
 * Main layout wrapper for the entire application.
 * Sets up global providers, fonts, and metadata.
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { AuthProvider } from '@/components/AuthProvider'

// Configure Inter font with Latin subset
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Video Storage Service',
  description: 'Upload, store, and share your videos securely',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Redux Provider for state management */}
        <Providers>
          {/* Authentication wrapper */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
