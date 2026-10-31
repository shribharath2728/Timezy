# ---------------------------------------------------------------------------
# Build stage: install dependencies into a clean layer
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install gcc only during the build stage (not carried into the final image)
RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------------------------------------------------------------------------
# Runtime stage: minimal image without build tools
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# Create a non-root user so the process does not run as root inside the container
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup --no-create-home appuser

# Copy installed packages from the build stage
COPY --from=builder /install /usr/local

# Copy only production application code — exclude tests, dev configs, and caches.
# The .dockerignore file in this directory handles the exclusion list.
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check so Docker and docker-compose can verify the service is ready
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" \
    || exit 1

# Run with multiple workers for production throughput.
# WEB_CONCURRENCY defaults to 2; override via environment variable.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --log-level info"]
