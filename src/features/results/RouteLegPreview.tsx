import React from 'react';
import { LineBadge } from '../../components/ui/LineBadge';
import type { Leg } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface RouteLegPreviewProps {
  legs: Leg[];
}

export const RouteLegPreview: React.FC<RouteLegPreviewProps> = ({ legs }) => {
  const { t } = useT();

  return (
    <div className="flex items-center flex-wrap gap-2 py-1">
      {legs.map((leg, index) => {
        const isLast = index === legs.length - 1;

        if (leg.type === 'WALK') {
          const walkMinutes = Math.max(1, Math.round(leg.durationSeconds / 60));
          return (
            <React.Fragment key={`walk-${index}`}>
              <div className="inline-flex items-center gap-1 text-[13px] leading-[18px] font-medium text-[var(--text-secondary)]">
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[var(--line-walk)] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
                </svg>
                <span className="tabular-nums">
                  {t('results.walk_chip', { minutes: walkMinutes })}
                </span>
              </div>
              {!isLast && (
                <svg
                  aria-hidden="true"
                  className="w-3 h-3 text-[var(--text-muted)] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={`transit-${index}-${leg.routeId}`}>
            <LineBadge
              mode={leg.mode}
              code={leg.routeShortName || leg.routeId}
            />
            {!isLast && (
              <svg
                aria-hidden="true"
                className="w-3 h-3 text-[var(--text-muted)] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
