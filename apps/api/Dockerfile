# Build context: repo kökü  (docker build -f apps/api/Dockerfile .)
FROM node:22-alpine AS build
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY apps/api/package.json apps/api/pnpm-lock.yaml apps/api/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY apps/api ./
RUN pnpm exec prisma generate && pnpm build

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production PORT=8000
COPY --from=build /app ./
EXPOSE 8000
# önce migration, sonra uygulama
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/src/main"]
