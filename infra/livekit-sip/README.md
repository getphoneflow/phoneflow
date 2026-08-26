# LiveKit SIP

Phone-call bridge for inbound/outbound telephony. Follows [LiveKit SIP self-hosting](https://docs.livekit.io/transport/self-hosting/sip-server/).

Must use the **same Redis** and API key/secret as [`../livekit-server`](../livekit-server). Deploy livekit-server first (it installs Docker).

**VM** - Needs a public IP. Host networking is required so SIP/RTP ports bind on the host.

## Deploy

```bash
cp .env.example .env
./deploy.sh
```

SIP URI is `<public-ip>:5060`.
