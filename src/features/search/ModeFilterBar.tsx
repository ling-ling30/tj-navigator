import React from 'react';
import { Chip } from '../../components/ui/Chip';
import { ModeGroup } from '../../types/network-v2';
import { useTransitStore } from '../../lib/store/transit-store';
import { useT } from '../../hooks/useT';

const ALL_MODE_GROUPS = [
  ModeGroup.BRT,
  ModeGroup.BUS,
  ModeGroup.MIKROTRANS,
  ModeGroup.KRL,
  ModeGroup.MRT,
  ModeGroup.LRT
];

export interface ModeFilterBarProps {
  className?: string;
  showTitle?: boolean;
}

export const ModeFilterBar: React.FC<ModeFilterBarProps> = ({
  className = '',
  showTitle = true
}) => {
  const { t } = useT();
  const { selectedModes, toggleMode, setSelectedModes } = useTransitStore();

  const isAll = ALL_MODE_GROUPS.every(g => selectedModes.includes(g));

  const modeItems: Array<{ id: string; label: string; group?: number }> = [
    { id: 'all', label: t('search.mode_all') },
    { id: 'brt', label: t('search.mode_brt'), group: ModeGroup.BRT },
    { id: 'bus', label: t('search.mode_bus'), group: ModeGroup.BUS },
    { id: 'mikro', label: t('search.mode_mikro'), group: ModeGroup.MIKROTRANS },
    { id: 'krl', label: t('search.mode_krl'), group: ModeGroup.KRL },
    { id: 'mrt', label: t('search.mode_mrt'), group: ModeGroup.MRT },
    { id: 'lrt', label: t('search.mode_lrt'), group: ModeGroup.LRT }
  ];

  const handleClick = (group?: number) => {
    if (group === undefined) {
      setSelectedModes(ALL_MODE_GROUPS);
    } else {
      toggleMode(group);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      {showTitle && (
        <div className="text-[13px] leading-[18px] font-semibold text-[var(--text-secondary)]">
          {t('search.modes_header')}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {modeItems.map(item => {
          const isActive = item.group === undefined ? isAll : selectedModes.includes(item.group);
          return (
            <Chip
              key={item.id}
              active={isActive}
              showCheckmark
              onClick={() => handleClick(item.group)}
            >
              {item.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
};
