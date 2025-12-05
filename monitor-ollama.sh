#!/bin/bash

# Monitor Ollama server logs in real-time
# This will show all API requests and responses

echo "=== Monitoring Ollama Server Logs ==="
echo "Press Ctrl+C to stop monitoring"
echo ""

# Follow the systemd journal for ollama service
sudo journalctl -u ollama -f --no-pager
