import React from 'react';
import { Button } from '../../components/ui/Button';
import { useT } from '../../hooks/useT';
import { useTransitStore } from '../../lib/store/transit-store';

/** How far "earlier" and "later" move the departure. */
const SHIFT_MS = 15 * 60 * 1000;

function clock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Lets the traveller look at leaving earlier or later: what can I take if I miss this one? */
export const DepartureShiftBar: React.FC = () => {
  const { t } = useT();
  const departAtMs = useTransitStore(state => state.departAtMs);
  const setDepartAt = useTransitStore(state => state.setDepartAt);
  const base = departAtMs ?? Date.now();

  // Earlier than now makes no sense: it falls back to "now"
  const earlier = () => setDepartAt(base - SHIFT_MS <= Date.now() ? null : base - SHIFT_MS);
  const later = () => setDepartAt(base + SHIFT_MS);

  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" size="compact" onClick={earlier} disabled={departAtMs === null}>
        {t('results.earlier')}
      </Button>
      <span className="text-[13px] leading-[18px] text-[var(--text-secondary)] tabular-nums">
        {departAtMs === null ? t('results.depart_now') : t('results.depart_at', { time: clock(base) })}
      </span>
      <Button variant="secondary" size="compact" onClick={later}>
        {t('results.later')}
      </Button>
    </div>
  );
};
