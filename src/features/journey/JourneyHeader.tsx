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

  const fareAmount = itinerary.integratedFareIdr || itinerary.standardFareIdr;
  const fareDisplay =
    fareAmount > 0
      ? `Rp ${fareAmount.toLocaleString('id-ID')}`
      : t('results.fare_free');

  const durationText = t('results.duration', {
    minutes: itinerary.totalDurationMinutes
  });

  const transferText =
    itinerary.transfersCount === 0
      ? t('results.direct')
      : t('results.transfers', { count: itinerary.transfersCount });

  return (
    <Card variant="surface" padding="md" className="flex flex-col gap-3">
      {/* Route title */}
      <div className="flex items-center gap-2 text-[16px] leading-[24px] font-bold text-[var(--text-primary)]">
        <span className="truncate">{originName}</span>
        <svg
          aria-hidden="true"
          className="w-4 h-4 text-[var(--text-muted)] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <span className="truncate">{destName}</span>
      </div>

      <div className="h-px bg-[var(--rule)]" />

      {/* Metrics Row */}
      <div className="flex items-center justify-between text-[14px] leading-[20px]">
        <div className="flex items-center gap-2">
          <span className="font-bold tabular-nums text-[var(--text-primary)]">
            {itinerary.departureTime}
          </span>
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="font-bold tabular-nums text-[var(--text-primary)]">
            {itinerary.arrivalTime}
          </span>
          <span className="text-[13px] leading-[18px] font-medium text-[var(--text-secondary)] tabular-nums">
            ({durationText})
          </span>
        </div>

        <div className="font-bold tabular-nums text-[var(--text-primary)]">
          {fareDisplay}
        </div>
      </div>

      {/* Badges / Status row */}
      <div className="flex items-center justify-between text-[13px] leading-[18px]">
        <span className="text-[var(--text-muted)] font-medium">
          {transferText}
        </span>

        {(() => {
          const hasLiveData = itinerary.legs.some(l => l.liveBusId || l.recountedDelaySeconds !== undefined);
          const transitLeg = itinerary.legs.find(l => l.type === 'TRANSIT' && l.headwaySeconds);
          const headwayMin = transitLeg?.headwaySeconds ? Math.round(transitLeg.headwaySeconds / 60) : null;

          if (hasLiveData) {
            return itinerary.trafficDelayMinutes > 0 ? (
              <span className="text-[var(--status-delayed-text)] bg-[var(--status-delayed-surface)] px-2 py-0.5 rounded-[var(--radius-badge)] font-semibold tabular-nums">
                {t('results.status_delayed', { minutes: itinerary.trafficDelayMinutes })}
              </span>
            ) : (
              <span className="text-[var(--status-on-time-text)] bg-[var(--status-on-time-surface)] px-2 py-0.5 rounded-[var(--radius-badge)] font-semibold">
                ● {t('results.status_ontime')}
              </span>
            );
          }
          if (headwayMin) {
            return (
              <span className="text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-[var(--radius-badge)] font-medium tabular-nums">
                {t('results.status_headway', { minutes: headwayMin })}
              </span>
            );
          }
          return null;
        })()}
      </div>
    </Card>
  );
};
