import React from 'react';
import { LineBadge } from '../../components/ui/LineBadge';
import type { Leg } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface RouteLegPreviewProps {
  legs: Leg[];
}

/** A walk shorter than this is a platform change, not worth a chip in the summary. */
const SHORT_WALK_SEC = 180;
/** Lines shown by name on a pooled leg before "+n". */
const MAX_LINE_NAMES = 3;

const Arrow: React.FC = () => (
  <svg aria-hidden="true" className="w-3 h-3 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const WalkChip: React.FC<{ label: string }> = ({ label }) => (
  <div className="inline-flex items-center gap-1 min-h-[var(--badge-height)] h-6 px-2 rounded-[var(--radius-badge)] bg-[var(--surface-raised)] border border-[var(--border)] text-[12px] leading-[16px] font-medium text-[var(--text-secondary)]">
    <svg aria-hidden="true" className="w-3.5 h-3.5 text-[var(--line-walk)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
    </svg>
    <span className="tabular-nums">{label}</span>
  </div>
);

const RideBadge: React.FC<{ leg: Leg }> = ({ leg }) => {
  const lines = leg.lineNames && leg.lineNames.length > 0 ? leg.lineNames : [leg.routeShortName || leg.routeId || ''];
  const others = lines.slice(1, MAX_LINE_NAMES);
  const more = lines.length - MAX_LINE_NAMES;
  return (
    <div className="inline-flex items-center gap-1 shrink-0">
      <LineBadge mode={leg.mode} code={lines[0]} />
      {others.length > 0 && (
        <span className="text-[12px] leading-[16px] font-medium text-[var(--text-secondary)]">
          {`· ${others.join(' · ')}${more > 0 ? ` +${more}` : ''}`}
        </span>
      )}
    </div>
  );
};

export const RouteLegPreview: React.FC<RouteLegPreviewProps> = ({ legs }) => {
  const { t } = useT();
  const hasRide = legs.some(leg => leg.type === 'TRANSIT');
  const shown = legs.filter(leg => leg.type === 'TRANSIT' || !hasRide || leg.durationSeconds >= SHORT_WALK_SEC);

  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5 py-0.5">
      {shown.map((leg, index) => (
        // The arrow travels with the item that follows it, so a row never ends on a dangling arrow
        <span key={`${leg.type}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 && <Arrow />}
          {leg.type === 'WALK' ? (
            <WalkChip label={t('results.walk_chip', { minutes: Math.max(1, Math.round(leg.durationSeconds / 60)) })} />
          ) : (
            <RideBadge leg={leg} />
          )}
        </span>
      ))}
    </div>
  );
};
