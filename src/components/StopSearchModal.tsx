import React, { useState, useMemo } from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import { Search, X, MapPin, Train, Bus, TramFront, Zap } from 'lucide-react';
import type { StopEntity } from '../types/transit';

interface StopSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stop: StopEntity) => void;
  title: string;
}

export const StopSearchModal: React.FC<StopSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title
}) => {
  const { network } = useTransitStore();
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<number | null>(null);

  // Popular curated Jakarta transit stops
  const curatedStops = useMemo(() => [
    { name: 'Stasiun Tebet', id: 'krl:TEB', mode: 2, desc: 'KRL Commuterline Bogor Line' },
    { name: 'Tosari (Grand Indonesia)', id: 'tj:1-14', mode: 0, desc: 'Corridor 1 • Sudirman Promenade' },
    { name: 'Dukuh Atas TOD', id: 'mrt:DKA', mode: 3, desc: 'Multi-Modal Hub (KRL, MRT, LRT, BRT)' },
    { name: 'Stasiun Sudirman', id: 'krl:SUD', mode: 2, desc: 'Cikarang Loop Line' },
    { name: 'CSW 1 (ASEAN)', id: 'tj:1-4', mode: 0, desc: '5-Level Skywalk Interchange' },
    { name: 'Bundaran HI', id: 'mrt:BHI', mode: 3, desc: 'MRT North-South Terminal' },
    { name: 'Blok M Hub', id: 'tj:1-1', mode: 0, desc: 'Terminal Blok M Intercity & Feeder' },
    { name: 'Stasiun Manggarai', id: 'krl:MRI', mode: 2, desc: 'Central Commuterline Interchange' }
  ], []);

  const filteredStops = useMemo(() => {
    if (!network || !network.stops) return [];
    const q = query.trim().toLowerCase();

    // If query is empty, show curated stops mapped to real network indices
    if (!q) {
      return curatedStops.map(cs => {
        const idx = network.stops.findIndex(s => s[0] === cs.id || s[1].toLowerCase().includes(cs.name.toLowerCase()));
        if (idx !== -1) {
          const raw = network.stops[idx];
          return {
            index: idx,
            id: raw[0],
            name: raw[1],
            lat: raw[2],
            lon: raw[3],
            mode: raw[4] as any,
            desc: cs.desc
          };
        }
        return {
          index: 0,
          id: cs.id,
          name: cs.name,
          lat: -6.2088,
          lon: 106.8227,
          mode: cs.mode as any,
          desc: cs.desc
        };
      });
    }

    const matches: (StopEntity & { desc?: string })[] = [];
    for (let i = 0; i < network.stops.length; i++) {
      const s = network.stops[i];
      const name = s[1];
      const mode = s[4];

      if (modeFilter !== null && mode !== modeFilter) continue;

      if (name.toLowerCase().includes(q)) {
        matches.push({
          index: i,
          id: s[0],
          name: s[1],
          lat: s[2],
          lon: s[3],
          mode: mode as any
        });
        if (matches.length >= 25) break; // Keep UI snappy
      }
    }
    return matches;
  }, [network, query, modeFilter, curatedStops]);

  if (!isOpen) return null;

  const getModeIcon = (mode: number) => {
    switch (mode) {
      case 2: return <Train className="w-4 h-4 text-[#00A859]" />;
      case 3: return <TramFront className="w-4 h-4 text-[#EE3124]" />;
      case 4: return <Zap className="w-4 h-4 text-[#F58220]" />;
      default: return <Bus className="w-4 h-4 text-[#007AFF]" />;
    }
  };

  const getModeLabel = (mode: number) => {
    switch (mode) {
      case 0: return 'Transjakarta BRT';
      case 1: return 'Feeder / Non-BRT';
      case 2: return 'KRL Commuterline';
      case 3: return 'MRT Jakarta';
      case 4: return 'LRT Jabodebek';
      case 5: return 'Mikrotrans';
      default: return 'Transit Stop';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg mx-auto bg-[#141923] border-t border-white/10 rounded-t-[32px] p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300"
      >
        {/* Grab bar */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 8,200+ Jakarta stops, stations, or haltes..."
            autoFocus
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#1F2633] text-white placeholder-white/40 text-sm border border-white/10 focus:outline-none focus:border-[#007AFF] transition-colors"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mode Filter Pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setModeFilter(null)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              modeFilter === null ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            All Modes
          </button>
          <button
            onClick={() => setModeFilter(0)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              modeFilter === 0 ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Transjakarta BRT
          </button>
          <button
            onClick={() => setModeFilter(2)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              modeFilter === 2 ? 'bg-[#00A859] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            KRL Commuterline
          </button>
          <button
            onClick={() => setModeFilter(3)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              modeFilter === 3 ? 'bg-[#EE3124] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            MRT Jakarta
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          {filteredStops.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-sm">
              No matching transit stops found.
            </div>
          ) : (
            filteredStops.map((stop) => (
              <div
                key={`${stop.id}-${stop.index}`}
                onClick={() => {
                  onSelect(stop);
                  onClose();
                }}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.99] border border-white/5 cursor-pointer transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  {getModeIcon(stop.mode)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">
                    {stop.name}
                  </div>
                  <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                    <span>{getModeLabel(stop.mode)}</span>
                    {stop.desc && (
                      <>
                        <span>•</span>
                        <span className="text-white/40 truncate">{stop.desc}</span>
                      </>
                    )}
                  </div>
                </div>
                <MapPin className="w-4 h-4 text-white/30 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
