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
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[12px] leading-[16px] font-semibold text-[var(--action-primary)] hover:underline cursor-pointer select-none py-1"
      >
        <span>{isExpanded ? '▲' : '▼'}</span>
        <span>
          {isExpanded
            ? t('journey.intermediate_hide')
            : t('journey.intermediate_stops', { count: displayCount })}
        </span>
      </button>

      {isExpanded && stops.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-[var(--border)] my-1.5">
          {stops.map((stopName, idx) => (
            <div
              key={`${idx}-${stopName}`}
              className="text-[12px] leading-[16px] text-[var(--text-secondary)] font-medium"
            >
              • {stopName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
