import React, { useState } from 'react';
import { useTransitStore } from '../../lib/store/transit-store';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/ui/Button';
import { SearchHeroCard } from './SearchHeroCard';
import { ModeFilterBar } from './ModeFilterBar';
import { TimePickerModal } from './TimePickerModal';
import { ConnectionFilterSheet } from '../results/ConnectionFilterSheet';
import { RecentSearches, saveRecentTrip, type RecentTrip } from './RecentSearches';
import { FareTipCard } from './FareTipCard';
import { useT } from '../../hooks/useT';

export const SearchScreen: React.FC = () => {
  const { t } = useT();
  const {
    originStop,
    destinationStop,
    departAtMs,
    swapStops,
    calculateJourney,
    setScreen,
    setIsSearchingOrigin,
    setIsSearchingDest,
    setOriginStop,
    setDestinationStop,
    network
  } = useTransitStore();

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const timeLabel = departAtMs === null
    ? t('search.depart_now')
    : t('search.depart_time', {
        time: new Date(departAtMs).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      });

  const isSameStop = Boolean(
    originStop && destinationStop && originStop.id === destinationStop.id
  );

  const handleSearch = () => {
    if (originStop && destinationStop && !isSameStop) {
      saveRecentTrip({
        originName: originStop.name,
        destName: destinationStop.name,
        originId: originStop.id,
        destId: destinationStop.id,
        originStop: originStop.isCustomPoint ? originStop : undefined,
        destStop: destinationStop.isCustomPoint ? destinationStop : undefined
      });
      calculateJourney();
      setScreen('RESULTS');
    }
  };

  const handleSelectRecent = (trip: RecentTrip) => {
    if (!network?.stops) return;
    const originIdx = network.stops.findIndex(s => s[0] === trip.originId);
    const destIdx = network.stops.findIndex(s => s[0] === trip.destId);

    if (originIdx !== -1) {
      const s = network.stops[originIdx];
      setOriginStop({ index: originIdx, id: s[0], name: s[1], lat: s[2], lon: s[3], mode: s[4] as any });
    } else if (trip.originStop) {
      setOriginStop(trip.originStop);
    }
    if (destIdx !== -1) {
      const s = network.stops[destIdx];
      setDestinationStop({ index: destIdx, id: s[0], name: s[1], lat: s[2], lon: s[3], mode: s[4] as any });
    } else if (trip.destStop) {
      setDestinationStop(trip.destStop);
    }
    saveRecentTrip({
      originName: trip.originName,
      destName: trip.destName,
      originId: trip.originId,
      destId: trip.destId,
      originStop: trip.originStop,
      destStop: trip.destStop
    });
    calculateJourney();
    setScreen('RESULTS');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--ground)]">
      <AppHeader />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-md md:max-w-2xl lg:max-w-5xl mx-auto w-full pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Primary Column */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <SearchHeroCard
              originStop={originStop}
              destinationStop={destinationStop}
              onSelectOrigin={() => setIsSearchingOrigin(true)}
              onSelectDestination={() => setIsSearchingDest(true)}
              onSwap={swapStops}
            />

            {/* Same stop alert */}
            {isSameStop && (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--status-warning-surface)] border border-[var(--status-warning)] text-[var(--status-warning-text)] text-[13px] leading-[18px]">
                <div className="font-semibold mb-0.5">{t('state.same_stop_title')}</div>
                <div>{t('state.same_stop_desc')}</div>
              </div>
            )}

            {/* Departure Time & Options Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(true)}
                className="inline-flex items-center gap-2 min-h-[var(--button-compact-height)] px-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[13px] leading-[18px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] cursor-pointer"
              >
                <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{timeLabel}</span>
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setIsOptionsOpen(true)}
                className="inline-flex items-center gap-2 min-h-[var(--button-compact-height)] px-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[13px] leading-[18px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] cursor-pointer"
              >
                <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>{t('options.title')}</span>
              </button>
            </div>

            <ModeFilterBar />
          </div>

          {/* Right Column: Recent Searches & Fare Tip Note */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <RecentSearches onSelectTrip={handleSelectRecent} />
            <FareTipCard />
            <p className="text-[12px] leading-[16px] text-[var(--text-muted)]">{t('app.disclaimer')}</p>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--surface)] border-t border-[var(--border)] z-[var(--z-sticky)]">
        <div className="max-w-md md:max-w-2xl lg:max-w-5xl mx-auto w-full">
          <Button
            variant="primary"
            fullWidth
            onClick={handleSearch}
            disabled={!originStop || !destinationStop || isSameStop}
          >
            {t('search.cta_button')}
          </Button>
        </div>
      </footer>

      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
      />

      <ConnectionFilterSheet
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
      />
    </div>
  );
};
