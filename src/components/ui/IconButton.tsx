import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  variant = 'ghost',
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] w-12 h-12 rounded-[var(--radius-control)] tactile-press select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

  const variantStyles = {
    primary:
      'bg-[var(--action-primary)] text-[var(--text-inverse)] hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-active)]',
    secondary:
      'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-active)]',
    ghost:
      'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-active)]'
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${baseStyles} ${variantStyles} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
