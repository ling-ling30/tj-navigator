import React from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { useT } from '../../hooks/useT';

export interface JourneyTopBarProps {
  onBack: () => void;
  onOpenRadar: () => void;
}

export const JourneyTopBar: React.FC<JourneyTopBarProps> = ({ onBack, onOpenRadar }) => {
  const { t } = useT();

  return (
    <header className="flex items-center justify-between h-12 px-2 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-[var(--z-sticky)]">
      <IconButton
        label={t('nav.back')}
        variant="ghost"
        onClick={onBack}
        className="text-[18px] font-bold"
      >
        ‹
      </IconButton>

      <h1 className="text-[16px] leading-[24px] font-bold text-[var(--text-primary)]">
        {t('journey.title')}
      </h1>

      <button
        type="button"
        onClick={onOpenRadar}
        className="min-h-[var(--touch-target-min)] px-3 flex items-center gap-1.5 text-[13px] leading-[18px] font-bold text-[var(--action-primary)] hover:bg-[var(--surface-raised)] rounded-[var(--radius-control)] cursor-pointer"
      >
        <svg
          aria-hidden="true"
          className="w-4 h-4 text-[var(--action-primary)] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
        <span>Radar</span>
      </button>
    </header>
  );
};
