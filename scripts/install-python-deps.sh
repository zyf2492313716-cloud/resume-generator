#!/bin/bash
# Install Python dependencies into src/utils/libs/ for offline embedding
# Run this before building the Electron app

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LIBS_DIR="$PROJECT_DIR/src/utils/libs"
REQUIREMENTS="$PROJECT_DIR/requirements.txt"

echo "📦 Installing Python dependencies to $LIBS_DIR ..."

# Clean old libs
rm -rf "$LIBS_DIR"
mkdir -p "$LIBS_DIR"

# Install dependencies
pip3 install -r "$REQUIREMENTS" -t "$LIBS_DIR" --only-binary=:all: --quiet

# Remove unnecessary files to reduce size
find "$LIBS_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$LIBS_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$LIBS_DIR" -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true
find "$LIBS_DIR" -name "*.egg-info" -type d -exec rm -rf {} + 2>/dev/null || true
find "$LIBS_DIR" -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find "$LIBS_DIR" -name "test" -type d -exec rm -rf {} + 2>/dev/null || true

# Report size
SIZE=$(du -sh "$LIBS_DIR" | cut -f1)
echo "✅ Done! libs/ size: $SIZE"
echo ""
echo "Contents:"
ls "$LIBS_DIR"
