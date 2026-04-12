# Aptico

Aptico is a career intelligence platform for job seekers. It combines resume and job description analysis, job search, saved jobs, interview prep, public profiles, community wins, and a career focused social layer.

The app is split into two workspaces:

- `backend`: Fastify API, Drizzle schema, PostgreSQL, Redis caching, auth, analysis, jobs, social routes, and GraphQL admin tools
- `frontend`: Vite, React, Redux, React Query, Tailwind CSS, protected app pages, public pages, and social UI

## What Aptico Does

- Analyzes resumes against job descriptions
- Generates gap analysis, rewrite suggestions, interview prep, and follow up material
- Searches jobs across multiple job sources with fallback providers
- Saves jobs and analysis history
- Supports public professional profiles
- Lets users share community wins
- Adds posts, feed, comments, likes, connections, notifications, and people discovery

## Tech Stack

Backend:

- Node.js
- Fastify
- Drizzle ORM
- PostgreSQL
- Redis via Upstash REST
- Zod
- JWT auth
- Mercurius GraphQL
- Google Gemini API

Frontend:

- React
- Vite
- Redux Toolkit
- React Query
- React Router
- Tailwind CSS v4
- Axios

## Project Structure

```text
Aptico/
  backend/
    src/
      config/        Environment and Drizzle config
      controllers/   API controller logic
      db/            Drizzle schema
      graphql/       Admin GraphQL schema and resolvers
      middlewares/   Auth middleware
      routes/        Fastify routes
      services/      Business logic and integrations
      utils/         Shared helpers, Redis, queues, scoring, clients
  frontend/
    src/
      api/           Axios clients and API wrappers
      components/    Shared UI components
      hooks/         Shared React hooks
      pages/         Route level pages
      store/         Redux slices
      utils/         Browser side utilities
```

## Prerequisites

Install these before running the app:

- Node.js 24 or newer
- npm
- PostgreSQL database
- Upstash Redis account, optional but recommended
- Google Gemini API keys for analysis features
- Job provider credentials if you want all job search sources enabled

## Environment Setup

Create environment files from the examples:

```bash
cd backend
copy .env.example .env

cd ../frontend
copy .env.example .env
```

On macOS or Linux, use `cp` instead of `copy`.

Backend variables that matter first:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GEMINI_PRECHECK_API_KEY`
- `GEMINI_KEY_1`
- `GEMINI_KEY_2`
- `GEMINI_KEY_3`
- `GEMINI_KEY_FALLBACK`

Frontend variables that matter first:

- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET`
- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_GOOGLE_CLIENT_ID`

For local development, the frontend is expected to run on port `3000` and the backend on port `5000`.

## Install Dependencies

Install dependencies in both workspaces:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Database

The Drizzle schema lives at:

```text
backend/src/db/schema.js
```

Push schema changes with:

```bash
cd backend
npm run db:push
```

If the local shell blocks `npm.ps1` on Windows, run:

```bash
npm.cmd run db:push
```

The main database tables include users, auth tokens, analyses, generated content, saved jobs, profile settings, social profiles, follows, community wins, public job cache, posts, post comments, connections, and notifications.

## Run Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build

Build the frontend:

```bash
cd frontend
npm run build
```

Preview the built frontend:

```bash
npm run preview
```

Start the backend without watch mode:

```bash
cd backend
npm start
```

## Important Routes

Public and auth:

- `/`
- `/login`
- `/signup`
- `/guest`
- `/u/:username`
- `/wins`

Authenticated app:

- `/home`
- `/dashboard`
- `/analysis`
- `/analysis-history`
- `/analysis/latest`
- `/jobs`
- `/saved-jobs`
- `/interview-prep`
- `/people`
- `/notifications`
- `/profile`
- `/settings`

Admin:

- `/admin`

## API Areas

Backend route groups:

- `/api/auth`
- `/api/analyze`
- `/api/generate`
- `/api/jobs`
- `/api/social`
- `/api/admin`

Social features under `/api/social` include profiles, follows, wins, public jobs, posts, feeds, comments, connections, notifications, stats, and people search.

## Development Notes

- Keep backend business logic in `backend/src/services`.
- Keep route validation close to the route files.
- Keep frontend server calls in `frontend/src/api`.
- Reuse `AppShell` for authenticated pages.
- Reuse existing CSS variables and `app-*` utility classes before adding new visual patterns.
- Do not put secrets in the repo. Use `.env` files locally and real secret storage in deployment.
- When changing database tables, update `backend/src/db/schema.js` first, then run the Drizzle push command.

## Quick Troubleshooting

`npm run db:push` cannot find the database URL:

- Check `backend/.env`
- Confirm `DATABASE_URL` is set
- Try `npm.cmd run db:push` on Windows

Frontend build cannot load a native Tailwind or Vite package on Windows:

- Close running dev servers
- Reinstall frontend dependencies
- Run the build again from a normal terminal

Requests fail with CORS errors:

- Check `FRONTEND_URL` in `backend/.env`
- Check `VITE_API_PROXY_TARGET` in `frontend/.env`
- Confirm the backend is running on the expected port

Gemini analysis fails:

- Confirm the Gemini keys are present in `backend/.env`
- Check the backend logs for provider or quota errors

Job search returns fewer results than expected:

- Add provider keys for Adzuna, Muse, Reed, JSearch, Jooble, and Serper
- Check the backend logs for rate limits or provider failures

