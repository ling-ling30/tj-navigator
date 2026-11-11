/**
 * Reads the live bus feed in one short burst. The feed is heavy (about 44 KB a second for one busy line),
 * so the app never stays connected: it listens for a few seconds to the cells and lines it needs, then leaves.
 * docs/LIVE-COMPANION-SPEC.md, section 8.
 */
import mqtt from 'mqtt';

const BROKER_URL = 'wss://mqtt.tj.co.id:8084/mqtt';
const TOPIC_ROOT = '/mobile_armada';
/** Measured mapping from a position to the grid cell in the topic. */
const GRID = { latOrigin: -6.0254, latStep: -0.0099, lonOrigin: 106.6173, lonStep: 0.01004 };
/** Above this many topic filters, one filter per line is cheaper to manage than one per cell. */
const MAX_CELL_FILTERS = 60;
const CONNECT_TIMEOUT_MS = 8000;

export interface BusSample {
  bus: string;
  route: string;
  lat: number;
  lon: number;
  /** The stop the bus says is next (feed stop id), or '' when it does not say. */
  next: string;
  /** Receive time, epoch milliseconds. */
  t: number;
}

function cellIndex(lat: number, lon: number): [number, number] {
  return [Math.round((lat - GRID.latOrigin) / GRID.latStep), Math.round((lon - GRID.lonOrigin) / GRID.lonStep)];
}
const pad = (n: number) => String(Math.max(0, n)).padStart(4, '0');

/**
 * Topic filters for the given lines around the given points. The cell in a topic can lag the bus by one cell,
 * so the neighbours of every cell are included.
 */
export function topicsFor(routes: string[], points: Array<[number, number]>): string[] {
  const cells = new Set<string>();
  for (const [lat, lon] of points) {
    const [a, b] = cellIndex(lat, lon);
    for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) cells.add(`${pad(a + da)}-${pad(b + db)}`);
  }
  if (cells.size * routes.length > MAX_CELL_FILTERS) return routes.map(route => `${TOPIC_ROOT}/+/${route}/#`);
  return [...cells].flatMap(cell => routes.map(route => `${TOPIC_ROOT}/${cell}/${route}/#`));
}

/** Listens to the topics for `durationMs` and returns every position heard. Resolves empty when the feed is unreachable. */
export function listen(topics: string[], durationMs: number): Promise<BusSample[]> {
  return new Promise(resolve => {
    const samples: BusSample[] = [];
    if (topics.length === 0) { resolve(samples); return; }
    const client = mqtt.connect(BROKER_URL, { protocolVersion: 4, keepalive: 30, reconnectPeriod: 2000, connectTimeout: CONNECT_TIMEOUT_MS });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      client.end(true);
      resolve(samples);
    };
    client.on('connect', () => client.subscribe(topics, { qos: 0 }));
    client.on('error', finish);
    client.on('message', (topic, payload) => {
      try {
        const m = JSON.parse(payload.toString()) as { bus_body_no?: string; route_code?: string; latitude?: number; longitude?: number; next_gate?: string };
        if (!m.bus_body_no || typeof m.latitude !== 'number' || typeof m.longitude !== 'number') return;
        samples.push({ bus: m.bus_body_no, route: m.route_code ?? topic.split('/')[3] ?? '', lat: m.latitude, lon: m.longitude, next: m.next_gate ?? '', t: Date.now() });
      } catch {
        // A malformed message is simply skipped
      }
    });
    setTimeout(finish, durationMs);
  });
}
