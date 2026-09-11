FROM node:22-alpine AS dependencies

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# PGlite and some export dependencies need glibc compatibility on Alpine.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./package.json

# Empty directory is copied into a new named volume with these permissions.
RUN mkdir -p /app/.data/pglite && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
