# Build context: repo kökü  (docker build -f apps/web/Dockerfile .)
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter web...
ARG NUXT_PUBLIC_API_BASE_URL
ARG NUXT_PUBLIC_USE_MOCK=false
ENV NUXT_PUBLIC_API_BASE_URL=$NUXT_PUBLIC_API_BASE_URL NUXT_PUBLIC_USE_MOCK=$NUXT_PUBLIC_USE_MOCK
RUN pnpm --filter web build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000
COPY --from=build /repo/apps/web/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]
