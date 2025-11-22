# Production Dockerfile for Cloud Run
FROM node:18-slim

# Install Redis server
RUN apt-get update && \
    apt-get install -y redis-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy startup script and make it executable
COPY start-cloud-run.sh /app/
RUN chmod +x /app/start-cloud-run.sh

# Create directory for Redis data
RUN mkdir -p /var/lib/redis && \
    chmod 755 /var/lib/redis

# Expose port
EXPOSE $PORT

# Use our startup script that manages both Redis and the app
CMD ["/app/start-cloud-run.sh"]