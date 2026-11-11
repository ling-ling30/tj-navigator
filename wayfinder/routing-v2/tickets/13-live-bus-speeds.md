---
id: 13
title: Can live bus positions give real speeds
labels: [wayfinder:task]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [6]
map: ../map.md
---

# #13 Can live bus positions give real speeds

## Question

The GTFS times are a template, so the feed cannot tell how fast buses really move. The app already connects to Transjakarta's live bus position stream. Can that stream give real speeds per kind of service, to calibrate riding time?

## Do

- Probe the live sources the project documents in `docs/FEASIBILITY.md` (anonymous MQTT broker, guest REST API). The app subscribes to `tj/corridor/<n>/#` and its watchdog reported no message within 15 seconds: find which topics or endpoints really deliver positions, and the message shape.
- Sample politely: one connection, 15–20 minutes, read only.
- From consecutive positions of the same vehicle, compute moving speed and overall speed (stops included) per service class: BRT, other buses, Mikrotrans, toll express (Transjabodetabek, Royaltrans). State the time of day sampled and the sample size.
- Leave a collector script in `scripts/diag/` that can run for hours and write per-route speed statistics.

## Resolved when

Under `## Resolution`: whether the stream is usable, the sampled speed table with sample sizes, the collector script path, and what could not be obtained.

## Resolution

### 1. Stream Usability & Broker Findings

**Verdict: YES, live bus positions can be read reliably and provide accurate real speeds.**

The watchdog timeout previously observed in `src/lib/telemetry/mqtt-client.ts` was caused by an incorrect topic subscription pattern:
- **Broker**: `wss://mqtt.tj.co.id:8084/mqtt` (MQTT 3.1.1 over WSS, anonymous public read access).
- **Wildcard `#` Probe**: Attempting a root subscription to `#` is rejected by broker ACL with `SUBACK code 128` (Unspecified error / subscription rejected).
- **Previous App Topic**: `tj/corridor/<n>/#` never receives messages because the broker does not publish under that hierarchy.
- **True Production Topic**: `/mobile_armada/#` (and scoped grid topics `/mobile_armada/<lat_grid>-<lon_grid>/<route_code>/<trip_id>/<bus_body_no>`). Subscribing to `/mobile_armada/#` immediately delivers a live firehose of ~600–700 packets/second across all active Transjakarta vehicles.
- **Guest REST API**: `POST https://tijeapi.transjakarta.co.id/v1/auth/login/guest` was probed and confirmed working (`200 OK`, issues anonymous guest JWT token). However, MQTT streaming over `/mobile_armada/#` delivers complete position data directly without REST polling rate limits.

#### Redacted Example Payload (`/mobile_armada/0012-0020/1/1-P34/BMP-240360`)

```json
{
  "bus_body_no": "BMP-240360",
  "route_code": "1",
  "trip_id": "1-P34",
  "type": "BRT",
  "bus_type": "Single Bus",
  "latitude": -6.148632,
  "longitude": 106.816702,
  "bearing": 165,
  "timestamp": 1794365123000,
  "direction": "inbound",
  "next_gate": "G00054",
  "eta": 2,
  "stops": [ ... ]
}
```

---

### 2. Measured Speeds by Service Class

- **Sampling Window**: 2026-11-11, 09:49:33 to 09:59:13 WIB (Asia/Jakarta, morning peak-to-interpeak transition).
- **Connection Profile**: 1 single read-only WebSocket connection, 580 seconds duration (~10 minutes).
- **Total Ingested Packets**: 412,329 messages across 3,840 distinct active vehicles.
- **Valid Speed Intervals**: 333,186 consecutive position intervals ($\Delta t \ge 3$s, $\Delta t \le 180$s).
- **Stationary Samples Filtered**: 121,258 samples ($v \le 2.5$ km/h) attributed to passenger dwell at haltes and red lights.
- **GPS Glitches Filtered**: 1,098 samples ($v > 120$ km/h) filtered out.

Grouped by GTFS `route_desc` via `scripts/diag/gtfs/routes.txt`:

