<img width="100" height="100" alt="dark-logo" src="https://github.com/user-attachments/assets/3ca613c5-419a-421e-90ea-4bbf3635ec9a" />

# Shutterly Media Sharing Platform

A full-stack social media application built with Next.js, Prisma, PostgreSQL, and Azure Blob Storage.

The platform supports authentication, media uploads, posts, stories, comments, likes, saves, follows, profile management, an admin dashboard, and realtime social events over Socket.IO.

## Tech Stack

- Next.js 15 (App Router + API Routes)
- React 19 + TypeScript
- Prisma 7 + PostgreSQL
- Azure Blob Storage (SAS upload flow)
- Redis (optional, with in-memory fallback cache)
- Socket.IO (realtime social updates)
- Tailwind CSS
- Vitest for unit tests

## Features

- User registration and login with JWT cookie sessions
- Protected API routes using shared auth guards
- Create, edit, delete posts (image/video)
- Story creation, active story listing, and deletion
- Threaded comments with edit/delete support
- Post likes and comment likes
- Save/unsave posts
- Follow/unfollow users with feed impact
- Personalized feed, suggestions, and profile views
- Admin panel with separate admin cookie session
- Admin moderation for users, posts, stories, and comments
- Realtime events for likes, follows, comments, post updates, and profile stats
- Redis-backed caching with graceful degradation to memory cache

## Project Structure

- src/app: App Router pages, layouts, and API routes
- src/app/api: Backend endpoints (auth, feed, posts, profile, social, stories, upload, admin)
- src/components: Reusable UI and feature components
- src/lib: Core utilities (auth, prisma, cache, media, sockets, etc.)
- src/pages/api/socket.ts: Socket.IO bootstrap endpoint
- src/generated/prisma: Generated Prisma client output
- prisma/schema.prisma: Database schema
- prisma/migrations: Prisma migration history
- tests: Vitest unit tests

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL (local or managed)
- Azure Storage account/container for media uploads
- Optional: Redis instance for distributed caching

## Environment Variables

Create a .env file in the project root.

Required for core runtime:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=your-long-random-secret
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=your_storage_container_name
ADMIN_PANEL_PASSWORD=your-admin-panel-password
```

Optional but recommended:

```env
AZURE_CDN_BASE_URL=https://your-cdn-domain
REDIS_URL=redis://localhost:6379
# or
AZURE_REDIS_CONNECTION_STRING=your_azure_redis_connection_string
NODE_ENV=development
```

Notes:

- If Redis is missing, the app still works with in-memory fallback caching.
- If Azure variables are missing, upload/media endpoints fail.
- If ADMIN_PANEL_PASSWORD is missing, admin login returns a 500 error with guidance.

## Local Development Setup

1. Install dependencies.

```bash
npm install
```

2. Generate Prisma client and apply schema.

```bash
npx prisma generate
npx prisma db push
```

3. Start development server.

```bash
npm run dev
```

4. Open:

- App: http://localhost:3000
- Admin login page: http://localhost:3000/admin/login

## Available Scripts

```bash
npm run dev        # Next.js dev server
npm run build      # Production build
npm run start      # Start built app
npm run lint       # ESLint
npm run test       # Vitest watch mode
npm run test:run   # Vitest single run
```

## Database Model Overview

Prisma models:

- User
- Post
- Story
- Follow
- Like
- Comment
- CommentLike
- SavedPost

Highlights:

- Cascading deletes are configured for most dependent relations.
- Story records include expiresAt and are filtered by active window.
- Composite unique constraints prevent duplicate follows/likes/saves.

## API Overview

Base URL (local): http://localhost:3000

### Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Feed and Profiles

- GET /api/feed
- GET /api/feed/public
- GET /api/profile/me
- PATCH /api/profile/me
- GET /api/profile/[username]

### Posts and Stories

- POST /api/posts
- PATCH /api/posts/[postId]
- DELETE /api/posts/[postId]
- GET /api/stories/active
- POST /api/stories/active
- DELETE /api/stories/active

### Social Actions

- POST /api/social/likes/toggle
- POST /api/social/comments/likes/toggle
- POST /api/social/comments
- GET /api/social/comments
- PATCH /api/social/comments
- DELETE /api/social/comments
- POST /api/social/follows/toggle
- POST /api/social/saved/toggle

### Upload

- POST /api/upload/sas

This endpoint returns a short-lived Azure SAS upload URL and normalized blob URL fields.

### Admin

- POST /api/admin/auth/login
- POST /api/admin/auth/logout
- GET /api/admin/auth/session
- GET /api/admin/overview
- GET /api/admin/users
- DELETE /api/admin/users
- GET /api/admin/posts
- DELETE /api/admin/posts
- GET /api/admin/stories
- DELETE /api/admin/stories
- GET /api/admin/comments
- DELETE /api/admin/comments

## Authentication and Authorization

- Regular users authenticate using a JWT stored in an HTTP-only cookie named mini_insta_auth.
- Admin session uses a separate HTTP-only cookie named mini_insta_admin.
- Middleware redirects:
  - /admin/\* to /admin/login when admin cookie is missing
  - /admin/login to /admin when already authenticated as admin
  - /login and /register to / when already authenticated as user

## Realtime (Socket.IO)

Socket server bootstrap endpoint:

- GET /api/socket

Socket.IO path:

- /api/socket/io

Implemented server events include:

- social:like:toggled
- social:comment:like:toggled
- social:follow:notification
- conversation:comment:new
- profile:stats:sync
- post:updated

## Testing

Run all unit tests:

```bash
npm run test:run
```

Current suite covers:

- cache key generation
- media URL and blob path utilities
- API mapping behavior

## Build and Release Gate

Recommended CI checks:

1. npm run lint
2. npm run test:run
3. npm run build

Latest recorded verification in this repository indicates:

- lint pass (warnings only)
- tests pass (16 tests)
- production build pass

## Deployment Notes

- Set all required environment variables in your host.
- Run prisma generate and ensure schema is applied in target environment.
- Use managed PostgreSQL for production.
- Configure Azure storage keys securely (never commit .env).
- Add a shared Redis instance for multi-instance cache consistency.
- Ensure sticky session or external socket strategy if scaling Socket.IO horizontally.

## Docker

A Dockerfile exists but is currently empty. If you plan container deployment, add a production Dockerfile with multi-stage build and runtime env support.

## Troubleshooting

- Error: Missing JWT_SECRET environment variable
  - Add JWT_SECRET in .env.
- Upload endpoint fails with media config errors
  - Verify Azure storage env vars and container name.
- Admin login returns config error
  - Set ADMIN_PANEL_PASSWORD.
- Redis connection issues
  - Check REDIS_URL or AZURE_REDIS_CONNECTION_STRING, or run without Redis.

## Smoke Test Flow

1. Register a new user.
2. Log in.
3. Request an upload SAS URL and upload media.
4. Create a post.
5. Add comments and likes.
6. Create and verify an active story.
7. Follow/unfollow from another account and verify feed changes.
8. Open two tabs and confirm realtime updates.

## License

No license file is currently defined in this repository. Add one if this project is intended for public distribution.
