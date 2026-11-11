import React from 'react';
import { LineBadge } from '../../components/ui/LineBadge';
import { useT } from '../../hooks/useT';
import type { LiveLeg } from '../../lib/live/measure';
import type { LiveState } from '../../lib/store/transit-store';
import type { Leg } from '../../types/transit';

export interface ConnectionStepsProps {
  legs: Leg[];
  /** Live figures for this option, when it has been measured. */
  live?: LiveState;
}

const KM = 1000;

function distanceText(meters: number): string {
  return meters >= KM ? `${(meters / KM).toFixed(1).replace('.', ',')} km` : `${Math.round(meters)} m`;
}

const minutesOf = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/**
 * When the next buses reach the boarding stop, from their positions right now.
 * Only the first ride is measured: a bus near a later stop now is not the one the traveller will take there.
 */
const LiveLine: React.FC<{ leg: Leg; isFirstRide: boolean; live?: LiveState; figures?: LiveLeg }> = ({ leg, isFirstRide, live, figures }) => {
  const { t } = useT();
  if (!leg.live) return isFirstRide ? <span>{t('live.scheduled')}</span> : null;
  if (!isFirstRide) return null;
  if (live === 'measuring') return <span>{t('live.measuring')}</span>;
  if (!figures) return null;
  if (figures.nextBusSec === undefined) return <span>{t('live.no_bus_seen')}</span>;

  const following = figures.followingBusSec !== undefined ? `, ${t('live.following_bus', { minutes: minutesOf(figures.followingBusSec) })}` : '';
  return (
    <span className="text-[var(--status-on-time)] font-medium">
      {t('live.next_bus', { minutes: minutesOf(figures.nextBusSec) }) + following}
    </span>
  );
};

/** The steps of one option, shown when its row is opened: what to walk, what to ride, where to get off. */
export const ConnectionSteps: React.FC<ConnectionStepsProps> = ({ legs, live }) => {
  const { t } = useT();
  const figuresOf = (index: number) => (typeof live === 'object' ? live.legs.find(l => l.legIndex === index) : undefined);
  const firstRide = legs.findIndex(leg => leg.type === 'TRANSIT');

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
              <LiveLine leg={leg} isFirstRide={index === firstRide} live={live} figures={figuresOf(index)} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
};
