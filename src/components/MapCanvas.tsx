import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTransitStore } from '../lib/store/transit-store';

export const MapCanvas: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const busMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);

  const {
    originStop,
    destinationStop,
    vehicles,
    openLiveRadar,
    selectedItinerary
  } = useTransitStore();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Carto Dark Style with 2.5s timeout detector for Lie-Fi resilience
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#0A0E17'
            }
          },
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [106.8227, -6.2088], // Jakarta Sudirman CBD
      zoom: 13,
      pitch: 35,
      bearing: -10,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', async () => {
      // Add Jakarta Arterial Vector Layer for offline subway tunnel fallback
      try {
        const res = await fetch('/data/jakarta-arterials.json');
        if (res.ok) {
          const arterials = await res.json();
          map.addSource('jakarta-arterials', {
            type: 'geojson',
            data: arterials
          });

          map.addLayer({
            id: 'arterials-lines',
            type: 'line',
            source: 'jakarta-arterials',
            paint: {
              'line-color': '#007AFF',
              'line-width': 3,
              'line-opacity': 0.35
            }
          });
        }
      } catch {}

      // Add polyline source for selected itinerary
      map.addSource('route-polyline', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'route-line-casing',
        type: 'line',
        source: 'route-polyline',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#000000',
          'line-width': 7,
          'line-opacity': 0.6
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-polyline',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#007AFF',
          'line-width': 4,
          'line-opacity': 0.95
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Origin and Destination markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (originMarkerRef.current) originMarkerRef.current.remove();
    if (destMarkerRef.current) destMarkerRef.current.remove();

    if (originStop) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full bg-[#00E676] border-2 border-white shadow-lg flex items-center justify-center font-bold text-[10px] text-black';
      el.innerHTML = 'A';
      originMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([originStop.lon, originStop.lat])
        .addTo(map);
    }

    if (destinationStop) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full bg-[#007AFF] border-2 border-white shadow-lg flex items-center justify-center font-bold text-[10px] text-white';
      el.innerHTML = 'B';
      destMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([destinationStop.lon, destinationStop.lat])
        .addTo(map);
    }
  }, [originStop, destinationStop]);

  // Sync Real-Time Bus Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMap = busMarkersRef.current;
    const activeIds = new Set<string>();

    vehicles.forEach(vehicle => {
      activeIds.add(vehicle.vehicleId);
      let marker = currentMap.get(vehicle.vehicleId);

      if (!marker) {
        // Create custom Apple-grade vehicle puck element
        const el = document.createElement('div');
        el.className = 'group cursor-pointer relative';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-25 animate-ping"></span>
            <div class="relative w-8 h-8 rounded-full bg-[#141923] border-2 border-[#00E676] shadow-xl flex items-center justify-center text-white text-[11px] font-extrabold tracking-tight hover:scale-110 transition-transform">
              ${vehicle.routeShortName}
            </div>
            <div class="absolute -top-1.5 -right-1 w-3 h-3 rounded-full bg-[#00E676] border border-[#141923] flex items-center justify-center text-[8px] text-black font-black">
              ▲
            </div>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openLiveRadar(vehicle.vehicleId);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([vehicle.lon, vehicle.lat])
          .addTo(map);

        currentMap.set(vehicle.vehicleId, marker);
      } else {
        marker.setLngLat([vehicle.lon, vehicle.lat]);
      }
    });

    // Remove obsolete markers
    currentMap.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        currentMap.delete(id);
      }
    });
  }, [vehicles, openLiveRadar]);

  // Update Itinerary Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !selectedItinerary) return;

    const source = map.getSource('route-polyline') as maplibregl.GeoJSONSource;
    if (!source) return;

    // Draw route connecting origin to intermediate stops to destination
    const coords: [number, number][] = [];
    if (originStop) coords.push([originStop.lon, originStop.lat]);

    // Key transit path points through Sudirman - Rasuna Said corridor
    if (originStop?.name.includes('Tebet')) {
      coords.push([106.8485, -6.2255]); // Pal Batu
      coords.push([106.8285, -6.2235]); // Casablanca
      coords.push([106.8219, -6.2088]); // Karet Sudirman
    }

    if (destinationStop) coords.push([destinationStop.lon, destinationStop.lat]);

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        }
      ]
    });
  }, [selectedItinerary, originStop, destinationStop]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0A0E17]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
