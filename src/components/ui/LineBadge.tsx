import React from 'react';
import { TransitMode, type TransitModeType } from '../../types/transit';

export type LineBadgeMode = TransitModeType | 'WALK' | 'TJ' | 'KRL' | 'MRT' | 'LRT' | 'MIKRO';

export interface LineBadgeProps {
  mode?: LineBadgeMode;
  code?: string;
  name?: string;
  customColor?: string;
  className?: string;
}

export const LineBadge: React.FC<LineBadgeProps> = ({
  mode,
  code,
  name,
  customColor,
  className = ''
}) => {
  let bgColor = 'var(--line-walk)';
  let defaultLabel = 'Walk';

  if (mode === TransitMode.BRT || mode === TransitMode.NON_BRT || mode === 'TJ') {
    bgColor = 'var(--line-tj)';
    defaultLabel = 'TJ';
  } else if (mode === TransitMode.COMMUTER_RAIL || mode === 'KRL') {
    bgColor = 'var(--line-krl)';
    defaultLabel = 'KRL';
  } else if (mode === TransitMode.MRT || mode === 'MRT') {
    bgColor = 'var(--line-mrt)';
    defaultLabel = 'MRT';
  } else if (mode === TransitMode.LRT || mode === 'LRT') {
    bgColor = 'var(--line-lrt)';
    defaultLabel = 'LRT';
  } else if (mode === TransitMode.MIKROTRANS || mode === 'MIKRO') {
    bgColor = 'var(--line-mikro)';
    defaultLabel = 'Mikro';
  } else if (mode === 'WALK') {
    bgColor = 'var(--line-walk)';
    defaultLabel = 'Jalan';
  }

  if (customColor && customColor.startsWith('var(--')) {
    bgColor = customColor;
  }

  const label = code || name || defaultLabel;

  return (
    <span
      style={{ backgroundColor: bgColor }}
      className={`inline-flex items-center justify-center min-h-[var(--badge-height)] h-6 px-2 rounded-[var(--radius-badge)] text-[12px] leading-[16px] font-bold text-[var(--text-inverse)] select-none shrink-0 ${className}`.trim()}
    >
      {label}
    </span>
  );
};
