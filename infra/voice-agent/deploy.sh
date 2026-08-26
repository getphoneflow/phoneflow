#!/bin/sh
set -e

HOST="${1:-}"
if [ -z "$HOST" ]; then
  printf "SSH target (user@host): "
  read HOST
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"
REMOTE_DIR=/opt/voice-agent
IMAGE=voice-agent:latest

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "Missing $SCRIPT_DIR/.env" >&2
  exit 1
fi

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
