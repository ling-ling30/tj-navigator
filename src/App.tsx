import React, { useEffect } from 'react';
import { useTransitStore } from './lib/store/transit-store';
import { HeaderBar } from './components/HeaderBar';
import { MapCanvas } from './components/MapCanvas';
import { SearchCard } from './components/SearchCard';
import { ItineraryDrawer } from './components/ItineraryDrawer';
import { LiveRadarSheet } from './components/LiveRadarSheet';
import { StopSearchModal } from './components/StopSearchModal';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const {
    isLoading,
    loadInitialData,
    activeScreen,
    isSearchingOrigin,
    isSearchingDest,
    setIsSearchingOrigin,
    setIsSearchingDest,
    setOriginStop,
    setDestinationStop
  } = useTransitStore();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0A0E17] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#007AFF] to-[#00E676] flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-blue-500/20">
            TJ
          </div>
          <Loader2 className="w-8 h-8 text-white animate-spin absolute -bottom-2 -right-2 bg-[#0A0E17] rounded-full p-1 border-2 border-emerald-400" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight mb-2">
          TJ-Navigator
        </h1>
        <p className="text-xs text-white/50 max-w-xs leading-relaxed">
          Hydrating 8,270+ Jakarta transit stops & live corridor telemetry into IndexedDB...
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0E17] select-none">
      {/* Top Header Bar */}
      <HeaderBar />

      {/* Background Interactive Map */}
      <MapCanvas />

      {/* Screen Views */}
      {activeScreen === 'HOME' && <SearchCard />}
      {activeScreen === 'RESULTS' && <ItineraryDrawer />}
      {activeScreen === 'RADAR' && <LiveRadarSheet />}

      {/* Search Modals */}
      <StopSearchModal
        isOpen={isSearchingOrigin}
        onClose={() => setIsSearchingOrigin(false)}
        onSelect={setOriginStop}
        title="Select Departure (Origin)"
      />

      <StopSearchModal
        isOpen={isSearchingDest}
        onClose={() => setIsSearchingDest(false)}
        onSelect={setDestinationStop}
        title="Select Destination (Halte / Station)"
      />
    </div>
  );
};
