#!/bin/bash

# Script to start local LLM server (Ollama) for Vittoria Launchpad
# Default URL: http://localhost:11434/v1
# Default Model: llama3

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Vittoria Launchpad - Local LLM Startup ===${NC}"

# Check if Ollama is installed (check both PATH and common locations)
OLLAMA_CMD=""
if command -v ollama &> /dev/null; then
    OLLAMA_CMD="ollama"
elif [ -f "/usr/local/bin/ollama" ]; then
    OLLAMA_CMD="/usr/local/bin/ollama"
elif [ -f "/usr/bin/ollama" ]; then
    OLLAMA_CMD="/usr/bin/ollama"
else
    echo -e "${RED}Error: Ollama is not installed.${NC}"
    echo ""
    echo "Please install Ollama first:"
    echo "  curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    echo "Or visit: https://ollama.com/download"
    exit 1
fi

echo -e "${GREEN}✓ Ollama is installed${NC}"

# Default model
MODEL="${1:-llama3}"

echo -e "${YELLOW}Using model: ${MODEL}${NC}"

# Check if model is already pulled
if ! ${OLLAMA_CMD} list | grep -q "^${MODEL}"; then
    echo -e "${YELLOW}Model '${MODEL}' not found locally. Pulling...${NC}"
    ${OLLAMA_CMD} pull "${MODEL}"
    echo -e "${GREEN}✓ Model '${MODEL}' pulled successfully${NC}"
else
    echo -e "${GREEN}✓ Model '${MODEL}' is already available${NC}"
fi

# Check if Ollama server is already running
if pgrep -x "ollama" > /dev/null; then
    echo -e "${GREEN}✓ Ollama server is already running${NC}"
else
    echo -e "${YELLOW}Starting Ollama server...${NC}"
    ${OLLAMA_CMD} serve &
    OLLAMA_PID=$!
    echo -e "${GREEN}✓ Ollama server started (PID: ${OLLAMA_PID})${NC}"
    
    # Wait for server to be ready
    echo -e "${YELLOW}Waiting for server to be ready...${NC}"
    sleep 3
fi

# Test the server
echo -e "${YELLOW}Testing server connection...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}✓ Server is responding${NC}"
else
    echo -e "${RED}Error: Server is not responding${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Local LLM Server Ready ===${NC}"
echo ""
echo "Server URL: http://localhost:11434/v1"
echo "Model: ${MODEL}"
echo ""
echo "Configure in Vittoria Launchpad:"
echo "  1. Go to Settings > AI Config"
echo "  2. Select 'Local (Ollama/OpenAI-compatible)'"
echo "  3. Base URL: http://localhost:11434/v1"
echo "  4. Model Name: ${MODEL}"
echo "  5. Click 'Save & Connect Local'"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Keep script running if we started the server
if [ ! -z "${OLLAMA_PID}" ]; then
    wait ${OLLAMA_PID}
fi
