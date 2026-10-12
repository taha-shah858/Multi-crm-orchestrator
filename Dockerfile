FROM node:22-bookworm-slim AS dependencies

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

FROM dependencies AS development

WORKDIR /app
COPY . ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
