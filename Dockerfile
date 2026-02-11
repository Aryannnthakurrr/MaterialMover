# ============================================================
# MaterialMover — Single Droplet, Multi-Service Dockerfile
# Runs: Node backend (3000) + Python search (8000) + Nginx (80)
# ============================================================

# ---- Stage 1: Build the React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app/services/frontend
COPY services/frontend/package*.json ./
RUN npm ci
COPY services/frontend/ ./
RUN npm run build

# ---- Stage 2: Production image ----
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies (Ubuntu 24.04 has Python 3.12)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nginx \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node 20 via nodesource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

# ---- Node backend ----
COPY services/backend/package*.json services/backend/
RUN cd services/backend && npm install --production

# ---- Python search service ----
COPY services/search/requirements.txt services/search/
COPY services/search/pyproject.toml services/search/
RUN python3 -m venv /app/services/search/.venv \
    && /app/services/search/.venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/services/search/.venv/bin/pip install --no-cache-dir -r services/search/requirements.txt

# ---- Copy application code ----
COPY services/backend/ services/backend/
COPY services/search/app/ services/search/app/

# ---- Copy built frontend ----
COPY --from=frontend-build /app/services/frontend/dist services/frontend/dist

# ---- Copy root package.json (for dotenv path resolution) ----
COPY package.json ./

# ---- Nginx config ----
COPY deploy/nginx.conf /etc/nginx/sites-available/default

# ---- Supervisor config (manages all processes) ----
COPY deploy/supervisord.conf /etc/supervisor/conf.d/materialmover.conf

# Expose HTTP
EXPOSE 80

# Start supervisor (which starts nginx, node, python)
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
