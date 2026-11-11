import React, { useState } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { ConnectionCard } from './ConnectionCard';
import { ConnectionFilterSheet } from './ConnectionFilterSheet';
import { useTransitSearch } from '../../hooks/useTransitSearch';
import type { Itinerary } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface ResultsScreenProps {
  onSelectItinerary?: (itinerary: Itinerary) => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ onSelectItinerary }) => {
  const { t } = useT();
  const {
    originStop,
    destinationStop,
    itineraries,
    isComputingRoute,
    calculateJourney,
    selectItinerary,
    setScreen,
    filters,
    setFilters,
    error,
    routingStatus
  } = useTransitSearch();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleCardClick = (itin: Itinerary) => {
    selectItinerary(itin);
    onSelectItinerary?.(itin);
  };

  const originName = originStop?.name || 'Asal';
  const destName = destinationStop?.name || 'Tujuan';
  const isSameStop = routingStatus === 'same-place' || Boolean(
    originStop && destinationStop && originStop.id === destinationStop.id
  );
  const isNoRoute = routingStatus === 'no-route' || itineraries.length === 0;
  const isError = routingStatus === 'error' || Boolean(error);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--ground)]">
      {/* 48px Top Bar */}
      <header className="flex items-center justify-between h-12 px-2 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-[var(--z-sticky)]">
        <IconButton
          label={t('nav.back')}
          variant="ghost"
          onClick={() => setScreen('HOME')}
          className="text-[18px] font-bold"
        >
          ‹
        </IconButton>

        <div className="flex-1 min-w-0 text-center px-2">
          <div className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] truncate">
            {originName} → {destName}
          </div>
        </div>

        <IconButton
          label={t('results.filter_title')}
          variant="ghost"
          onClick={() => setIsFilterOpen(true)}
          className="text-[16px]"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-[var(--text-primary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </IconButton>
      </header>

      {/* Result Status Bar */}
      <div className="border-b border-[var(--rule)] bg-[var(--surface-raised)]">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-between px-4 py-2 text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
          <span>{t('results.title')}</span>
          <span className="tabular-nums">
            {t('results.count', { count: itineraries.length })}
          </span>
        </div>
      </div>

      {/* Main List Area */}
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-3 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full pb-12">
        {isComputingRoute ? (
          <div className="flex flex-col gap-3">
            <Skeleton height="110px" rounded="card" />
            <Skeleton height="110px" rounded="card" />
            <Skeleton height="110px" rounded="card" />
          </div>
        ) : isError ? (
          <ErrorState
            title={t('state.error_title')}
            message={error || undefined}
            retryLabel={t('state.error_retry')}
            onRetry={calculateJourney}
          />
        ) : isSameStop ? (
          <EmptyState
            title={t('ladder.same_place_title')}
            description={t('ladder.same_place_desc')}
            action={
              <Button variant="secondary" size="compact" onClick={() => setScreen('HOME')}>
                {t('nav.back')}
              </Button>
            }
          />
        ) : isNoRoute ? (
          <EmptyState
            title={t('state.empty_title')}
            description={t('state.empty_desc')}
            action={
              <Button variant="secondary" size="compact" onClick={() => setScreen('HOME')}>
                {t('nav.back')}
              </Button>
            }
          />
        ) : (
          <>
            {itineraries[0]?.answerKind === 'relaxed' && (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-primary)] font-medium flex items-center gap-2">
                <span className="text-[16px]">🚶</span>
                <span>{t('ladder.relaxed_banner')}</span>
              </div>
            )}

            {itineraries[0]?.answerKind === 'closest-approach' && (
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--action-primary)] text-[13px] leading-[18px] text-[var(--text-primary)] space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-[var(--action-primary)]">
                  <span className="text-[16px]">⚠️</span>
                  <span>{t('ladder.closest_banner')}</span>
                </div>
                <div className="text-[12px] text-[var(--text-secondary)]">
                  {t('ladder.closest_hint')}
                </div>
              </div>
            )}

            {itineraries[0]?.answerKind === 'walk-only' && (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-primary)] font-medium flex items-center gap-2">
                <span className="text-[16px]">🚶</span>
                <span>{t('ladder.walk_only_banner')}</span>
              </div>
            )}

            {itineraries.map(itin => (
              <ConnectionCard
                key={itin.id}
                itinerary={itin}
                onSelect={handleCardClick}
              />
            ))}
          </>
        )}
      </main>

      {/* Filter Sheet */}
      <ConnectionFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onChangeFilters={setFilters}
      />
    </div>
  );
};
