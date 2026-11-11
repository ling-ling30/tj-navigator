import React from 'react';
import { Card } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/IconButton';
import type { StopEntity } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface SearchHeroCardProps {
  originStop: StopEntity | null;
  destinationStop: StopEntity | null;
  onSelectOrigin: () => void;
  onSelectDestination: () => void;
  onSwap: () => void;
}

export const SearchHeroCard: React.FC<SearchHeroCardProps> = ({
  originStop,
  destinationStop,
  onSelectOrigin,
  onSelectDestination,
  onSwap
}) => {
  const { t } = useT();

  return (
    <Card variant="surface" padding="none" className="relative flex flex-col">
      {/* Origin Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelectOrigin}
        className="flex items-center h-14 px-4 gap-3 cursor-pointer hover:bg-[var(--surface-raised)] transition-colors border-b border-[var(--rule)]"
      >
        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--action-primary)] shrink-0" />
        <div className="flex-1 min-w-0 pr-12">
          <div className="text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
            {t('search.origin_label')}
          </div>
          <div
            title={originStop ? originStop.name : undefined}
            className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] truncate"
          >
            {originStop ? originStop.name : t('search.origin_placeholder')}
          </div>
        </div>
      </div>

      {/* Swap Button Absolute Center-Right */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
        <IconButton
          label={t('search.swap_stops')}
          variant="secondary"
          onClick={onSwap}
          className="rounded-full border border-[var(--border)]"
        >
          ⇄
        </IconButton>
      </div>

      {/* Destination Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelectDestination}
        className="flex items-center h-14 px-4 gap-3 cursor-pointer hover:bg-[var(--surface-raised)] transition-colors"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--action-primary)] shrink-0" />
        <div className="flex-1 min-w-0 pr-12">
          <div className="text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
            {t('search.dest_label')}
          </div>
          <div
            title={destinationStop ? destinationStop.name : undefined}
            className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] truncate"
          >
            {destinationStop ? destinationStop.name : t('search.dest_placeholder')}
          </div>
        </div>
      </div>
    </Card>
  );
};
