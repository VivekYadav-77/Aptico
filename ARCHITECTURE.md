# Aptico Architecture

## Runtime Shape

Aptico is split into two deployable applications:

- `frontend/`: Next.js app router UI, route guards, client analytics, and browser-facing API clients.
- `backend/`: Fastify API, admin GraphQL, Drizzle/PostgreSQL data access, auth, analytics, jobs, support, profile, social, and squad modules.

The frontend talks to the backend through `/api/*` and `/admin/graphql` rewrites in `frontend/next.config.js`. Production secrets stay in the backend environment.

## Frontend Boundaries

- `src/app/`: Next.js route entrypoints and route runtime wrappers.
- `src/app/route-registry.jsx`: maps route names to screen components.
- `src/screens/`: top-level page experiences used by app routes.
- `src/components/`: reusable UI components.
- `src/api/`: browser-safe HTTP clients.
- `src/features/`: feature-owned subdomains with their own pages/data when they are large enough to isolate.
- `src/store/`: global Redux state.
- `src/hooks/`, `src/utils/`, `src/lib/`: shared client utilities.

Route files should stay thin and delegate to `RouteClient`. New route screens should be added to `route-registry.jsx` instead of importing many screens into the route wrapper.

## Backend Boundaries

- `src/app/`: Fastify bootstrap and route registration.
- `src/app/register-routes.js`: auditable route-prefix manifest.
- `src/modules/`: domain modules with their own routes/controllers/services.
- `src/shared/`: cross-cutting middleware, security, HTTP helpers, services, and utilities.
- `src/config/`: runtime configuration and Drizzle config.
- `src/db/`: schema definitions.
- `scripts/migrations/`: safe one-off schema migration scripts for features not covered by Drizzle push.

Domain modules should not read secrets directly. They should receive dependencies through the Fastify app decorators or shared services.

## Production Rules

- Keep raw secrets backend-only.
- Store permanent user media in Cloudinary or another object store, not Render's filesystem.
- Use Neon/PostgreSQL for relational product data.
- Use Upstash Redis for revocation/cache behavior when configured; fail open only where the current service explicitly allows it.
- Keep admin-only APIs behind `authenticateAdminRequest`.
- Prefer soft-delete, hide, restrict, revoke, or deactivate flows before destructive deletes.
- Return API errors with `success: false`, a stable `code`, a user-safe `message`, and `requestId` where available.
