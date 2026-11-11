import { openDB, type IDBPDatabase } from 'idb';
import type { CompiledTransitNetwork } from '../../types/transit';

const DB_NAME = 'tj_navigator_store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('network')) {
          db.createObjectStore('network');
        }
        if (!db.objectStoreNames.contains('active_journey')) {
          db.createObjectStore('active_journey');
        }
      }
    });
  }
  return dbPromise;
}

let loadNetworkPromise: Promise<CompiledTransitNetwork> | null = null;

export function loadTransitNetwork(): Promise<CompiledTransitNetwork> {
  if (loadNetworkPromise) {
    return loadNetworkPromise;
  }

  loadNetworkPromise = (async () => {
    const db = await getDB();
    
    // 1. Try to read cached network from IndexedDB
    const cached = await db.get('network', 'cached_network');
    if (cached && cached.data) {
      if (import.meta.env?.DEV) {
        console.log('[Storage] Hydrated transit network from IndexedDB.');
      }
      // Trigger background version check without blocking UI
      checkNetworkUpdateInBackground(cached.version).catch(console.warn);
      return cached.data;
    }

    // 2. First visit: fetch static JSON
    if (import.meta.env?.DEV) {
      console.log('[Storage] Fetching transit network bundle on first visit...');
    }
    const res = await fetch('/data/jakarta-transit-network.json');
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching transit network`);
    const data: CompiledTransitNetwork = await res.json();

    // 3. Store in IndexedDB
    await db.put('network', { version: data.version, data, cachedAt: Date.now() }, 'cached_network');
    return data;
  })();

  return loadNetworkPromise;
}

async function checkNetworkUpdateInBackground(currentVersion: string) {
  try {
    const res = await fetch('/data/version.json', { cache: 'no-store' });
    if (!res.ok) return;
    const meta = await res.json();
    if (meta.graphVersion && meta.graphVersion !== currentVersion) {
      if (import.meta.env?.DEV) {
        console.log(`[Storage] New transit graph version detected (${meta.graphVersion}). Refreshing in background...`);
      }
      const networkRes = await fetch('/data/jakarta-transit-network.json');
      if (networkRes.ok) {
        const freshData: CompiledTransitNetwork = await networkRes.json();
        const db = await getDB();
        await db.put('network', { version: meta.graphVersion, data: freshData, cachedAt: Date.now() }, 'cached_network');
        if (import.meta.env?.DEV) {
          console.log('[Storage] Background graph update complete.');
        }
      }
    }
  } catch {}
}
