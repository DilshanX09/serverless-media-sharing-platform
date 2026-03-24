# Mini Insta Backend Test Setup

This guide is for running and testing the backend locally.

## 1) Install dependencies

```bash
npm install
```

## 2) Create `.env` in project root

Add the following variables:

```env
# Required
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=your-long-random-secret
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=your_storage_container_name

# Optional (for public media URL mapping)
AZURE_CDN_BASE_URL=https://your-cdn-domain

# Optional cache (use either one)
REDIS_URL=redis://localhost:6379
# AZURE_REDIS_CONNECTION_STRING=your_azure_redis_connection_string
```

## 3) Prepare database schema

**Note**: You can use postgresql container instance from docker hub

```bash
npx prisma generate
npx prisma db push
```

## 4) Run the app

```bash
npm run dev
```

Server default: `http://localhost:3000`

## 5) Backend smoke test flow

1. Register user (`/register`)
2. Login (`/login`)
3. Create post (upload + publish)
4. Add comment / like / save
5. Create story and verify active stories
6. Verify follow/unfollow affects feed + stories visibility
7. Open profile and test own saved posts tab
8. Test realtime updates (like/comment/post update) across two browser tabs

## Notes

- If Redis is not configured, app still runs (cache-related features degrade gracefully).
- If Azure env vars are missing, upload/media endpoints will fail.
- For production-like behavior, test with:

```bash
npm run build
npm run start
```
