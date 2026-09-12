# Scaffold — generation pipeline fixes + builder UI + admin portal scaffold

Every path below is repo-relative. This is a patch set, not a full repo — copy these over your existing files
(they're organized to match your tree exactly).

## 1. Bugs fixed (the pipeline was not runnable before this)

- **`packages/generator/src/engine.ts`** imported `ZipArchive` from `archiver`, which doesn't exist —
  `archiver` exports a factory function, not a class. Would throw on the first call.
- Both `engine.ts` and `apps/api/src/routes/generate.ts` used a bare `__dirname`. Both ship as native ESM
  (`"type": "module"`), where `__dirname` isn't defined. Fixed with `fileURLToPath(import.meta.url)`.
- **`apps/api/src/routes/generate.ts`** called `generateProjectToZipStream({ templateDir, outputDir })` — a
  function name and parameter shape that never existed in the generator package. It was calling a function
  that isn't there.
- **Silent failure**: `engine.ts` injected route registration into `apps/api/src/app.ts`, a file that doesn't
  exist in `template-base` (the marker is actually in `server.ts`). `injectSlot` no-ops quietly when the
  target file is missing, so generated entity routes were written to disk but never registered with Fastify —
  no error, they just silently didn't work. `injector.ts` now logs a warning instead of failing silently, so
  the next instance of this is loud, not quiet.
- Import-statement injection can't share a marker with the function-body injection it was sharing (`import` is
  top-level-only in ES modules; injecting it where the marker sat would land it mid-function — a syntax
  error). Split into two markers: `<forge-route-imports-start>` (top of file) and `<forge-routes-start>`
  (inside `server()`).
- **Double route prefix**: the old `server.ts` registered generate routes with `{ prefix: "/api/generate" }`
  while `generate.ts` _also_ hardcoded `/api/generate` inside — the real path would have been
  `/api/generate/api/generate`. Fixed by registering without a prefix and keeping the full path in the route
  file (matches how `auth.routes.ts` already does it).
- Generated CRUD routes (`routes.ts.ejs`) imported a nonexistent `../db` module and used a bare `db` that was
  never passed in. Rewritten to use `fastify.db` (the actual decorated instance from `connectDB()`) and import
  the table from `@workspace/db`, matching how `auth.routes.ts` already does both of those things. Also
  switched error handling from manual `reply.status(404).send(...)` to `throw new ApiError(...)` +
  `reply.success(...)`, matching the rest of the app's convention instead of inventing a second one.
- **`AdminPageDefinition.routePath`** was a free-text field in the schema that the generator silently ignored
  (it always derives the URL from the entity's table name via the file-routing convention). Now
  `normalizeProjectIR` derives it explicitly, so the IR that reaches the generator — and whatever a UI echoes
  back — reflects what's actually going to be built, instead of a value that was always going to be thrown
  away.
- **Generated pages went to `apps/web/...`**, an app that doesn't exist for this purpose. Everything else —
  `adminAuthToken` cookies, `ADMIN_URL`, the `admin:*` scripts, `AdminPageDefinition` itself — points at an
  admin portal. Fixed to `apps/admin/...`, and that app is now scaffolded (see §3).
- Root and `template-base` root `package.json`: `backend:*` scripts filtered `@workspace/backend`, a package
  name that doesn't exist anywhere (`@workspace/api` does). Fixed the filters; also fixed
  `apps/api/Dockerfile`'s `pnpm api:build`/`api:start`, which called scripts that were never defined.
- `template-base/package.json` had `web:*` scripts pointing at a `@workspace/web` package that was never
  scaffolded — `pnpm --filter` on a nonexistent package errors, not no-ops. Removed until an actual
  public-site app exists (nothing in the IR models one yet).

## 2. New: local project store + `/api/projects` (`apps/api`)

- `src/store/projects-store.ts` — flat JSON file at `apps/api/.data/projects.json` (write-then-rename so a
  crash mid-write can't corrupt it). This is deliberately not a real database — single local user, trivial to
  inspect/ back up/hand-edit. Swap it out later if that ever stops being true; nothing outside this file
  touches the JSON directly.
- `src/routes/projects.ts` — CRUD for drafts, validated against a new `ProjectDraftSchema` (in
  `@workspace/core`) that's intentionally looser than `ProjectIRSchema` — a draft can have zero entities and
  no name yet. Full validation happens once, at generate-time, against the real schema.
- Added `.data/` to `.gitignore`.
- Brought apps/api's own error handling in line with `template-base`'s established `ApiError` /
  `reply.success` convention (it previously had neither wired up) — same pattern, not a new one.

## 3. New: `apps/web` — the builder UI

React Router v7 (SPA mode — no auth here, so no SSR/cookie complexity is needed), Tailwind v4, small
shadcn-style component set. Flow:

`/` (project list, create/delete) → `/projects/:id/settings` (name, slug, auth toggles, integrations) →
`/projects/:id/entities` (fields with type/required/unique/default) → `/projects/:id/pages` (per-entity admin
pages: which fields become columns, which are searchable) → `/projects/:id/generate` (client-side validation
preview using the same `ProjectIRSchema` the backend enforces, then downloads the zip).

Talks to `apps/api` directly over `VITE_API_BASE_URL` (injected from the existing non-prefixed `API_BASE_URL`
env var via `vite.config.ts`'s `define`, since Vite only exposes `VITE_`-prefixed vars to client code by
default).

## 4. New: `packages/template-base/apps/admin` — the generated admin portal

This didn't exist yet, which is what `engine.ts` was writing into a vacuum. React Router v7, **full SSR** (per
your call), Tailwind v4.

**The auth problem this solves:** the backend sets httpOnly JWT cookies with no explicit `Domain`. If the
admin app's SSR server and the API are different origins (different ports in dev, likely different hosts in
prod), a cookie set via a direct cross-origin call belongs to the API's origin — a loader running in the admin
app's own process never sees it on incoming requests, because browsers only attach a cookie to requests aimed
at the origin that set it.

