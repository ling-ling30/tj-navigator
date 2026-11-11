import React from 'react';
import { Card } from '../../components/ui/Card';
import { RouteLegPreview } from './RouteLegPreview';
import type { Itinerary, OptionBadge } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface ConnectionCardProps {
  itinerary: Itinerary;
  onSelect: (itinerary: Itinerary) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ itinerary, onSelect }) => {
  const { t } = useT();

  // Line 1: Times, typical duration in bold, range beside it when min and max differ by >= 3 min
  const showRange =
    itinerary.durationMinMinutes !== undefined &&
    itinerary.durationMaxMinutes !== undefined &&
    itinerary.durationMaxMinutes - itinerary.durationMinMinutes >= 3;

  // Badges from badgeKeys
  const badgeMap: Record<OptionBadge, string> = {
    fastest: t('results.fastest_badge'),
    fewest_transfers: t('results.least_transfers'),
    cheapest: t('results.cheapest_badge'),
    least_walking: t('results.least_walking_badge')
  };
  const activeBadgeKey = itinerary.badgeKeys?.[0];
  const badgeLabel = activeBadgeKey ? badgeMap[activeBadgeKey] : null;

  // Line 3: Facts
  const transfersText =
    itinerary.transfersCount === 0
      ? t('results.direct_plain')
      : itinerary.transfersCount === 1
      ? t('results.transfers_count', { count: 1 })
      : t('results.transfers_count', { count: itinerary.transfersCount });

  const walkMeters =
    itinerary.walkMeters !== undefined
      ? itinerary.walkMeters
      : itinerary.legs
          .filter(l => l.type === 'WALK')
          .reduce((sum, l) => sum + (l.distanceMeters || 0), 0);
  const formattedWalkDist =
    walkMeters >= 1000
      ? `${(walkMeters / 1000).toFixed(1).replace('.', ',')} km`
      : `${walkMeters} m`;
  const walkText = t('results.walk_distance', { distance: formattedWalkDist });

  const fareAmount = itinerary.integratedFareIdr ?? itinerary.standardFareIdr;
  const fareText =
    fareAmount <= 0
      ? t('results.fare_free')
      : t('results.fare_estimate', { amount: fareAmount.toLocaleString('id-ID') });

  const firstRide = itinerary.legs.find(l => l.type === 'TRANSIT');
  let freqText: string | null = null;
  if (firstRide?.isInfrequent && firstRide.headwaySeconds) {
    freqText = t('results.infrequent_headway', {
      minutes: Math.round(firstRide.headwaySeconds / 60)
    });
  } else if (firstRide?.headwaySeconds) {
    freqText = t('results.status_headway', {
      minutes: Math.round(firstRide.headwaySeconds / 60)
    });
  }

  const facts = [transfersText, walkText, fareText, freqText].filter(Boolean) as string[];

  return (
    <Card
      variant="interactive"
      padding="md"
      onClick={() => onSelect(itinerary)}
      className="flex flex-col gap-2"
    >
      {/* Line 1: Times, Duration (bold), Range */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] leading-[20px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
          {itinerary.departureTime} → {itinerary.arrivalTime}
        </span>

        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-[15px] leading-[20px] font-bold text-[var(--text-primary)] tabular-nums">
            {itinerary.totalDurationMinutes} mnt
          </span>
          {showRange && (
            <span className="text-[12px] leading-[16px] text-[var(--text-secondary)] tabular-nums">
              {itinerary.durationMinMinutes}–{itinerary.durationMaxMinutes} mnt
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Leg chain */}
      <RouteLegPreview legs={itinerary.legs} />

      {/* Line 3: Facts. Wraps rather than cutting off the fare or the frequency. */}
      <div className="text-[12px] leading-[16px] text-[var(--text-secondary)]">
        {badgeLabel && (
          <span className="font-semibold text-[var(--text-primary)]">
            {badgeLabel}
            <span className="font-normal text-[var(--text-muted)]"> · </span>
          </span>
        )}
        {facts.join(' · ')}
      </div>
    </Card>
  );
};
