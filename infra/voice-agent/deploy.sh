#!/bin/sh
set -e

HOST="${1:?Usage: $0 user@host}"
IMAGE=voice-agent:latest
REMOTE_DIR=/opt/voice-agent

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"

echo "Building $IMAGE (linux/amd64)..."
docker build --platform linux/amd64 \
  -f "$ROOT/apps/voice-agent/Dockerfile" \
  -t "$IMAGE" \
  "$ROOT"

echo "Copying $IMAGE to $HOST..."
docker save "$IMAGE" | gzip | ssh "$HOST" "gunzip | docker load"

echo "Syncing $SCRIPT_DIR -> $HOST:$REMOTE_DIR..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"
scp -r "$SCRIPT_DIR/." "$HOST:$REMOTE_DIR/"

echo "Starting on $HOST..."
ssh "$HOST" "cd $REMOTE_DIR && /usr/local/bin/docker-compose up -d --force-recreate"
