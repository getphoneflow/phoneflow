#!/bin/sh
set -e

HOST="${1:-}"
if [ -z "$HOST" ]; then
  printf "SSH target (user@host): "
  read HOST
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
REMOTE_DIR=/opt/livekit

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "Missing $SCRIPT_DIR/.env" >&2
  exit 1
fi

echo "Syncing $SCRIPT_DIR -> $HOST:$REMOTE_DIR..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"
scp -r "$SCRIPT_DIR/." "$HOST:$REMOTE_DIR/"

echo "Installing Docker, opening ports, and starting on $HOST..."
ssh "$HOST" "cd $REMOTE_DIR && sh" <<'REMOTE'
set -e

mkdir -p caddy_data
mkdir -p /usr/local/bin

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh </dev/null
fi

if [ ! -x /usr/local/bin/docker-compose ]; then
  curl -L "https://github.com/docker/compose/releases/download/v5.0.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod 755 /usr/local/bin/docker-compose
fi

systemctl enable docker

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 7881/tcp
ufw allow 3478/udp
ufw allow 50000:60000/udp
ufw --force enable

docker run --rm \
  --env-file .env \
  -v "$PWD":/work -w /work \
  alpine:3.20 \
  sh -c 'apk add -q gettext && envsubst < livekit.yaml > livekit.yaml.tmp && mv livekit.yaml.tmp livekit.yaml && envsubst < caddy.yaml > caddy.yaml.tmp && mv caddy.yaml.tmp caddy.yaml'

cat << EOF > /etc/systemd/system/livekit-docker.service
[Unit]
Description=LiveKit Server Container
After=docker.service
Requires=docker.service

[Service]
LimitNOFILE=500000
Restart=always
WorkingDirectory=$PWD
ExecStartPre=/usr/local/bin/docker-compose -f docker-compose.yaml down
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yaml up
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yaml down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable livekit-docker
systemctl start livekit-docker
REMOTE
