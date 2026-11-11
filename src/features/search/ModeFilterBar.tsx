import React from 'react';
import { Chip } from '../../components/ui/Chip';
import { TransitMode } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface ModeFilterBarProps {
  selectedMode: number | null;
  onSelectMode: (mode: number | null) => void;
}

export const ModeFilterBar: React.FC<ModeFilterBarProps> = ({
  selectedMode,
  onSelectMode
}) => {
  const { t } = useT();

  const modes = [
    { label: t('search.mode_all'), value: null },
    { label: t('search.mode_tj'), value: TransitMode.BRT },
    { label: t('search.mode_krl'), value: TransitMode.COMMUTER_RAIL },
    { label: t('search.mode_mrt'), value: TransitMode.MRT },
    { label: t('search.mode_lrt'), value: TransitMode.LRT },
    { label: t('search.mode_mikro'), value: TransitMode.MIKROTRANS }
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] leading-[18px] font-semibold text-[var(--text-secondary)]">
        {t('search.modes_header')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {modes.map(mode => (
          <Chip
            key={mode.label}
            active={selectedMode === mode.value}
            onClick={() => onSelectMode(mode.value)}
          >
            {mode.label}
          </Chip>
        ))}
      </div>
    </div>
  );
};
