import { NextRequest, NextResponse } from 'next/server'
import { getSignedDownloadUrl } from '@/lib/aws'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params
    const keyString = key.join('/')
    
    const thumbnailUrl = await getSignedDownloadUrl(keyString, 3600)

    return NextResponse.redirect(thumbnailUrl)
  } catch (error) {
    console.error('Thumbnail error:', error)
    return NextResponse.json(
      { error: 'Failed to load thumbnail' },
      { status: 500 }
    )
  }
}