Fix: every request the browser makes goes through the admin app's own origin, which transparently proxies
`/api/*` to the real backend — `vite.config.ts`'s `server.proxy` in dev, a small Express +
`http-proxy-middleware` server (`server.ts`) in prod. From the browser's perspective the cookie now belongs to
the admin app, so SSR loaders (which receive the incoming request's `Cookie` header directly) can forward it
straight to the backend — see `app/lib/api-server.ts`. Client-side code uses relative `/api/...` paths through
the same proxy (`app/lib/api-client.ts`).

Structure:

- `app/routes/login.tsx` — client-side form, posts to `/api/auth/admin/signin`.
- `app/routes/admin.tsx` — protected layout; `loader` calls `/api/auth/admin/me` server-side and redirects to
  `/login` on 401 (via `apiFetchServer`, which centralizes that redirect so every loader gets it for free).
  Sidebar has a `NAV_ITEMS` array with a `<forge-nav-links-start>` marker — `engine.ts` now injects a link
  into it for every generated entity page, so pages are reachable from the UI, not just by URL.
- `app/routes.ts` uses `@react-router/fs-routes` (flat-file convention) specifically so `admin.<table>.tsx`
  files the generator drops in nest under `admin.tsx` automatically — no route registration step needed for
  those.
- `app/routes/admin._index.tsx` — placeholder dashboard.
- `Dockerfile` — same multi-stage shape as `apps/api`'s.

`packages/generator/src/templates/web/table.tsx.ejs` (generated entity list pages) was rewritten to match: an
SSR `loader` + `useSearchParams`, using React Router's own revalidation for search/pagination instead of
manual client-side `fetch` — idiomatic for this app now that it's SSR, and it comes with cookie handling for
free via `apiFetchServer`.

## What I did not build

- **`packages/db` / `packages/auth`** — referenced everywhere (`connectDB`, `jwtService`, `users`,
  `UserPayload`) but not in the files you gave me. I'm assuming these already exist in your real repo. One
  thing to check: `packages/db/src/schema/index.ts` needs a `// <forge-schema-export-start>` comment in it for
  entity schema exports to get injected — same mechanism as the two markers added to `server.ts`.
- **A public-facing `apps/web` inside `template-base`** — nothing in `ProjectIR` models public (non-admin)
  pages yet, so there was nothing for the generator to target. Same pattern as `apps/admin` if you want to add
  it later.
- **Per-entity generated TypeScript types** — generated routes/pages use `Record<string, unknown>` for row
  data rather than a generated interface per entity. Type-safe but not entity-specific; a reasonable follow-up
  if you want it.
- I have not run `pnpm install` / built any of this — no Postgres or real workspace install in this sandbox.
  I've reviewed it carefully by hand (markers cross-checked, all JSON validated, types traced through), but
  budget time for `pnpm install && pnpm dev` turning up something I missed, particularly exact React Router /
  Tailwind v4 package versions, which I picked as reasonable current ranges rather than verified exact
  numbers.

## Try it

```
pnpm install
cp .env.example .env      # set WEB_URL=http://localhost:5173
pnpm dev                  # runs apps/api + apps/web (the builder) via turbo
```

Open http://localhost:5173, build a project, hit Generate. Unzip the result into a scratch folder,
`cp .env.example .env` in it, `pnpm install`, then `pnpm admin:dev` / `pnpm backend:dev` to run the generated
app.
