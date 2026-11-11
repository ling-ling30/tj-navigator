import React from 'react';
import { Card } from '../../components/ui/Card';
import { RouteLegPreview } from './RouteLegPreview';
import type { Itinerary } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface ConnectionCardProps {
  itinerary: Itinerary;
  onSelect: (itinerary: Itinerary) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ itinerary, onSelect }) => {
  const { t } = useT();

  const fareAmount = itinerary.integratedFareIdr || itinerary.standardFareIdr;
  const fareDisplay =
    fareAmount > 0
      ? `Rp ${fareAmount.toLocaleString('id-ID')}`
      : t('results.fare_free');

  const transferText =
    itinerary.transfersCount === 0
      ? t('results.direct')
      : t('results.transfers', { count: itinerary.transfersCount });

  const durationText = t('results.duration', { minutes: itinerary.totalDurationMinutes });
  const hasDelay = itinerary.trafficDelayMinutes > 0;
  const hasLiveData = itinerary.legs.some(l => l.liveBusId || l.recountedDelaySeconds !== undefined);
  const transitLegWithHeadway = itinerary.legs.find(l => l.type === 'TRANSIT' && l.headwaySeconds);
  const headwayMinutes = transitLegWithHeadway?.headwaySeconds
    ? Math.round(transitLegWithHeadway.headwaySeconds / 60)
    : null;

  return (
    <Card
      variant="interactive"
      padding="md"
      onClick={() => onSelect(itinerary)}
      className="flex flex-col gap-3"
    >
      {/* Header Row: Times, Duration, Transfers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[16px] leading-[24px] font-bold tabular-nums text-[var(--text-primary)]">
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
          <span className="text-[16px] leading-[24px] font-bold tabular-nums text-[var(--text-primary)]">
            {itinerary.arrivalTime}
          </span>
        </div>

        <div className="text-[14px] leading-[20px] font-medium text-[var(--text-secondary)] tabular-nums">
          {durationText}
        </div>

        <div className="text-[13px] leading-[18px] text-[var(--text-muted)] font-medium">
          {transferText}
        </div>
      </div>

      <div className="h-px bg-[var(--rule)]" />

      {/* Transit Progression Sequence */}
      <RouteLegPreview legs={itinerary.legs} />

      <div className="h-px bg-[var(--rule)]" />

      {/* Footer Row: Fare & Status */}
      <div className="flex items-center justify-between text-[13px] leading-[18px]">
        <div className="font-bold text-[var(--text-primary)] tabular-nums">
          {fareDisplay}
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          {hasLiveData ? (
            hasDelay ? (
              <span className="text-[var(--status-delayed-text)] bg-[var(--status-delayed-surface)] px-2 py-0.5 rounded-[var(--radius-badge)] tabular-nums">
                {t('results.status_delayed', { minutes: itinerary.trafficDelayMinutes })}
              </span>
            ) : (
              <span className="text-[var(--status-on-time-text)] bg-[var(--status-on-time-surface)] px-2 py-0.5 rounded-[var(--radius-badge)]">
                ● {t('results.status_ontime')}
              </span>
            )
          ) : headwayMinutes ? (
            <span className="text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-[var(--radius-badge)] tabular-nums">
              {t('results.status_headway', { minutes: headwayMinutes })}
            </span>
          ) : null}
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-[var(--text-muted)] shrink-0 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Card>
  );
};
