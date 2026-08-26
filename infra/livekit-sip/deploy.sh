#!/bin/sh
set -e

HOST="${1:-}"
if [ -z "$HOST" ]; then
  printf "SSH target (user@host): "
  read HOST
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
REMOTE_DIR=/opt/livekit-sip

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "Missing $SCRIPT_DIR/.env" >&2
  exit 1
fi

echo "Syncing $SCRIPT_DIR -> $HOST:$REMOTE_DIR..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"
scp -r "$SCRIPT_DIR/." "$HOST:$REMOTE_DIR/"

echo "Opening SIP/RTP ports on $HOST..."
ssh "$HOST" '
  ufw allow 22/tcp
  ufw allow 5060/tcp
  ufw allow 5060/udp
  ufw allow 10000:20000/udp
  ufw --force enable
'

echo "Starting on $HOST..."
ssh "$HOST" "cd $REMOTE_DIR && /usr/local/bin/docker-compose up -d"
