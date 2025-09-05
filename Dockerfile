# Production Dockerfile for Tej IT Solutions Billing System

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libmariadb-dev-compat \
        pkg-config \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user
RUN useradd --create-home --shell /bin/bash tej-billing

# Copy application code
COPY --chown=tej-billing:tej-billing . .

# Create necessary directories as root and set ownership
RUN mkdir -p app/static/uploads logs \
    && chown -R tej-billing:tej-billing /app

# Switch to non-root user
USER tej-billing

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run gunicorn
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]
