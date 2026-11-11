import React from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { Button } from '../../components/ui/Button';
import { LineBadge } from '../../components/ui/LineBadge';
import { DepartureBoard } from './DepartureBoard';
import { TelemetryCard } from './TelemetryCard';
import { useLiveRadar } from '../../hooks/useLiveRadar';
import { useT } from '../../hooks/useT';
import { TransitMode } from '../../types/transit';

export const LiveRadarScreen: React.FC = () => {
  const { t } = useT();
  const {
    currentStop,
    departures,
    diagnostic,
    refresh,
    planFromHere,
    close
  } = useLiveRadar();

  return (
    <div className="flex flex-col min-h-screen bg-[var(--ground)]">
      {/* 48px Top Bar */}
      <header className="flex items-center justify-between h-12 px-2 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-[var(--z-sticky)]">
        <IconButton
          label={t('nav.back')}
          variant="ghost"
          onClick={close}
          className="text-[18px] font-bold"
        >
          ‹
        </IconButton>

        <div className="flex-1 min-w-0 text-center px-2">
          <h1 className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] truncate">
            {currentStop.name}
          </h1>
        </div>

        <IconButton
          label={t('nav.refresh')}
          variant="ghost"
          onClick={refresh}
          className="text-[16px]"
        >
          ↻
        </IconButton>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-4 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full pb-24">
        {/* Stop Overview Card */}
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[16px] leading-[24px] font-bold text-[var(--text-primary)]">
                {currentStop.name}
              </div>
              <div className="text-[13px] leading-[18px] text-[var(--text-secondary)] mt-0.5">
                {t('state.stale_data', { minutes: 1 })}
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-badge)] bg-[var(--status-on-time-surface)] text-[var(--status-on-time-text)] text-[12px] font-semibold">
              ● Live
            </span>
          </div>

          {/* Served Routes Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--rule)]">
            <LineBadge mode={TransitMode.BRT} code="1" />
            <LineBadge mode={TransitMode.NON_BRT} code="6C" />
            <LineBadge mode={TransitMode.BRT} code="4C" />
            <LineBadge mode={TransitMode.MRT} code="M1" />
          </div>
        </div>

        {/* Departure Board */}
        <DepartureBoard departures={departures} />

        {/* Bottleneck Diagnostic Telemetry */}
        {diagnostic.delayMinutes > 0 && (
          <TelemetryCard diagnostic={diagnostic} />
        )}
      </main>

      {/* Sticky Bottom Action */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--surface)] border-t border-[var(--border)] z-[var(--z-sticky)]">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
          <Button variant="primary" fullWidth onClick={planFromHere}>
            {t('radar.plan_from_here')}
          </Button>
        </div>
      </footer>
    </div>
  );
};
