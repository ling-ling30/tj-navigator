import React, { useState } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { ModeFilterBar } from '../search/ModeFilterBar';
import { ConnectionCard } from './ConnectionCard';
import { ConnectionFilterSheet } from './ConnectionFilterSheet';
import { useTransitSearch, type SortStrategy } from '../../hooks/useTransitSearch';
import type { Itinerary } from '../../types/transit';
import { useT } from '../../hooks/useT';

const MODE_GROUP_NAMES: Record<number, string> = {
  0: 'BRT',
  1: 'Bus',
  2: 'Mikrotrans',
  3: 'KRL',
  4: 'MRT',
  5: 'LRT'
};

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
    routingStatus,
    answerKind,
    modesGaveNothing,
    suggestion,
    applySuggestion
  } = useTransitSearch();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  /** One row open at a time; a second tap closes it. */
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const sortChoices: Array<{ label: string; value: SortStrategy }> = [
    { label: t('results.sort_best'), value: 'best' },
    { label: t('results.sort_fastest'), value: 'fastest' },
    { label: t('results.sort_fewest_transfers'), value: 'fewest_transfers' },
    { label: t('results.sort_cheapest'), value: 'cheapest' },
    { label: t('results.sort_least_walking'), value: 'least_walking' }
  ];

  const suggestionModesText = suggestion
    ? suggestion.modeGroups.map(g => MODE_GROUP_NAMES[g] || '').join(' & ')
    : '';

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
          label={t('options.title')}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </IconButton>
      </header>

      {/* Mode Filter Bar under Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
          <ModeFilterBar showTitle={false} />
        </div>
      </div>

      {/* Sort Strategy Toolbar */}
      {!isNoRoute && !isError && !isSameStop && (
        <div className="border-b border-[var(--rule)] bg-[var(--surface-raised)] px-4 py-2">
          <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            {sortChoices.map(opt => (
              <Chip
                key={opt.value}
                active={filters.sortBy === opt.value}
                onClick={() => setFilters({ sortBy: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Main List Area */}
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-3 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full pb-12">

        {isComputingRoute ? (
          <div className="flex flex-col gap-3">
            <Skeleton height="100px" rounded="card" />
            <Skeleton height="100px" rounded="card" />
            <Skeleton height="100px" rounded="card" />
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
            {/* Tone-step Banners (One at a time) */}
            {modesGaveNothing ? (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
                {t('results.banner_modes_nothing')}
              </div>
            ) : answerKind === 'relaxed' ? (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
                {t('results.banner_relaxed')}
              </div>
            ) : answerKind === 'closest-approach' ? (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium space-y-1">
                <div className="font-semibold text-[var(--text-primary)]">
                  {t('ladder.closest_banner')}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] font-normal">
                  {t('ladder.closest_hint')}
                </div>
              </div>
            ) : answerKind === 'walk-only' ? (
              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
                {t('ladder.walk_only_banner')}
              </div>
            ) : null}

            {/* Results Connection Cards */}
            {itineraries.map(itin => (
              <ConnectionCard
                key={itin.id}
                itinerary={itin}
                expanded={expandedId === itin.id}
                onToggle={toggled => setExpandedId(current => (current === toggled.id ? null : toggled.id))}
                onOpenDetail={handleCardClick}
              />
            ))}

            {/* Suggestion Row under the list */}
            {suggestion && (
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between gap-3">
                <div className="text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
                  {t('results.suggestion_faster', {
                    minutes: suggestion.savesMinutes,
                    modes: suggestionModesText
                  })}
                </div>
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={applySuggestion}
                  className="shrink-0"
                >
                  {t('results.suggestion_add', { modes: suggestionModesText })}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Travel Options Sheet */}
      <ConnectionFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div>
  );
};
