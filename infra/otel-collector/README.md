# OpenTelemetry Collector

Monitoring agent for the LiveKit VPSs. Deploy it on every host, after livekit-server (which installs Docker).

It sends two kinds of metrics over OTLP:

- **Host resources**: CPU, memory, disk, filesystem and network.
- **LiveKit metrics** from the Prometheus ports in `../livekit-*`: rooms, participants and packet loss from the server, and `livekit_egress_available` / SIP load. LiveKit recommends `*_available` as the capacity signal. The `up` metric for each job is 0 when that service is down.

## Deploy

```bash
cp .env.example .env
./deploy.sh
```
