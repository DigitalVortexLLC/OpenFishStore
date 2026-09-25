# Production image. Uses SQLite on a mounted volume by default; see README
# for switching to PostgreSQL.
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/openfishstore.db
COPY --from=build /app ./
VOLUME /data
EXPOSE 3000
# Apply the schema, then start. Run `npx prisma db seed` once to create the owner.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
