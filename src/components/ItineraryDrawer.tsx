import React, { useState } from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import { 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Radio, 
  Train, 
  Bus, 
  Footprints, 
  Zap, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import type { Itinerary, Leg } from '../types/transit';

export const ItineraryDrawer: React.FC = () => {
  const {
    itineraries,
    selectedItinerary,
    selectItinerary,
    openLiveRadar,
    setScreen,
    originStop,
    destinationStop
  } = useTransitStore();

  const [isExpanded, setIsExpanded] = useState(false);

  if (itineraries.length === 0) return null;

  const currentItinerary = selectedItinerary || itineraries[0];

  const getLegIcon = (leg: Leg) => {
    if (leg.type === 'WALK') return <Footprints className="w-4 h-4 text-emerald-400" />;
    switch (leg.mode) {
      case 2: return <Train className="w-4 h-4 text-[#00A859]" />;
      case 3: return <Zap className="w-4 h-4 text-[#EE3124]" />;
      case 5: return <Bus className="w-4 h-4 text-[#00CED1]" />;
      default: return <Bus className="w-4 h-4 text-[#007AFF]" />;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 max-w-md mx-auto pointer-events-none">
      <div className="pointer-events-auto bg-[#141923]/95 backdrop-blur-2xl border-t border-white/12 rounded-t-[36px] p-5 shadow-2xl flex flex-col max-h-[82vh]">
        {/* Top Handle & Back Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setScreen('HOME')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-12 h-1.5 bg-white/20 rounded-full cursor-pointer hover:bg-white/40 transition-colors" 
          />

          <div className="text-[11px] font-bold text-emerald-400 tracking-tight">
            3 Pareto Routes
          </div>
        </div>

        {/* Origin & Destination summary banner */}
        <div className="flex items-center justify-between text-xs text-white/60 mb-3 px-1">
          <span className="font-semibold text-white truncate max-w-[140px]">{originStop?.name}</span>
          <ArrowRight className="w-3.5 h-3.5 text-white/30 shrink-0 mx-2" />
          <span className="font-semibold text-white truncate max-w-[140px]">{destinationStop?.name}</span>
        </div>

        {/* Pareto Option Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {itineraries.map((itin, idx) => {
            const isSelected = currentItinerary.id === itin.id;
            const isFastest = itin.category === 'FASTEST';
            const isDirect = itin.category === 'FEWEST_TRANSFERS';

            return (
              <div
                key={itin.id}
                onClick={() => selectItinerary(itin)}
                className={`p-2.5 rounded-2xl cursor-pointer border text-center transition-all ${
                  isSelected
                    ? 'bg-[#007AFF]/20 border-[#007AFF] shadow-lg shadow-blue-500/20'
                    : 'bg-white/[0.04] border-white/8 hover:bg-white/[0.08]'
                }`}
              >
                <div className={`text-[10px] font-extrabold uppercase tracking-tight ${
                  isFastest ? 'text-amber-400' : isDirect ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  {isFastest ? '⚡ FASTEST' : isDirect ? '🟢 DIRECT' : '💰 CHEAPEST'}
                </div>
                <div className="text-base font-extrabold text-white tracking-tight mt-0.5">
                  {itin.totalDurationMinutes} <span className="text-xs font-medium text-white/60">min</span>
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  Rp {itin.integratedFareIdr.toLocaleString('id-ID')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Itinerary Card */}
        <div className="bg-[#1F2633]/80 border border-white/8 rounded-2xl p-4 mb-3">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tracking-tight">
                  {currentItinerary.totalDurationMinutes}
                </span>
                <span className="text-sm font-semibold text-white/60">min total</span>
                {currentItinerary.trafficDelayMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    +{currentItinerary.trafficDelayMinutes}m delay
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-white/40" />
                <span>{currentItinerary.departureTime} – {currentItinerary.arrivalTime}</span>
                <span>•</span>
                <span>{currentItinerary.transfersCount === 0 ? 'Direct Route' : `${currentItinerary.transfersCount} Transfer`}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-emerald-400">
                Rp {currentItinerary.integratedFareIdr.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-white/40">
                JakLingko Integrated
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {currentItinerary.badges.map((badge, bIdx) => (
              <span 
                key={bIdx}
                className="px-2.5 py-0.5 rounded-full bg-white/8 text-[11px] font-medium text-white/80 border border-white/6"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Traffic Warning / Diagnostic callout if delay exists */}
          {currentItinerary.trafficDelayMinutes > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs mb-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Simpang Casablanca Congestion:</span> Preceding bus B-7412 experienced a 7-minute slowdown at the flyover bottleneck. Arrival time recounted accordingly.
              </div>
            </div>
          )}

          {/* Live Bus Tracking Action Button */}
          <button
            onClick={() => openLiveRadar('TJ-0842')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.99] border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            <span>Track Live Feeder Bus TJ-0842 on Radar</span>
          </button>
        </div>

        {/* Detailed Leg-by-Leg Steps */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
            Trip Breakdown
          </div>

          {currentItinerary.legs.map((leg, lIdx) => (
            <div key={lIdx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center">
                    {getLegIcon(leg)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{leg.type === 'WALK' ? 'Walk' : leg.routeShortName}</span>
                      {leg.routeId && (
                        <span className="text-[10px] font-normal text-white/50">
                          ({leg.fromStopName} → {leg.toStopName})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {Math.round(leg.durationSeconds / 60)} min • {leg.distanceMeters}m
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-white/50">
                  {leg.departureTime}
                </div>
              </div>

              {/* Special transfer badges */}
              {leg.type === 'WALK' && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
                  {leg.isSheltered && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 text-[10px] font-medium">
                      ☂️ Covered Skywalk
                    </span>
                  )}
                  {leg.isStepFree && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-medium">
                      ♿ Step-Free Access
                    </span>
                  )}
                  {leg.isPaidAreaTransfer && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-medium">
                      🎟️ Inside Station Transfer (Do Not Tap Out)
                    </span>
                  )}
                </div>
              )}

              {/* Intermediate stops if available */}
              {leg.intermediateStopNames && leg.intermediateStopNames.length > 0 && (
                <div className="text-[11px] text-white/40 pl-9">
                  Passes {leg.intermediateStopNames.length} stops: {leg.intermediateStopNames.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
