# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time env var for deploy timestamp
ARG NEXT_PUBLIC_DEPLOY_TS
ENV NEXT_PUBLIC_DEPLOY_TS=$NEXT_PUBLIC_DEPLOY_TS

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chmod -R +x node_modules/.bin && npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
