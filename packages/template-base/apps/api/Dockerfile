FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps

# Root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# App + shared packages package.json only
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/auth/package.json ./packages/auth/package.json

RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Root config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# Source
COPY apps/api ./apps/api
COPY packages ./packages

# Build api (+ dependency packages via turbo). The package is named
# @workspace/api but the root/template-base scripts are keyed "backend:*"
# (matching apps/admin's "admin:*" and a future apps/web's "web:*") — this
# previously called a "pnpm api:build" script that doesn't exist anywhere.
RUN pnpm backend:build

# ---- Production runner ----
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

RUN corepack enable

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json /app/tsconfig.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages

EXPOSE 4001

CMD ["pnpm", "backend:start"]
