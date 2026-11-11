import React from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { useT } from '../../hooks/useT';

export interface JourneyTopBarProps {
  onBack: () => void;
}

export const JourneyTopBar: React.FC<JourneyTopBarProps> = ({ onBack }) => {
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

      <div className="w-10" aria-hidden="true" />
    </header>
  );
};
