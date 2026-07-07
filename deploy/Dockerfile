# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV TZ=UTC
WORKDIR /app

RUN addgroup -g 1001 -S qmpilot && adduser -S -u 1001 -G qmpilot qmpilot

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/schema.zmodel ./schema.zmodel

USER qmpilot
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4321/api/health || exit 1

CMD ["node", "./dist/server/entry.mjs"]
