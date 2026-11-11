import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost';
  size?: 'normal' | 'compact';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold tactile-press select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-[14px] leading-[20px] rounded-[var(--radius-control)]';

  const sizeStyles =
    size === 'normal'
      ? 'min-h-[var(--touch-target-min)] px-4 py-3'
      : 'min-h-[var(--button-compact-height)] px-3 py-1.5 text-[12px] leading-[16px]';

  const variantStyles = {
    primary:
      'bg-[var(--action-primary)] text-[var(--text-inverse)] hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-active)]',
    secondary:
      'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-active)]',
    subtle:
      'bg-[var(--action-primary-surface)] text-[var(--action-primary)] hover:opacity-90',
    ghost:
      'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
  }[variant];

  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyles} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
