import React from 'react';
import { LineBadge } from '../../components/ui/LineBadge';
import { useT } from '../../hooks/useT';
import type { Leg } from '../../types/transit';

export interface ConnectionStepsProps {
  legs: Leg[];
}

const KM = 1000;

function distanceText(meters: number): string {
  return meters >= KM ? `${(meters / KM).toFixed(1).replace('.', ',')} km` : `${Math.round(meters)} m`;
}

const minutesOf = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/** The steps of one option, shown when its row is opened: what to walk, what to ride, where to get off. */
export const ConnectionSteps: React.FC<ConnectionStepsProps> = ({ legs }) => {
  const { t } = useT();

  return (
    <ol className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
      {legs.map((leg, index) => (
        <li key={index} className="flex items-start gap-2 text-[13px] leading-[18px] text-[var(--text-secondary)]">
          <span className="tabular-nums shrink-0 w-10 text-[var(--text-primary)]">{leg.departureTime}</span>
          {leg.type === 'WALK' ? (
            <span>
              {t('journey.walk_distance', { distance: distanceText(leg.distanceMeters), minutes: minutesOf(leg.durationSeconds) })}
              {' → '}
              <span className="text-[var(--text-primary)]">{leg.toStopName}</span>
            </span>
          ) : (
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center flex-wrap gap-1.5 text-[var(--text-primary)] font-medium">
                <LineBadge mode={leg.mode} code={(leg.lineNames ?? [leg.routeShortName ?? ''])[0]} />
                {t('journey.ride_board', { lines: (leg.lineNames ?? [leg.routeShortName ?? '']).join(', ') })}
              </span>
              <span>{leg.fromStopName} → {leg.toStopName}</span>
              <span className="tabular-nums">
                {t('results.step_ride_meta', { stops: (leg.intermediateStopCount ?? 0) + 1, minutes: minutesOf(leg.durationSeconds) })}
              </span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
};
