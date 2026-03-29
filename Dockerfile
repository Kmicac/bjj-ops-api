# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bjj_ops?schema=public
ENV DATABASE_URL="${DATABASE_URL}"

RUN corepack enable \
  && corepack prepare pnpm@10.32.1 --activate \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm prisma:generate \
  && pnpm build

FROM deps AS development

ENV NODE_ENV=development

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

RUN pnpm prisma:generate \
  && chown -R node:node /app /pnpm

USER node

CMD ["pnpm", "start:dev"]

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated

RUN chown -R node:node /app /pnpm

USER node

CMD ["node", "dist/main"]
