import React, { useEffect, useState } from 'react';
import { useTransitStore } from './lib/store/transit-store';
import { SearchScreen } from './features/search/SearchScreen';
import { ResultsScreen } from './features/results/ResultsScreen';
import { JourneyDetailScreen } from './features/journey/JourneyDetailScreen';
import { StopPickerModal } from './features/stop-picker/StopPickerModal';
import { LiveRadarScreen } from './features/radar/LiveRadarScreen';
import { OfflineBanner } from './components/OfflineBanner';
import { Skeleton } from './components/ui/Skeleton';
import { useT } from './hooks/useT';

export const App: React.FC = () => {
  const { t } = useT();
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

  const [isViewingDetail, setIsViewingDetail] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Reset detail view if screen changes away from RESULTS
  useEffect(() => {
    if (activeScreen !== 'RESULTS') {
      setIsViewingDetail(false);
    }
  }, [activeScreen]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[var(--ground)] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-[var(--radius-control)] bg-[var(--action-primary)] flex items-center justify-center text-[var(--text-inverse)] font-bold text-[18px] mb-4">
          TJ
        </div>
        <h1 className="text-[16px] leading-[24px] font-bold text-[var(--text-primary)] mb-2">
          {t('app.title')}
        </h1>
        <p className="text-[12px] leading-[16px] text-[var(--text-secondary)] max-w-xs mb-6">
          {t('state.loading')}
        </p>
        <div className="w-48 flex flex-col gap-2">
          <Skeleton height="12px" rounded="full" />
          <Skeleton height="12px" rounded="full" className="w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-x-hidden bg-[var(--ground)] select-none">
      <OfflineBanner />

      {/* Screen Views */}
      {activeScreen === 'HOME' && <SearchScreen />}

      {activeScreen === 'RESULTS' && (
        isViewingDetail ? (
          <JourneyDetailScreen onBack={() => setIsViewingDetail(false)} />
        ) : (
          <ResultsScreen onSelectItinerary={() => setIsViewingDetail(true)} />
        )
      )}

      {activeScreen === 'RADAR' && <LiveRadarScreen />}

      {/* Stop Picker Autocomplete Sheets */}
      <StopPickerModal
        isOpen={isSearchingOrigin}
        onClose={() => setIsSearchingOrigin(false)}
        onSelect={setOriginStop}
        title={t('search.origin_label')}
      />

      <StopPickerModal
        isOpen={isSearchingDest}
        onClose={() => setIsSearchingDest(false)}
        onSelect={setDestinationStop}
        title={t('search.dest_label')}
      />
    </div>
  );
};
