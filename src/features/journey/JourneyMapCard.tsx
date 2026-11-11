import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Focus, Footprints, Loader2, Map as MapIcon, Maximize2, Minimize2, WifiOff } from 'lucide-react';
import { useT } from '../../hooks/useT';
import { shapeOf, type PatternShape } from '../../lib/live/shapes';
import { TransitMode, type Itinerary, type Leg, type StopEntity } from '../../types/transit';

export interface JourneyMapCardProps {
  itinerary: Itinerary;
  originStop: StopEntity | null;
  destinationStop: StopEntity | null;
  originName: string;
  destName: string;
}

interface ResolvedIntermediateStop {
  lat: number;
  lon: number;
  name?: string;
}

interface ResolvedLeg {
  index: number;
  leg: Leg;
  points: L.LatLngTuple[];
  start?: L.LatLngTuple;
  end?: L.LatLngTuple;
  intermediates: ResolvedIntermediateStop[];
  isDegenerateWalk: boolean;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const JAKARTA_CENTER: L.LatLngTuple = [-6.2088, 106.8456];

function getResolvedTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLegColor(leg: Leg, theme: 'light' | 'dark'): string {
  if (leg.type === 'WALK') {
    if (leg.isUncoveredSegment) return theme === 'dark' ? '#FBBF24' : '#D97706';
    return theme === 'dark' ? '#94A3B8' : '#64748B';
  }
  switch (leg.mode) {
    case TransitMode.BRT:
    case TransitMode.NON_BRT:
      return theme === 'dark' ? '#3898FF' : '#0055A5';
    case TransitMode.COMMUTER_RAIL:
      return theme === 'dark' ? '#F43F5E' : '#C8102E';
    case TransitMode.MRT:
      return theme === 'dark' ? '#60A5FA' : '#002F6C';
    case TransitMode.LRT:
      return theme === 'dark' ? '#FB923C' : '#F58220';
    case TransitMode.MIKROTRANS:
      return theme === 'dark' ? '#22D3EE' : '#00A3E0';
    default:
      return leg.routeColor || (theme === 'dark' ? '#38BDF8' : '#0055A5');
  }
}

function samePoint(a: L.LatLngTuple, b: L.LatLngTuple): boolean {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

function appendPoint(out: L.LatLngTuple[], pt: L.LatLngTuple) {
  if (out.length === 0 || !samePoint(out[out.length - 1], pt)) {
    out.push(pt);
  }
}

function buildFallbackCoords(
  legs: Leg[],
  originStop: StopEntity | null,
  destinationStop: StopEntity | null
): Array<{ start?: L.LatLngTuple; end?: L.LatLngTuple }> {
  const originCoord: L.LatLngTuple | undefined = originStop ? [originStop.lat, originStop.lon] : undefined;
  const destCoord: L.LatLngTuple | undefined = destinationStop ? [destinationStop.lat, destinationStop.lon] : undefined;

  const coords = legs.map((leg, idx) => {
    const start: L.LatLngTuple | undefined =
      leg.fromLat !== undefined && leg.fromLon !== undefined
        ? [leg.fromLat, leg.fromLon]
        : idx === 0
          ? originCoord
          : undefined;
    const end: L.LatLngTuple | undefined =
      leg.toLat !== undefined && leg.toLon !== undefined
        ? [leg.toLat, leg.toLon]
        : idx === legs.length - 1
          ? destCoord
          : undefined;
    return { start, end };
  });

  // Stitch adjacent walk connectors using neighbouring transit stops when endpoints omit coordinates
  for (let i = 0; i < coords.length; i++) {
    if (!coords[i].start && i > 0 && coords[i - 1].end) {
      coords[i].start = coords[i - 1].end;
    }
    if (!coords[i].end && i + 1 < coords.length && coords[i + 1].start) {
      coords[i].end = coords[i + 1].start;
    }
  }
  return coords;
}

function sliceShapeSegment(
  shape: PatternShape,
  boardStop: number,
  alightStop: number,
  intermediateNames: string[] | undefined,
  collectNames: boolean
): { points: L.LatLngTuple[]; intermediates: ResolvedIntermediateStop[] } {
  const points: L.LatLngTuple[] = [];
  const intermediates: ResolvedIntermediateStop[] = [];
  if (
    boardStop < 0 ||
    alightStop < 0 ||
    boardStop >= shape.stopVertex.length ||
    alightStop >= shape.stopVertex.length
  ) {
    return { points, intermediates };
  }

  const vStart = shape.stopVertex[boardStop];
  const vEnd = shape.stopVertex[alightStop];
  if (vStart < 0 || vEnd < 0 || vStart >= shape.lat.length || vEnd >= shape.lat.length) {
    return { points, intermediates };
  }

  const step = vStart <= vEnd ? 1 : -1;
  for (let v = vStart; ; v += step) {
    appendPoint(points, [shape.lat[v], shape.lon[v]]);
    if (v === vEnd) break;
  }

  const stopStep = boardStop <= alightStop ? 1 : -1;
  let nameIdx = 0;
  for (let s = boardStop + stopStep; s !== alightStop; s += stopStep) {
    const sv = shape.stopVertex[s];
    if (sv >= 0 && sv < shape.lat.length) {
      intermediates.push({
        lat: shape.lat[sv],
        lon: shape.lon[sv],
        name: collectNames ? intermediateNames?.[nameIdx] : undefined
      });
    }
    nameIdx++;
  }

  return { points, intermediates };
}

function pillTitle(leg: Leg, walkLabel: string): string {
  if (leg.type === 'WALK') {
    const dist = leg.distanceMeters >= 1000
      ? `${(leg.distanceMeters / 1000).toFixed(1)}km`
      : `${Math.round(leg.distanceMeters)}m`;
    return `${walkLabel} ${dist}`;
  }
  return String(leg.routeShortName || leg.lineNames?.[0] || 'Transit');
}

export const JourneyMapCard: React.FC<JourneyMapCardProps> = ({
  itinerary,
  originStop,
  destinationStop,
  originName,
  destName
}) => {
  const { t } = useT();
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const lastFittedKeyRef = useRef<string>('');
  const tileStatsRef = useRef<{ loaded: number; failed: number }>({ loaded: 0, failed: 0 });

  const [theme, setTheme] = useState<'light' | 'dark'>(getResolvedTheme);
  const [resolvedLegs, setResolvedLegs] = useState<ResolvedLeg[]>([]);
  const [shapesLoading, setShapesLoading] = useState(false);
  const [focusedLegIdx, setFocusedLegIdx] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tilesOffline, setTilesOffline] = useState(false);

  const routeKey = useMemo(
    () =>
      `${itinerary.id}|${originName}|${destName}|${itinerary.departureTime}|${itinerary.legs.map((l) => `${l.fromStopName}->${l.toStopName}`).join(';')}`,
    [itinerary, originName, destName]
  );

  // Sync Leaflet basemap tiles & polyline palette with active light/dark theme
  useEffect(() => {
    const update = () => setTheme(getResolvedTheme());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', update);
    return () => {
      observer.disconnect();
      mq?.removeEventListener?.('change', update);
    };
  }, []);

  // Resolve exact route shapes lazily from shapes-v2.json (falls back smoothly to endpoints)
  useEffect(() => {
    let cancelled = false;
    setFocusedLegIdx(null);

    const endpoints = buildFallbackCoords(itinerary.legs, originStop, destinationStop);
    const patternIds = new Set<number>();
    for (const leg of itinerary.legs) {
      if (leg.type !== 'TRANSIT') continue;
      const segs = leg.shapeSegments?.length
        ? leg.shapeSegments
        : leg.live
          ? [{ pattern: leg.live.pattern, boardStop: leg.live.boardStop, alightStop: leg.live.alightStop }]
          : [];
      for (const seg of segs) patternIds.add(seg.pattern);
    }

    const resolveAll = async () => {
      const shapeMap = new Map<number, PatternShape | null>();
      if (patternIds.size > 0) {
        setShapesLoading(true);
        const entries = await Promise.all(
          Array.from(patternIds).map(async (pat) => [pat, await shapeOf(pat).catch(() => null)] as const)
        );
        if (cancelled) return;
        for (const [pat, shape] of entries) shapeMap.set(pat, shape);
        setShapesLoading(false);
      } else {
        setShapesLoading(false);
      }

      const built: ResolvedLeg[] = itinerary.legs.map((leg, index) => {
        const ep = endpoints[index];
        if (leg.type === 'WALK') {
          const pts: L.LatLngTuple[] = [];
          if (ep.start) appendPoint(pts, ep.start);
          if (ep.end) appendPoint(pts, ep.end);
          const isDegenerateWalk =
            pts.length < 2 ||
            (Boolean(leg.isPaidAreaTransfer) && leg.distanceMeters < 15) ||
            (pts.length === 2 && samePoint(pts[0], pts[1]));
          return {
            index,
            leg,
            points: pts,
            start: ep.start,
            end: ep.end,
            intermediates: [],
            isDegenerateWalk
          };
        }

        const segs = leg.shapeSegments?.length
          ? leg.shapeSegments
          : leg.live
            ? [{ pattern: leg.live.pattern, boardStop: leg.live.boardStop, alightStop: leg.live.alightStop }]
            : [];

        const pts: L.LatLngTuple[] = [];
        const intermediates: ResolvedIntermediateStop[] = [];
        const singleSegment = segs.length === 1;

        for (const seg of segs) {
          const shape = shapeMap.get(seg.pattern);
          if (shape) {
            const sliced = sliceShapeSegment(
              shape,
              seg.boardStop,
              seg.alightStop,
              leg.intermediateStopNames,
              singleSegment
            );
            for (const pt of sliced.points) appendPoint(pts, pt);
            intermediates.push(...sliced.intermediates);
          }
        }

        if (pts.length < 2) {
          if (ep.start) appendPoint(pts, ep.start);
          if (ep.end) appendPoint(pts, ep.end);
        }

        return {
          index,
          leg,
          points: pts,
          start: ep.start ?? pts[0],
          end: ep.end ?? pts[pts.length - 1],
          intermediates,
          isDegenerateWalk: false
        };
      });

      if (!cancelled) setResolvedLegs(built);
    };

    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [itinerary, originStop, destinationStop]);

  const computeBounds = useCallback(
    (targetLegIdx: number | null): L.LatLngBounds => {
      const bounds = L.latLngBounds([]);
      const source = targetLegIdx === null
        ? resolvedLegs
        : resolvedLegs.filter((rl) => rl.index === targetLegIdx);
      for (const rl of source) {
        for (const pt of rl.points) bounds.extend(pt);
        if (rl.start) bounds.extend(rl.start);
        if (rl.end) bounds.extend(rl.end);
      }
      if (!bounds.isValid()) {
        if (originStop) bounds.extend([originStop.lat, originStop.lon]);
        if (destinationStop) bounds.extend([destinationStop.lat, destinationStop.lon]);
      }
      return bounds;
    },
    [resolvedLegs, originStop, destinationStop]
  );

  // Initialize Leaflet map once
  useEffect(() => {
    const el = mapHostRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: JAKARTA_CENTER,
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix('');

    const tileLayer = L.tileLayer(OSM_TILES, {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });

    tileLayer.on('tileload', () => {
      tileStatsRef.current.loaded += 1;
      setTilesOffline(false);
    });
    tileLayer.on('tileerror', () => {
      tileStatsRef.current.failed += 1;
      if (tileStatsRef.current.loaded === 0 && tileStatsRef.current.failed >= 4) {
        setTilesOffline(true);
      }
    });

    tileLayer.addTo(map);
    const routeLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    routeLayerRef.current = routeLayer;

    // Keep Leaflet viewport and tile coverage synced smoothly through height toggles
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize({ animate: false, pan: false });
          })
        : null;
    resizeObserver?.observe(el);

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      lastFittedKeyRef.current = '';
    };
  }, []);

  // Re-center bounds cleanly after container height transition finishes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize({ animate: false });
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      const bounds = computeBounds(focusedLegIdx);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: false });
      }
    }, 240);
    return () => window.clearTimeout(timer);
  }, [isExpanded, computeBounds, focusedLegIdx]);

  // Draw polylines and stop markers cleanly whenever route geometry, focus, or theme updates
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer || resolvedLegs.length === 0) return;

    layer.clearLayers();
    const casingColor = theme === 'dark' ? '#090D16' : '#FFFFFF';
    const hasFocus = focusedLegIdx !== null;

    // Paint unfocused legs beneath focused leg so active segment sits cleanly on top
    const drawOrder = [...resolvedLegs].sort((a, b) => {
      if (a.index === focusedLegIdx) return 1;
      if (b.index === focusedLegIdx) return -1;
      return a.index - b.index;
    });

    for (const rl of drawOrder) {
      if (rl.points.length < 2 || rl.isDegenerateWalk) continue;
      const isFocused = rl.index === focusedLegIdx;
      const isDimmed = hasFocus && !isFocused;
      const color = getLegColor(rl.leg, theme);
      const isWalk = rl.leg.type === 'WALK';

      // High-contrast outer casing on transit routes
      if (!isWalk) {
        L.polyline(rl.points, {
          color: casingColor,
          weight: isFocused ? 9 : 7.5,
          opacity: isDimmed ? 0.25 : 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false
        }).addTo(layer);
      }

      const line = L.polyline(rl.points, {
        color,
        weight: isWalk ? (isFocused ? 4.5 : 3.5) : isFocused ? 5.5 : 4.25,
        opacity: isDimmed ? 0.3 : 1,
        dashArray: isWalk ? '6 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layer);

      const label = pillTitle(rl.leg, t('map.walk_label'));
      line.bindTooltip(
        `<div style="font-weight:600;font-size:12px;">${escapeHtml(label)}</div>` +
        `<div style="font-size:11px;opacity:0.85;">${escapeHtml(rl.leg.fromStopName)} &rarr; ${escapeHtml(rl.leg.toStopName)}</div>`,
        { sticky: true, direction: 'top' }
      );
      line.on('click', () => {
        setFocusedLegIdx((prev) => (prev === rl.index ? null : rl.index));
      });

      // Plot intermediate stop micro-markers along a focused transit leg
      if (isFocused && rl.intermediates.length > 0) {
        for (const mid of rl.intermediates) {
          const midDot = L.circleMarker([mid.lat, mid.lon], {
            radius: 3.5,
            color,
            weight: 2,
            fillColor: casingColor,
            fillOpacity: 1
          }).addTo(layer);
          if (mid.name) {
            midDot.bindTooltip(escapeHtml(mid.name), { direction: 'top', offset: [0, -4] });
          }
        }
      }
    }

    // Plot boarding / alighting / transfer stations
    const seenStops = new Set<string>();
    for (const rl of resolvedLegs) {
      if (rl.leg.type !== 'TRANSIT') continue;
      const color = getLegColor(rl.leg, theme);
      const isDimmed = hasFocus && rl.index !== focusedLegIdx;
      const stopPairs: Array<{ coord?: L.LatLngTuple; name: string; time: string; role: string }> = [
        { coord: rl.start, name: rl.leg.fromStopName, time: rl.leg.departureTime, role: pillTitle(rl.leg, t('map.walk_label')) },
        { coord: rl.end, name: rl.leg.toStopName, time: rl.leg.arrivalTime, role: pillTitle(rl.leg, t('map.walk_label')) }
      ];

      for (const sp of stopPairs) {
        if (!sp.coord) continue;
        const key = `${sp.coord[0].toFixed(4)},${sp.coord[1].toFixed(4)}:${sp.name}`;
        if (seenStops.has(key)) continue;
        seenStops.add(key);

        const dot = L.circleMarker(sp.coord, {
          radius: 5.5,
          color,
          weight: 2.5,
          fillColor: theme === 'dark' ? '#131A29' : '#FFFFFF',
          fillOpacity: 1,
          opacity: isDimmed ? 0.4 : 1
        }).addTo(layer);

        dot.bindPopup(
          `<div style="font-size:12px;line-height:1.4;">` +
          `<strong>${escapeHtml(sp.name)}</strong><br/>` +
          `<span style="opacity:0.78;">${escapeHtml(sp.role)} &middot; ${escapeHtml(sp.time)}</span>` +
          `</div>`
        );
      }
    }

    // Origin & Destination beacons always render on top
    const firstPoint = resolvedLegs[0]?.start ?? (originStop ? [originStop.lat, originStop.lon] as L.LatLngTuple : undefined);
    const lastLeg = resolvedLegs[resolvedLegs.length - 1];
    const lastPoint = lastLeg?.end ?? (destinationStop ? [destinationStop.lat, destinationStop.lon] as L.LatLngTuple : undefined);

    if (firstPoint) {
      const originDot = L.circleMarker(firstPoint, {
        radius: 7.5,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#10B981',
        fillOpacity: 1
      }).addTo(layer);
      originDot.bindPopup(
        `<div style="font-size:12px;"><strong>${escapeHtml(t('map.origin_label'))}:</strong> ${escapeHtml(originName)}</div>`
      );
    }

    if (lastPoint) {
      const destDot = L.circleMarker(lastPoint, {
        radius: 7.5,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#EF4444',
        fillOpacity: 1
      }).addTo(layer);
      destDot.bindPopup(
        `<div style="font-size:12px;"><strong>${escapeHtml(t('map.destination_label'))}:</strong> ${escapeHtml(destName)}</div>`
      );
    }

    // Fit full route once per route change without fighting manual zoom on theme changes
    if (lastFittedKeyRef.current !== routeKey) {
      lastFittedKeyRef.current = routeKey;
      const bounds = computeBounds(null);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15, animate: false });
      }
    }
  }, [resolvedLegs, focusedLegIdx, theme, originStop, destinationStop, originName, destName, routeKey, computeBounds, t]);

  // Fly/pan when user clicks a specific leg pill (or clears focus)
  const prevFocusRef = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || prevFocusRef.current === focusedLegIdx) return;
    prevFocusRef.current = focusedLegIdx;

    const bounds = computeBounds(focusedLegIdx);
    if (!bounds.isValid()) return;
    const animate = !prefersReducedMotion();
    map.fitBounds(bounds, {
      padding: focusedLegIdx === null ? [26, 26] : [36, 36],
      maxZoom: 15,
      animate
    });
  }, [focusedLegIdx, computeBounds]);

  const handleFitRoute = () => {
    setFocusedLegIdx(null);
    const map = mapRef.current;
    if (!map) return;
    const bounds = computeBounds(null);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15, animate: !prefersReducedMotion() });
    }
  };

  const hasAnyCoords =
    Boolean(originStop) ||
    Boolean(destinationStop) ||
    itinerary.legs.some((l) => l.fromLat !== undefined || l.toLat !== undefined);

  if (!hasAnyCoords) return null;

  const focusableLegs = resolvedLegs.filter((rl) => !rl.isDegenerateWalk && rl.points.length >= 2);

  return (
    <section
      aria-label={t('map.title')}
      className="rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)] overflow-hidden reveal-enter"
    >
      {/* Map Header Controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 min-w-0">
          <MapIcon className="w-4 h-4 text-[var(--action-primary)] shrink-0" aria-hidden="true" />
          <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">
            {t('map.title')}
          </span>
          {shapesLoading && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]"
              aria-label={t('map.loading_shape')}
            >
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            </span>
          )}
          {tilesOffline && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-badge)] bg-[var(--surface-raised)] text-[11px] text-[var(--text-muted)]">
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              <span>{t('map.offline_tiles')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleFitRoute}
            className="tactile-press inline-flex items-center gap-1 h-7 px-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--ground)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
            <span>{t('map.fit_route')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-label={isExpanded ? t('map.collapse') : t('map.expand')}
            aria-expanded={isExpanded}
            className="tactile-press inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--ground)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] cursor-pointer"
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive Leg Filter Pills */}
      {focusableLegs.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] bg-[var(--ground)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFocusedLegIdx(null)}
            className={`tactile-press shrink-0 h-7 px-2.5 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
              focusedLegIdx === null
                ? 'bg-[var(--action-primary)] text-[var(--text-inverse)] border-[var(--action-primary)]'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
            }`}
          >
            {t('map.all_legs')}
          </button>

          {focusableLegs.map((rl) => {
            const active = focusedLegIdx === rl.index;
            const color = getLegColor(rl.leg, theme);
            const isWalk = rl.leg.type === 'WALK';
            return (
              <button
                key={rl.index}
                type="button"
                onClick={() => setFocusedLegIdx((prev) => (prev === rl.index ? null : rl.index))}
                className={`tactile-press shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-semibold border tabular-nums transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--action-primary)] ring-1 ring-[var(--action-primary)]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}
              >
                {isWalk ? (
                  <Footprints className="w-3 h-3 shrink-0" style={{ color }} aria-hidden="true" />
                ) : (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                )}
                <span>{pillTitle(rl.leg, t('map.walk_label'))}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Map Viewport (isolated stacking context prevents Leaflet panes overlapping sticky header) */}
      <div
        className={`tj-map-host ${theme === 'dark' ? 'tj-map-dark' : ''} relative isolate z-0 w-full transition-[height] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${
          isExpanded ? 'h-[380px]' : 'h-[248px]'
        }`}
      >
        <div ref={mapHostRef} className="w-full h-full tj-map-grid" />
      </div>
    </section>
  );
};
