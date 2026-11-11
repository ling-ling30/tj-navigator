import React from 'react';
import { Card } from '../../components/ui/Card';
import type { Itinerary } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface JourneyHeaderProps {
  itinerary: Itinerary;
  originName: string;
  destName: string;
}

export const JourneyHeader: React.FC<JourneyHeaderProps> = ({
  itinerary,
  originName,
  destName
}) => {
  const { t } = useT();

  const fareAmount = itinerary.integratedFareIdr ?? itinerary.standardFareIdr;
  const fareDisplay =
    fareAmount > 0
      ? t('results.fare_estimate', { amount: fareAmount.toLocaleString('id-ID') })
      : t('results.fare_free');

  const durationText = t('results.duration', {
    minutes: itinerary.totalDurationMinutes
  });

  const showRange =
    itinerary.durationMinMinutes !== undefined &&
    itinerary.durationMaxMinutes !== undefined &&
    itinerary.durationMaxMinutes - itinerary.durationMinMinutes >= 3;

  const transferText =
    itinerary.transfersCount === 0
      ? t('results.direct_plain')
      : itinerary.transfersCount === 1
      ? t('results.transfers_count', { count: 1 })
      : t('results.transfers_count', { count: itinerary.transfersCount });

  const firstRide = itinerary.legs.find(l => l.type === 'TRANSIT');
  const headwayMin = firstRide?.headwaySeconds ? Math.round(firstRide.headwaySeconds / 60) : null;

  return (
    <Card variant="surface" padding="md" className="flex flex-col gap-3">
      {/* Route title */}
      <div className="flex items-center gap-2 text-[16px] leading-[24px] font-bold text-[var(--text-primary)]">
        <span className="truncate">{originName}</span>
        <span className="text-[var(--text-muted)] shrink-0">→</span>
        <span className="truncate">{destName}</span>
      </div>

      <div className="h-px bg-[var(--rule)]" />

      {/* Metrics Row: Times, Duration, Range, Fare, Integrated Fare Tag */}
      <div className="flex items-center justify-between text-[14px] leading-[20px] flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold tabular-nums text-[var(--text-primary)]">
            {itinerary.departureTime} → {itinerary.arrivalTime}
          </span>
          <span className="text-[13px] leading-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
            ({durationText})
          </span>
          {showRange && (
            <span className="text-[12px] leading-[16px] text-[var(--text-secondary)] tabular-nums">
              {itinerary.durationMinMinutes}–{itinerary.durationMaxMinutes} mnt
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-bold tabular-nums text-[var(--text-primary)]">
            {fareDisplay}
          </span>
          {itinerary.fareIsIntegrated && (
            <span className="text-[11px] leading-[14px] font-medium text-[var(--action-primary)] bg-[var(--action-primary-surface)] px-1.5 py-0.5 rounded-[var(--radius-badge)]">
              {t('results.fare_integrated_tag')}
            </span>
          )}
        </div>
      </div>

      {/* Sub-row: Transfers & First ride frequency */}
      <div className="flex items-center justify-between text-[13px] leading-[18px]">
        <span className="text-[var(--text-secondary)] font-medium">
          {transferText}
        </span>

        {headwayMin && (
          <span className="text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-[var(--radius-badge)] font-medium tabular-nums">
            {t('results.status_headway', { minutes: headwayMin })}
          </span>
        )}
      </div>
    </Card>
  );
};
