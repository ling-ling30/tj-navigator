import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'raised' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'surface',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'rounded-[var(--radius-card)] border border-[var(--border)] transition-colors duration-150';

  const variantStyles = {
    surface: 'bg-[var(--surface)] text-[var(--text-primary)]',
    raised: 'bg-[var(--surface-raised)] text-[var(--text-primary)]',
    interactive:
      'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-active)] cursor-pointer'
  }[variant];

  const paddingStyles = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  }[padding];

  const isInteractive = variant === 'interactive' || Boolean(props.onClick);

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onClick?.(e as any);
              }
            }
          : undefined
      }
      className={`${baseStyles} ${variantStyles} ${paddingStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
