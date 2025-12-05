#!/bin/bash

# Script to start LLM Studio (LM Studio)
# This assumes LM Studio is installed as an AppImage or available in the path.
# Adjust the path below to match your installation.

echo "Starting LLM Studio..."

# Common paths for AppImages or executables
FOUND=false

for path in \
    "$HOME/Applications/LM-Studio.AppImage" \
    "$HOME/Downloads/LM-Studio.AppImage" \
    "/usr/bin/lm-studio" \
    "/usr/local/bin/lm-studio" \
    "$HOME/Downloads/LM-Studio-0.3.33-1-x64.AppImage"
do
    if [ -f "$path" ]; then
        echo "Found LM Studio at: $path"
        chmod +x "$path"
        "$path" &
        FOUND=true
        break
    fi
done

if [ "$FOUND" = false ]; then
    echo "LM Studio executable not found in common locations."
    echo "Please ensure LM Studio is installed and update this script with the correct path."
    echo "You can download it from https://lmstudio.ai/"
fi
