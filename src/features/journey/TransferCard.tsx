import React from 'react';
import type { Leg } from '../../types/transit';
import { Button } from '../../components/ui/Button';
import { useT } from '../../hooks/useT';

export interface TransferCardProps {
  leg: Leg;
  googleMapsUrl?: string;
}

export const TransferCard: React.FC<TransferCardProps> = ({ leg, googleMapsUrl }) => {
  const { t } = useT();

  const walkMinutes = Math.max(1, Math.round(leg.durationSeconds / 60));
  const walkDistance =
    leg.distanceMeters >= 1000
      ? `${(leg.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
      : leg.distanceMeters > 0
      ? `${leg.distanceMeters} m`
      : `${walkMinutes * 70} m`;

  const isFreeTransfer = Boolean(leg.isPaidAreaTransfer);
  const isFinalDestinationWalk = !leg.toStopId;
  const isStopToStopTransfer = Boolean(leg.fromStopId && leg.toStopId);

  if (leg.isUncoveredSegment) {
    return (
      <div className="flex flex-col gap-2 p-3 my-2 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--action-primary)]">
        <div className="text-[13px] leading-[18px] font-bold text-[var(--action-primary)]">
          {t('ladder.uncovered_segment')}
        </div>

        <div className="text-[13px] leading-[18px] text-[var(--text-primary)] font-medium">
          {t('journey.walk_distance', {
            distance: walkDistance,
            minutes: walkMinutes
          })}
        </div>

        <div className="text-[12px] leading-[16px] text-[var(--text-secondary)]">
          {t('ladder.closest_hint')}
        </div>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1"
          >
            <Button variant="secondary" size="compact" className="w-full text-[12px]">
              {t('ladder.open_maps_cta')}
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 my-2 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)]">
      {/* Walk summary */}
      <div className="flex items-center gap-2 text-[13px] leading-[18px] font-bold text-[var(--text-primary)]">
        <svg
          aria-hidden="true"
          className="w-4 h-4 text-[var(--line-walk)] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
        </svg>
        <span>
          {t('journey.walk_distance', {
            distance: walkDistance,
            minutes: walkMinutes
          })}
        </span>
      </div>

      {/* Facilities / Interchange Guide - only rendered for stop-to-stop transfers */}
      {isStopToStopTransfer && (leg.isSheltered || leg.isStepFree) && (
        <div className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
          {leg.isSheltered && `${t('journey.facility_sheltered')} `}
          {leg.isStepFree && t('journey.facility_step_free')}
        </div>
      )}

      {/* Card tap, paid area, or destination walk note */}
      <div className="flex items-center gap-2 text-[13px] leading-[18px] font-semibold text-[var(--text-primary)] pt-1 border-t border-[var(--rule)]">
        {isFinalDestinationWalk ? (
          <>
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-[var(--action-primary)] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t('journey.walk_to_destination')}</span>
          </>
        ) : (
          <>
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-[var(--action-primary)] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>
              {isFreeTransfer
                ? t('journey.paid_area_transfer')
                : t('journey.tap_instruction')}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
