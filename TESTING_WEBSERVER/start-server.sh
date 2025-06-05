#!/bin/bash

echo "🚀 Starting test.cz server on port 80..."

# Check if port 80 is available
if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "❌ Port 80 is already in use!"
    echo "Please stop the conflicting service:"
    echo "  sudo systemctl stop apache2"
    echo "  sudo systemctl stop nginx"
    exit 1
fi

# Start server with sudo
echo "📡 Starting server (requires sudo for port 80)..."
sudo node server.js
