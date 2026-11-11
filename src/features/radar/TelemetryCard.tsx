import React from 'react';
import { useT } from '../../hooks/useT';
import type { RadarDiagnostic } from '../../hooks/useLiveRadar';

export interface TelemetryCardProps {
  diagnostic: RadarDiagnostic;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({ diagnostic }) => {
  const { t } = useT();

  return (
    <div className="flex flex-col gap-3">
      {/* Bottleneck Warning Card */}
      <div className="p-4 rounded-[var(--radius-card)] border border-[var(--status-warning)] bg-[var(--status-warning-surface)] text-[var(--status-warning-text)] flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold text-[14px] leading-[20px]">
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-[var(--status-warning-text)] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{t('radar.bottleneck_title')}</span>
        </div>

        <p className="text-[13px] leading-[18px] opacity-90">
          {t('radar.bottleneck_desc', { location: diagnostic.location })}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--status-warning)]/30 text-[13px] leading-[18px]">
          <span>
            Estimasi normal: <span className="line-through tabular-nums">{diagnostic.normalMinutes} mnt</span>
          </span>
          <span className="font-bold tabular-nums">
            Revisi: {diagnostic.minMinutes}–{diagnostic.maxMinutes} mnt
          </span>
        </div>
      </div>

      {/* Fleet Telemetry Specs */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[12px] leading-[16px] text-[var(--text-secondary)] font-medium mb-1">
            Armada
          </div>
          <div className="text-[14px] leading-[20px] font-bold text-[var(--text-primary)] truncate">
            {diagnostic.vehicleId}
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[12px] leading-[16px] text-[var(--text-secondary)] font-medium mb-1">
            Kecepatan
          </div>
          <div className="text-[14px] leading-[20px] font-bold text-[var(--text-primary)] tabular-nums">
            {diagnostic.speedKmh} km/h
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[12px] leading-[16px] text-[var(--text-secondary)] font-medium mb-1">
            Kapasitas
          </div>
          <div className="text-[14px] leading-[20px] font-bold text-[var(--status-warning-text)] tabular-nums">
            {diagnostic.occupancyPercent}%
          </div>
        </div>
      </div>
    </div>
  );
};
