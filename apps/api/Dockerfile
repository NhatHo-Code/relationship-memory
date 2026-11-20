# Build context is the repo root: docker build -f apps/api/Dockerfile .
# One image runs both processes: `node dist/server.js` (default) or `node dist/worker.js`.

FROM node:26-slim AS build
# Node 25+ no longer bundles corepack; it pins pnpm to the root packageManager version.
RUN npm install -g corepack@latest && corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @rm/api...
RUN pnpm --filter @rm/api build
# Copy the api package with production dependencies only into /out.
RUN pnpm --filter @rm/api deploy --prod --legacy /out

FROM node:26-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
