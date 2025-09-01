import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const uploadToS3 = async (key: string, body: Buffer, contentType: string) => {
  try {
    console.log('Starting S3 upload for key:', key, 'size:', body.length)
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Add metadata for large files
      Metadata: {
        'uploaded-at': new Date().toISOString(),
      },
      // Optimize for large uploads
      ServerSideEncryption: 'AES256',
    })
    
    const result = await s3Client.send(command)
    console.log('S3 upload successful, ETag:', result.ETag)
    return result
  } catch (error) {
    console.error('S3 upload error:', error)
    throw error
  }
}

export const getSignedDownloadUrl = async (key: string, expiresIn = 3600) => {
  try {
    console.log('Generating signed URL for key:', key)
    console.log('Bucket:', process.env.AWS_S3_BUCKET)
    console.log('Region:', process.env.AWS_REGION)
    
    if (!process.env.AWS_S3_BUCKET) {
      throw new Error('AWS_S3_BUCKET environment variable is not set')
    }
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not properly configured')
    }
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    })
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    console.log('Generated signed URL successfully')
    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw error
  }
}

export const deleteFromS3 = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  })
  
  return await s3Client.send(command)
}

export const sendEmail = async (to: string, subject: string, htmlBody: string) => {
  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Html: {
          Data: htmlBody,
        },
      },
    },
  })
  
  return await sesClient.send(command)
}
