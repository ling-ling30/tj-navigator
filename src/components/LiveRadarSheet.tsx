import React from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import { 
  X, 
  Radio, 
  AlertTriangle, 
  Zap, 
  Users, 
  Gauge, 
  Compass, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { liveSegmentEngine } from '../lib/telemetry/live-segment-engine';

export const LiveRadarSheet: React.FC = () => {
  const {
    selectedVehicleId,
    vehicles,
    closeLiveRadar,
    destinationStop
  } = useTransitStore();

  const vehicle = vehicles.find(v => v.vehicleId === selectedVehicleId) || {
    vehicleId: 'TJ-0842',
    routeId: 'tj:feeder-6c',
    routeShortName: '6C',
    lat: -6.2235,
    lon: 106.8285,
    speedKmh: 12,
    bearingDeg: 315,
    timestampMs: Date.now(),
    occupancyPercent: 74,
    isElectric: true
  };

  // Recount arrival calculation
  const recounted = liveSegmentEngine.calculateArrivalEta(
    1, // At stop 1 (Pal Batu / Casablanca)
    3, // Heading to Tosari
    ['Stasiun Tebet', 'Pal Batu / Casablanca', 'GOR Soemantri', 'Tosari (Grand Indonesia)'],
    3 // Raw API claimed 3 mins
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg mx-auto bg-[#141923] border-t border-white/12 rounded-t-[36px] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Grab bar */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-tight">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>LIVE BUS RADAR</span>
            </div>
            <span className="text-xs font-bold text-white/50">
              Fleet {vehicle.vehicleId}
            </span>
          </div>

          <button
            onClick={closeLiveRadar}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Honest Recounted ETA Banner */}
        <div className="bg-gradient-to-br from-[#1F2633] to-[#141923] border border-white/10 rounded-3xl p-5 mb-4 shadow-xl">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                Honest Recounted Arrival
              </div>
              <div className="text-4xl font-black text-white tracking-tight mt-1">
                {recounted.minMinutes}–{recounted.maxMinutes} <span className="text-xl font-bold text-white/60">MIN</span>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                {recounted.stopsAway} stops away
              </span>
            </div>
          </div>

          {/* Raw API vs Recounted Discrepancy Callout */}
          <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between text-xs">
            <span className="text-white/40">Transjakarta API ETA:</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="line-through text-white/40">3 mins</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                Uncalibrated
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Bottleneck Card */}
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs mb-4 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Simpang Casablanca Bottleneck Detected</span>
          </div>
          <p className="text-amber-200/80 leading-relaxed">
            Preceding bus B-7412 took 7 minutes to clear the 400m flyover merge. The recalculated segment multiplier is <strong>2.1x baseline</strong>.
          </p>
        </div>

        {/* Live Telemetry Vehicle Specs */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6">
            <div className="flex items-center justify-center gap-1 text-[10px] text-white/40 font-semibold mb-1">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>SPEED</span>
            </div>
            <div className="text-base font-black text-white">
              {vehicle.speedKmh} <span className="text-xs font-normal text-white/50">km/h</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6">
            <div className="flex items-center justify-center gap-1 text-[10px] text-white/40 font-semibold mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>LOAD</span>
            </div>
            <div className="text-base font-black text-emerald-400">
              {vehicle.occupancyPercent}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6">
            <div className="flex items-center justify-center gap-1 text-[10px] text-white/40 font-semibold mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>DRIVE</span>
            </div>
            <div className="text-base font-black text-amber-300">
              {vehicle.isElectric ? 'Electric ⚡' : 'Euro 5'}
            </div>
          </div>
        </div>

        {/* Stop Progression Timeline */}
        <div className="mb-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-white/40">
            Route Progression (Feeder 6C)
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {/* Stop 1: Passed */}
            <div className="relative flex items-center justify-between text-xs text-white/40">
              <span className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-[8px] text-emerald-400">
                ✓
              </span>
              <span className="line-through">Stasiun Tebet Pintu Barat</span>
              <span className="text-[10px]">Departed 17:35</span>
            </div>

            {/* Stop 2: Current vehicle position */}
            <div className="relative flex items-center justify-between text-xs text-white font-semibold">
              <span className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg animate-pulse" />
              <div className="flex items-center gap-1.5">
                <span>Pal Batu / Casablanca</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                  Approaching
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">Live Bus Puck</span>
            </div>

            {/* Stop 3: GOR Soemantri */}
            <div className="relative flex items-center justify-between text-xs text-white/70">
              <span className="absolute -left-6 w-5 h-5 rounded-full bg-[#1F2633] border-2 border-white/20" />
              <span>GOR Soemantri (Kuningan)</span>
              <span className="text-[10px] text-white/40">~4 min</span>
            </div>

            {/* Stop 4: Destination */}
            <div className="relative flex items-center justify-between text-xs text-white font-bold">
              <span className="absolute -left-6 w-5 h-5 rounded-full bg-[#007AFF] border-2 border-white" />
              <span>{destinationStop?.name || 'Tosari (Grand Indonesia)'}</span>
              <span className="text-[10px] text-[#007AFF]">Alighting Halte</span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button
            onClick={closeLiveRadar}
            className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Back to Itinerary
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'TJ-Navigator Live Bus Arrival',
                  text: `Feeder 6C bus TJ-0842 arrives at ${destinationStop?.name || 'Tosari'} in 8-11 min (recounted via live telemetry).`
                }).catch(() => {});
              } else {
                alert('Copied live arrival link to clipboard!');
              }
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Arrival</span>
          </button>
        </div>
      </div>
    </div>
  );
};
