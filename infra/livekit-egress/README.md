# LiveKit Egress

Recording worker for call audio/video. Follows [LiveKit egress self-hosting](https://docs.livekit.io/transport/self-hosting/egress/).

Must use the **same Redis** and API key/secret as [`../livekit-server`](../livekit-server). Deploy livekit-server first (it installs Docker).

**VM** - LiveKit recommends at least 4 CPUs and 4 GB RAM per egress instance.

## Deploy

```bash
cp .env.example .env
./deploy.sh
```