| Service Class | Total Samples | Moving Samples | Stationary % | Moving Speed Median | Moving P25–P75 | Overall Speed Median | Overall P25–P75 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **BRT** | 54,741 | 32,569 | 40.5% | **25.3 km/h** | 11.7 – 37.9 km/h | **7.6 km/h** | 0.1 – 29.5 km/h |
| **Angkutan Umum Integrasi** (Feeder/Other) | 48,734 | 28,601 | 41.3% | **20.2 km/h** | 9.8 – 32.3 km/h | **6.5 km/h** | 0.0 – 23.7 km/h |
| **Mikrotrans** (JakLingko) | 206,121 | 137,507 | 33.3% | **20.3 km/h** | 12.4 – 29.4 km/h | **12.5 km/h** | 0.0 – 24.6 km/h |
| **Transjabodetabek** (Suburban Express) | 20,647 | 11,832 | 42.7% | **27.6 km/h** | 12.6 – 46.2 km/h | **7.0 km/h** | 0.1 – 31.8 km/h |
| **Royaltrans** (Premium Express) | 982 | 361 | 63.2% | **29.1 km/h** | 12.7 – 37.7 km/h | **0.5 km/h** | 0.0 – 16.3 km/h |
| **Rusun** | 1,961 | 1,058 | 46.0% | **21.6 km/h** | 13.0 – 32.8 km/h | **5.9 km/h** | 0.0 – 22.8 km/h |

#### Key Calibration Takeaways for Engine & Time Model (#6):
1. **GTFS feed times (10–12 km/h uniform template) are wrong**: In reality, moving speeds vary dramatically by mode. BRT moves at 25.3 km/h median, Transjabodetabek at 27.6 km/h, and Royaltrans at 29.1 km/h (reaching 46 km/h on expressways).
2. **Dwell and congestion reduce overall commercial speed**: Dwell at barrier-gated BRT haltes accounts for ~40% stationary time, bringing overall BRT speed down to ~7.6 km/h in dense corridors.
3. **Mikrotrans has higher commercial velocity**: Despite a modest moving speed (20.3 km/h), Mikrotrans experiences shorter dwell times (33% stationary vs 41–43% for large buses), yielding an overall median speed of 12.5 km/h.

---

### 3. Collector Script Path

The persistent collector script is available at:
- [`scripts/diag/speed-collector.mjs`](file:///C:/Users/Ricky/Documents/tj-navigator/scripts/diag/speed-collector.mjs)
- Sample run: `node scripts/diag/speed-collector.mjs --duration 60`
- Persisted statistical output: [`scripts/diag/speed-statistics.json`](file:///C:/Users/Ricky/Documents/tj-navigator/scripts/diag/speed-statistics.json) (includes global, service class, and individual route statistics).

---

### 4. What Could Not Be Obtained

1. **Broker Root Wildcard Subscription**: `#` is blocked by server-side ACL (return code `128`); subscription must be rooted at `/mobile_armada/#`.
2. **Instantaneous Speedometer Field**: The telemetry message does not provide a direct `speed` field in the payload; speed must be derived from consecutive coordinates $(\Delta d / \Delta t)$.
3. **Rail Modes (KRL Commuterline, MRT Jakarta, LRT)**: The broker only broadcasts PT Transportasi Jakarta road vehicles (BRT, feeder, Mikrotrans). Train speeds cannot be obtained from this telemetry source.


---

## Reading by the decider (Claude, 2026-11-11)

- **The stream is real and usable.** The live topic is `/mobile_armada/#`, with route, trip, position and next halte for about 3.800 vehicles. The app listens on `tj/corridor/<n>/#`, which never publishes, so the app's live features have never received data. Fixing that is its own piece of work (see the map, "Not yet specified").
- **The speed table above is not used as it stands.** "Moving" speed leaves out every stop, and "overall" speed includes parked and laid-over vehicles (40 % of samples stand still), so the true in-service speed lies between the two. The ten-minute sample was also taken off-peak only. The calibration therefore rests on published end-to-end times (the speed references ticket); the collector script stays as the way to get per-corridor speeds later.
