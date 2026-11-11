import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  showCheckmark?: boolean;
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  active = false,
  showCheckmark = false,
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
      aria-pressed={active}
      className={`${baseStyles} ${stateStyles} ${className}`.trim()}
      {...props}
    >
      {showCheckmark && active && (
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5 mr-1 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
