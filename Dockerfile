# Stage 1: Build frontend
FROM node:20-bookworm AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime with Python + Node
FROM python:3.12-slim-bookworm
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY python ./python
COPY scripts ./scripts
COPY companies ./companies
COPY data/examples ./data/examples

RUN bash scripts/setup-job-discovery.sh

COPY --from=frontend /app/dist ./dist
COPY src ./src

RUN mkdir -p data/profile data/intelligence data/jobs data/resumes data/outreach data/cache data/analytics data/audits data/interviews

ENV PORT=5173
ENV CLAUDE_AUTO_LOGIN=0
EXPOSE 5173
VOLUME ["/app/data"]

CMD ["npm", "run", "start:server"]
