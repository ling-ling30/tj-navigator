import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  active = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center min-h-[var(--button-compact-height)] px-3 py-1.5 rounded-[var(--radius-control)] text-[13px] leading-[18px] font-medium transition-colors duration-150 select-none cursor-pointer whitespace-nowrap border';

  const stateStyles = active
    ? 'bg-[var(--action-primary-surface)] text-[var(--action-primary)] border-[var(--action-primary)] font-semibold'
    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]';

  return (
    <button
      type="button"
      className={`${baseStyles} ${stateStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
