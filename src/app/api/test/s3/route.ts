import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { s3Client, getPresignedUploadUrl } from '@/lib/aws'
import { ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

export async function GET(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createServerSupabaseClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    console.log('Testing S3 configuration...')

    const testResults = {
      environmentVariables: {
        AWS_REGION: !!process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
        values: {
          AWS_REGION: process.env.AWS_REGION,
          AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
          // Don't log sensitive credentials
        }
      },
      s3Connection: {
        status: 'unknown' as 'unknown' | 'success' | 'failed',
        error: null as string | null
      },
      bucketAccess: {
        status: 'unknown' as 'unknown' | 'success' | 'failed',
        error: null as string | null
      },
      presignedUrlGeneration: {
        status: 'unknown' as 'unknown' | 'success' | 'failed',
        url: null as string | null,
        error: null as string | null
      }
    }

    // Test 1: S3 Connection
    try {
      const listCommand = new ListBucketsCommand({})
      await s3Client.send(listCommand)
      testResults.s3Connection.status = 'success'
    } catch (error) {
      testResults.s3Connection.status = 'failed'
      testResults.s3Connection.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test 2: Bucket Access
    try {
      if (process.env.AWS_S3_BUCKET) {
        const headCommand = new HeadBucketCommand({
          Bucket: process.env.AWS_S3_BUCKET
        })
        await s3Client.send(headCommand)
        testResults.bucketAccess.status = 'success'
      } else {
        testResults.bucketAccess.status = 'failed'
        testResults.bucketAccess.error = 'AWS_S3_BUCKET not configured'
      }
    } catch (error) {
      testResults.bucketAccess.status = 'failed'
      testResults.bucketAccess.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test 3: Presigned URL Generation
    try {
      const testKey = `test/${user.id}/test-file.mp4`
      const testUrl = await getPresignedUploadUrl(testKey, 'video/mp4', 300) // 5 minutes
      testResults.presignedUrlGeneration.status = 'success'
      testResults.presignedUrlGeneration.url = testUrl.substring(0, 100) + '...' // Partial URL for security
    } catch (error) {
      testResults.presignedUrlGeneration.status = 'failed'
      testResults.presignedUrlGeneration.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      success: true,
      message: 'S3 configuration test completed',
      testResults
    })

  } catch (error) {
    console.error('S3 test error:', error)
    return NextResponse.json(
      { error: 'Failed to test S3 configuration' },
      { status: 500 }
    )
  }
}
