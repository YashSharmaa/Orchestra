# Orchestra © 2025
# Author: Orchestra Team
# License: Apache-2.0
# Description: Multi-stage Dockerfile for Orchestra production build

# Base stage with Node.js
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN npm ci

# Build backend
FROM base AS build-backend
COPY --from=deps /app/node_modules ./node_modules
COPY packages/backend ./packages/backend
COPY package.json ./
RUN npm run build:backend

# Build frontend
FROM base AS build-frontend
COPY --from=deps /app/node_modules ./node_modules
COPY packages/frontend ./packages/frontend
COPY package.json ./
RUN npm run build:frontend

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 orchestra && \
    adduser --system --uid 1001 orchestra

# Copy backend
COPY --from=build-backend --chown=orchestra:orchestra /app/packages/backend/dist ./packages/backend/dist
COPY --from=build-backend --chown=orchestra:orchestra /app/packages/backend/package.json ./packages/backend/
COPY --from=deps --chown=orchestra:orchestra /app/packages/backend/node_modules ./packages/backend/node_modules

# Copy frontend build
COPY --from=build-frontend --chown=orchestra:orchestra /app/packages/frontend/dist ./packages/frontend/dist

COPY --chown=orchestra:orchestra package.json ./

USER orchestra

EXPOSE 3000

CMD ["node", "packages/backend/dist/index.js"]
