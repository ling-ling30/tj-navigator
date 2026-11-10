import React from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import { ArrowDownUp, Search, Radio, Train, Bus, MapPin, Sparkles } from 'lucide-react';

export const SearchCard: React.FC = () => {
  const {
    originStop,
    destinationStop,
    swapStops,
    calculateJourney,
    openLiveRadar,
    setIsSearchingOrigin,
    setIsSearchingDest,
    isComputingRoute,
    setScreen,
    vehicles
  } = useTransitStore();

  const handleSearch = async () => {
    await calculateJourney();
    setScreen('RESULTS');
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 z-30 max-w-md mx-auto">
      <div className="bg-[#141923]/90 backdrop-blur-2xl border border-white/12 rounded-[32px] p-4 shadow-2xl shadow-black/80">
        {/* Header tag */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-bold tracking-wider uppercase text-white/50">
            Jakarta Public Transit Planner
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{vehicles.length} buses live on radar</span>
          </div>
        </div>

        {/* Input cluster */}
        <div className="relative bg-[#1F2633]/80 border border-white/8 rounded-2xl p-2.5 space-y-2">
          {/* Origin */}
          <div
            onClick={() => setIsSearchingOrigin(true)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Train className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">
                Departure (From)
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {originStop?.name || 'Select Departure Station'}
              </div>
            </div>
          </div>

          {/* Divider with Swap Button */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="w-full border-t border-white/8" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                swapStops();
              }}
              className="absolute w-8 h-8 rounded-full bg-[#141923] border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:scale-110 active:rotate-180 transition-all shadow-md"
              title="Swap origin and destination"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination */}
          <div
            onClick={() => setIsSearchingDest(true)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Bus className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400/80">
                Destination (To)
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {destinationStop?.name || 'Select Destination Halte'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <button
            onClick={handleSearch}
            disabled={isComputingRoute}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{isComputingRoute ? 'Routing...' : 'Find Routes'}</span>
          </button>

          <button
            onClick={() => openLiveRadar()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Live Radar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
