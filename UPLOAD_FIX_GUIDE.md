# Video Upload Issue Fix

## Issues Identified

1. **Timeout Configuration**: No timeout settings for large file uploads
2. **Memory Management**: Loading entire files into memory causing issues
3. **Error Handling**: Insufficient error logging and handling
4. **Database Connection**: Potential timeout during long uploads

## Changes Made

### 1. Next.js Configuration (`next.config.ts`)
- Added API body size limit (500MB)
- Configured serverless function timeout
- Added external package configuration

### 2. Vercel Configuration (`vercel.json`)
- Set function timeout to 600 seconds (10 minutes)
- Configured memory allocation
- Set optimal region

### 3. Upload Route Improvements (`src/app/api/upload/route.ts`)
- Added comprehensive logging
- Better error handling with specific error codes
- Added upload metrics tracking
- Proper cleanup on failures

### 4. AWS Configuration (`src/lib/aws.ts`)
- Enhanced S3 upload with metadata
- Better error logging

### 5. Error Handling (`src/lib/upload-utils.ts`)
- Created centralized error handling
- Added upload metrics logging
- Specific error categorization

## Environment Variables to Check

Ensure these are set in your hosting environment:
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

## Deployment Steps

1. **For Vercel:**
   ```bash
   vercel --prod
   ```

2. **For other platforms:**
   - Ensure Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=8192`
   - Set function timeout to at least 600 seconds
   - Configure body parser limits

## Monitoring and Debugging

1. **Check logs in your hosting platform**
2. **Use the new status endpoint:**
   ```
   GET /api/upload/status/[videoId]
   ```
3. **Monitor upload metrics in console logs**

## Common Issues and Solutions

### 1. "Function timeout after 10 seconds"
- **Solution**: Update `vercel.json` with higher timeout
- **Vercel Pro required** for timeouts > 10 seconds

### 2. "Out of memory" errors
- **Solution**: Increase Node.js memory limit
- **Alternative**: Implement chunked uploads

### 3. Database connection timeout
- **Solution**: Check Supabase connection limits
- **Alternative**: Use connection pooling

### 4. S3 access denied
- **Solution**: Verify AWS credentials and S3 bucket permissions

## Production Recommendations

1. **Implement chunked uploads** for files > 100MB
2. **Add upload progress tracking**
3. **Set up monitoring and alerting**
4. **Consider using presigned URLs** for direct S3 uploads
5. **Implement retry mechanism** for failed uploads

## Testing

Test with different file sizes:
- 50MB (should work quickly)
- 150MB (your reported issue size)
- 300MB (stress test)

Monitor console logs to identify bottlenecks.
