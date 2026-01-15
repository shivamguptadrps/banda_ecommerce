# Python FastAPI Backend Dockerfile

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user first
RUN adduser --disabled-password --gecos '' appuser

# Copy and set permissions for startup script (before switching user)
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh && chown appuser:appuser /app/start.sh

# Change ownership of app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port (Railway will use PORT env var, this is just documentation)
EXPOSE 8000

# Run the application using startup script
# Railway sets PORT environment variable automatically
CMD ["/app/start.sh"]

