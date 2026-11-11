import React from 'react';
import { LineBadge } from '../../components/ui/LineBadge';
import { useT } from '../../hooks/useT';
import type { DepartureItem } from '../../hooks/useLiveRadar';

export interface DepartureBoardProps {
  departures: DepartureItem[];
}

export const DepartureBoard: React.FC<DepartureBoardProps> = ({ departures }) => {
  const { t } = useT();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] leading-[18px] font-semibold text-[var(--text-secondary)]">
        {t('radar.board_header')}
      </h2>

      <div className="rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)] overflow-hidden">
        {departures.map(dep => {
          const isDelayed = dep.delayMinutes > 0;
          const isDue = dep.minutesAway <= 1;

          return (
            <div
              key={dep.id}
              className="flex items-center justify-between min-h-[var(--touch-target-min)] px-4 py-3"
            >
              {/* Route Badge & Destination */}
              <div className="flex items-center gap-3 min-w-0">
                <LineBadge mode={dep.mode} code={dep.routeShortName} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] truncate">
                    {dep.destination}
                  </span>
                  <span className="text-[13px] leading-[18px] text-[var(--text-secondary)] truncate">
                    {dep.platformOrDoor}
                  </span>
                </div>
              </div>

              {/* Countdown & Status */}
              <div className="flex flex-col items-end shrink-0 pl-3 text-right">
                {isDelayed ? (
                  <span className="text-[12px] leading-[16px] font-bold text-[var(--status-warning-text)] bg-[var(--status-warning-surface)] px-2 py-0.5 rounded-[var(--radius-badge)] tabular-nums">
                    {t('radar.minutes_away', { minutes: dep.minutesAway })}
                  </span>
                ) : isDue ? (
                  <span className="text-[12px] leading-[16px] font-bold text-[var(--status-on-time-text)] bg-[var(--status-on-time-surface)] px-2 py-0.5 rounded-[var(--radius-badge)] tabular-nums">
                    ● {t('radar.due_now')}
                  </span>
                ) : (
                  <span className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] tabular-nums">
                    {t('radar.minutes_away', { minutes: dep.minutesAway })}
                  </span>
                )}

                <span className="text-[12px] leading-[16px] text-[var(--text-muted)] mt-0.5">
                  {dep.crowdLevel === 'low' && t('radar.crowd_low')}
                  {dep.crowdLevel === 'medium' && t('radar.crowd_medium')}
                  {dep.crowdLevel === 'high' && t('radar.crowd_high')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
