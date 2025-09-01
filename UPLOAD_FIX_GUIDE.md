# Video Upload Issue Fix

## Issues Identified

1. **Vercel Request Body Limit**: 4.5MB maximum request body size (your 150-200MB files exceed this)
2. **Timeout Configuration**: Incorrect timeout settings (600s but Hobby plan only supports 300s)
3. **Memory Management**: Loading entire files into serverless function memory
4. **Error Handling**: Insufficient error logging and handling

## Solution: Presigned URL Upload

Instead of uploading through your API route, we now use **direct S3 uploads** via presigned URLs:

1. **Client requests upload URL** → Your API generates presigned URL
2. **Client uploads directly to S3** → Bypasses Vercel's 4.5MB limit
3. **Client confirms completion** → API starts video processing

## Changes Made

### 1. Vercel Configuration (`vercel.json`)
- Fixed function timeout to 300 seconds (Hobby plan limit)
- Reduced memory allocation to 4GB

### 2. Next.js Configuration (`next.config.ts`)
- Removed incorrect API configuration
- Kept external packages configuration

### 3. New API Routes
- **`/api/upload/presigned`** - Generates presigned upload URLs
- **`/api/upload/confirm/[id]`** - Confirms upload completion
- **`/api/upload/status/[id]`** - Checks upload/processing status

### 4. Enhanced AWS Library (`src/lib/aws.ts`)
- Added `getPresignedUploadUrl` function
- Better error handling for presigned URLs

### 5. Updated Upload Logic (`src/store/slices/uploadSlice.ts`)
- 3-step upload process with presigned URLs
- Direct S3 upload with progress tracking
- Automatic confirmation and processing trigger

## Environment Variables

Ensure these are set in your Vercel environment:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=your_s3_bucket_name
UPSTASH_REDIS_URL=your_redis_url
```

## AWS S3 CORS Configuration

Add this CORS policy to your S3 bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-domain.vercel.app", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Deployment Steps

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Verify S3 bucket permissions** - Ensure your AWS credentials can generate presigned URLs

## Upload Flow

### Old Flow (Failed)
```
Client → Vercel API (4.5MB limit) → S3
```

### New Flow (Works for large files)
```
Client → Vercel API (get URL) → Direct S3 Upload → Confirm with API
```

## Benefits

✅ **No file size limits** (beyond your S3 limits)  
✅ **Faster uploads** (direct to S3)  
✅ **Lower server costs** (no file processing in serverless function)  
✅ **Better error handling** (specific error codes)  
✅ **Works on Hobby plan** (300s timeout is enough for URL generation)

## Testing the Fix

1. **Test small file (50MB)** - Should work quickly
2. **Test your 150-200MB files** - Should now work
3. **Monitor browser network tab** - You'll see direct S3 uploads

## Troubleshooting

### "CORS policy error"
- **Solution**: Add your domain to S3 CORS configuration

### "Access Denied" on presigned URL
- **Solution**: Verify AWS credentials have S3 permissions

### "Upload confirmed but video not processing"
- **Solution**: Check Redis queue connection and worker process

### Still getting timeout errors
- **Solution**: You may need to upgrade to Vercel Pro for 800s timeout limit

## Advanced Optimizations

For even better performance, consider:
1. **Multipart uploads** for files > 100MB
2. **Upload progress indicators** 
3. **Retry mechanisms** for failed uploads
4. **Background upload with offline support**
