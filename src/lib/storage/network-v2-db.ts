/** Loads graph v2: from IndexedDB when cached (works offline), refreshed in the background when a new build is out. */
import type { NetworkV2 } from '../../types/network-v2';
import { getDB } from './transit-db';

const NETWORK_URL = '/data/network-v2.json';
const VERSION_URL = '/data/network-v2.version.json';
const CACHE_KEY = 'cached_network_v2';

interface CachedNetwork { stamp: string; data: NetworkV2 }

let loading: Promise<NetworkV2> | null = null;

async function fetchNetwork(): Promise<NetworkV2> {
  const res = await fetch(NETWORK_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching the transit network`);
  return res.json();
}

async function store(data: NetworkV2): Promise<void> {
  const db = await getDB();
  const record: CachedNetwork = { stamp: data.generatedAt, data };
  await db.put('network', record, CACHE_KEY);
}

async function refreshInBackground(currentStamp: string): Promise<void> {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const meta = (await res.json()) as { generatedAt?: string };
    if (meta.generatedAt && meta.generatedAt !== currentStamp) await store(await fetchNetwork());
  } catch {
    // Offline or blocked: the cached graph stays in use
  }
}

export function loadNetworkV2(): Promise<NetworkV2> {
  if (loading) return loading;
  loading = (async () => {
    let cached: CachedNetwork | undefined;
    try {
      cached = await (await getDB()).get('network', CACHE_KEY);
    } catch {
      // IndexedDB unavailable (private window): fall through to the network
    }
    if (cached?.data) {
      void refreshInBackground(cached.stamp);
      return cached.data;
    }
    const data = await fetchNetwork();
    store(data).catch(() => undefined);
    return data;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}
