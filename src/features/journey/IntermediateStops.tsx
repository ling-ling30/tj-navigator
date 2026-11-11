import React, { useState } from 'react';
import { useT } from '../../hooks/useT';

export interface IntermediateStopsProps {
  stops?: string[];
  count?: number;
}

export const IntermediateStops: React.FC<IntermediateStopsProps> = ({
  stops = [],
  count
}) => {
  const { t } = useT();
  const [isExpanded, setIsExpanded] = useState(false);

  const displayCount = count || stops.length;
  if (displayCount <= 0) return null;

  return (
    <div className="flex flex-col my-1.5 pl-1">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[12px] leading-[16px] font-semibold text-[var(--action-primary)] hover:underline tactile-press cursor-pointer select-none py-1 rounded-[var(--radius-control)] self-start px-1 -ml-1"
      >
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5 tactile-chevron shrink-0"
          data-open={isExpanded}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
        <span>
          {isExpanded
            ? t('journey.intermediate_hide')
            : t('journey.intermediate_stops', { count: displayCount })}
        </span>
      </button>

      {stops.length > 0 && (
        <div
          className="accordion-panel"
          data-open={isExpanded}
          aria-hidden={!isExpanded}
        >
          <div className="accordion-inner flex flex-col gap-1.5 pl-3 border-l-2 border-[var(--border)] my-1.5">
            {stops.map((stopName, idx) => (
              <div
                key={`${idx}-${stopName}`}
                className="text-[12px] leading-[16px] text-[var(--text-secondary)] font-medium"
              >
                • {stopName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
