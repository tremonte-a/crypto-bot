#!/bin/sh
echo "Running database migrations..."
node dist/migrate.js

echo "Starting application..."
exec pm2-runtime ecosystem.config.js