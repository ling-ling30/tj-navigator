import { cleanText, type EnrichedStop } from '../../hooks/useStopAutocomplete';

export type PlaceKind =
  | 'mall'
  | 'street'
  | 'hospital'
  | 'education'
  | 'building'
  | 'area'
  | 'place';

export interface AddressStop extends EnrichedStop {
  placeKind: PlaceKind;
}

interface PhotonProperties {
  osm_type?: string;
  osm_id?: number;
  osm_key?: string;
  osm_value?: string;
  type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  countrycode?: string;
}

interface PhotonFeature {
  properties?: PhotonProperties;
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
// Greater Jakarta (Jabodetabek) bias & bounding box: [minLon, minLat, maxLon, maxLat]
const JKT_BIAS_LAT = -6.2088;
const JKT_BIAS_LON = 106.8456;
const JABODETABEK_BBOX = {
  minLon: 106.25,
  minLat: -6.85,
  maxLon: 107.3,
  maxLat: -5.85
};

const SESSION_CACHE_KEY = 'tj_addr_cache_v1';
const MAX_CACHE_ENTRIES = 40;
const memoryCache = new Map<string, AddressStop[]>();

function cacheKey(query: string): string {
  return cleanText(query).replace(/\s+/g, ' ');
}

function loadSessionCache(): Record<string, AddressStop[]> {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveToCache(key: string, items: AddressStop[]): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, items);

  try {
    const stored = loadSessionCache();
    stored[key] = items;
    const keys = Object.keys(stored);
    if (keys.length > MAX_CACHE_ENTRIES) {
      for (const oldKey of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) {
        delete stored[oldKey];
      }
    }
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(stored));
  } catch {}
}

export function getCachedAddressResults(query: string): AddressStop[] | null {
  const key = cacheKey(query);
  if (!key) return null;
  const mem = memoryCache.get(key);
  if (mem) return mem;

  const stored = loadSessionCache();
  if (Array.isArray(stored[key])) {
    memoryCache.set(key, stored[key]);
    return stored[key];
  }
  return null;
}

function isInsideJabodetabek(lat: number, lon: number): boolean {
  return (
    lat >= JABODETABEK_BBOX.minLat &&
    lat <= JABODETABEK_BBOX.maxLat &&
    lon >= JABODETABEK_BBOX.minLon &&
    lon <= JABODETABEK_BBOX.maxLon
  );
}

function formatHouseNumber(housenumber?: string): string {
  const trimmed = housenumber?.trim();
  if (!trimmed) return '';
  if (/^(no\.?|blok|kav\.?|rt\.?|rw\.?)\b/i.test(trimmed)) return trimmed;
  return `No. ${trimmed}`;
}

function cleanLocality(locality?: string): string {
  const trimmed = locality?.trim();
  if (!trimmed) return '';
  if (/^(rt|rw)[\s.\d/-]*$/i.test(trimmed)) return '';
  return trimmed;
}

function classifyPlace(props: PhotonProperties): PlaceKind {
  const key = props.osm_key;
  const val = props.osm_value;
  if (val === 'mall' || val === 'department_store' || val === 'supermarket') return 'mall';
  if (key === 'highway' || props.type === 'street') return 'street';
  if (val === 'hospital' || val === 'clinic') return 'hospital';
  if (val === 'university' || val === 'college' || val === 'school') return 'education';
  if (key === 'office' || val === 'commercial' || val === 'office' || val === 'apartments') return 'building';
  if (key === 'place' || props.type === 'district' || props.type === 'city' || props.type === 'locality') return 'area';
  return 'place';
}

function buildSubtitle(parts: Array<string | undefined>, title: string): string {
  const titleClean = cleanText(title);
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const raw of parts) {
    const val = raw?.trim();
    if (!val) continue;
    const norm = cleanText(val);
    if (!norm || norm === titleClean || seen.has(norm)) continue;
    seen.add(norm);
    kept.push(val);
  }
  return kept.join(', ');
}

function formatFeature(feature: PhotonFeature, idx: number): AddressStop | null {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties;
  if (!coords || coords.length < 2 || !props) return null;

  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (props.countrycode && props.countrycode.toUpperCase() !== 'ID') return null;
  if (!isInsideJabodetabek(lat, lon)) return null;

  const streetPart = [props.street?.trim(), formatHouseNumber(props.housenumber)].filter(Boolean).join(' ');
  const rawName = props.name?.trim();
  const title = rawName || streetPart || props.district?.trim() || props.city?.trim();
  if (!title) return null;

  const subtitle = buildSubtitle(
    [
      rawName ? streetPart : undefined,
      cleanLocality(props.locality),
      props.district,
      props.city || props.county
    ],
    title
  );

  const kind = classifyPlace(props);

  return {
    index: -1,
    id: `place:${props.osm_type ?? 'X'}:${props.osm_id ?? idx}:${lat.toFixed(5)},${lon.toFixed(5)}`,
    name: title,
    lat,
    lon,
    mode: 0,
    isCustomPoint: true,
    customLabel: title,
    description: subtitle || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    placeKind: kind
  };
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<AddressStop[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const key = cacheKey(trimmed);
  const cached = getCachedAddressResults(trimmed);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: trimmed,
    lat: String(JKT_BIAS_LAT),
    lon: String(JKT_BIAS_LON),
    bbox: `${JABODETABEK_BBOX.minLon},${JABODETABEK_BBOX.minLat},${JABODETABEK_BBOX.maxLon},${JABODETABEK_BBOX.maxLat}`,
    limit: '8'
  });

  const res = await fetch(`${PHOTON_ENDPOINT}?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Address lookup failed (${res.status})`);
  }

  const data = (await res.json()) as PhotonResponse;
  const features = Array.isArray(data.features) ? data.features : [];
  const deduped: AddressStop[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < features.length; i++) {
    const item = formatFeature(features[i], i);
    if (!item) continue;
    const dedupeKey = `${cleanText(item.name)}@${item.lat.toFixed(4)},${item.lon.toFixed(4)}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    deduped.push(item);
  }

  saveToCache(key, deduped);
  return deduped;
}
