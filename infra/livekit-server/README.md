# LiveKit Server

LiveKit + Redis + Caddy. Follows [LiveKit VM self-hosting](https://docs.livekit.io/transport/self-hosting/vm/).

## Deploy

**DNS** - A records for `LIVEKIT_DOMAIN` and `TURN_DOMAIN` -> VM public IP (required before Caddy can issue certs).

```bash
cp .env.example .env
./deploy.sh
```

## Verify

```bash
curl https://livekit.yourdomain.com   # should return OK
```

App env:

```
LIVEKIT_URL=wss://livekit.yourdomain.com
LIVEKIT_API_KEY=<from .env>
LIVEKIT_API_SECRET=<from .env>
```
