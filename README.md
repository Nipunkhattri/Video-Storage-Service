# Video Storage Service

A comprehensive video storage and sharing platform built with Next.js, TypeScript, Supabase, AWS S3, BullMQ, and Redis.

## ✨ Features

### 🎥 Video Management
- **Drag & Drop Upload**: Intuitive file upload with real-time progress tracking
- **File Size Limits**: 500MB maximum file size with validation
- **Multiple Formats**: Support for MP4, AVI, MOV, WMV, FLV, WebM
- **Status Tracking**: Real-time upload status (UPLOADING → PROCESSING → READY)
- **Thumbnail Generation**: Automatic generation of 3 thumbnails at different video timestamps

### 🔐 Authentication & Security
- **Supabase Auth**: Secure user authentication and session management
- **User Isolation**: Each user can only access their own videos
- **Secure Sharing**: Public/private share links with optional email restrictions

## 📋 Table of Contents
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Architecture overview](#architecture-overview)
- [API routes](#api-routes)
- [Background workers](#background-workers)
- [File structure](#file-structure)
- [Deployment](#deployment)
- [License](#license)

## Quick start

These commands assume you are using PowerShell on Windows. From the project root:

```powershell
git clone https://github.com/Nipunkhattri/Video-Storage-Service.git
cd "video-storage-service"
npm install

copy env.example .env.local

npm run dev
```

Open http://localhost:3000 in your browser.

## Scripts

Key scripts (see `package.json`):

- `npm run dev` — start Next.js in development (uses Turbopack)
- `npm run build` — build for production
- `npm start` — start the production server after building
- `npm run lint` — run ESLint
- `npm run worker` — run background worker (see Background workers)

## Environment variables

Copy `env.example` to `.env.local` and set these values. Important variables in the repository:

- NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key (client)
- SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (server only)
- AWS_REGION — AWS region (e.g. us-east-1)
- AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — AWS credentials for S3/SES
- AWS_S3_BUCKET — S3 bucket name for storing videos and thumbnails
- AWS_SES_FROM_EMAIL — verified SES sender email for notifications
- UPSTASH_REDIS_URL — Redis connection string (used by BullMQ)
- NEXT_PUBLIC_APP_URL — public app URL (e.g. http://localhost:3000)

Do not commit `.env.local` to source control.

## Architecture overview

- Frontend + backend: Next.js App Router (React 19 + TypeScript)
- Authentication: Supabase Auth
- Database: Supabase (Postgres) using RLS for per-user access
- Object storage: AWS S3 (signed URLs for secure access)
- Queue & workers: BullMQ + Redis for thumbnail generation and email jobs
- Email: AWS SES for sending share notifications
- Video processing: ffmpeg (via `ffmpeg-static`) in worker process

## API routes

The project exposes API routes under `src/app/api` (Next.js App Router). Important endpoints:

- Auth
   - `GET/POST /api/auth/me` — current user info
   - `POST /api/auth/signout` — sign out

- Videos
   - `GET /api/videos` — list videos (supports user filtering)
   - `GET /api/videos/[id]` — video metadata
   - `PATCH /api/videos/[id]` — update video metadata
   - `GET /api/videos/[id]/download` — download URL
   - `GET /api/videos/[id]/stream` — stream URL/proxy

- Upload
   - `POST /api/upload` — upload video file (multipart/form-data)

- Thumbnails
   - `GET /api/thumbnails/[...key]` — serve thumbnail image by key

- Share links
   - `GET /api/share-links` — list share links
   - `POST /api/share-links` — create a share link
   - `DELETE /api/share-links/[id]` — delete a share link
   - `GET /api/share/[token]` — access shared video by token

Refer to `src/app/api` for exact request/response shapes.

## Background workers

Workers are implemented in `src/worker.ts` and use BullMQ + Redis. They perform:

- Thumbnail generation (ffmpeg)
- Email delivery for private share links via AWS SES

Start a worker (ensure Redis is running and `UPSTASH_REDIS_URL` or equivalent is set):

```powershell
npm run worker
```

On Windows you can use Dockerized Redis or a managed Redis (Upstash, Redis Cloud) for production.

## File structure (high level)

```
src/
├─ app/               # Next.js pages, API routes and layouts
├─ components/        # React components
├─ lib/               # Helpers: aws, supabase, queue, thumbnails
├─ store/             # Redux store & slices
└─ types/             # TypeScript type definitions
```

## Database

Schema is provided in `database-schema.sql` and targets Postgres (used by Supabase). Apply it to your Supabase project and enable Row Level Security as required by the schema.

## Deployment

Vercel (recommended for frontend + API routes):

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard (copy from `.env.local`)
3. Deploy