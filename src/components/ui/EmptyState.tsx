import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--border-strong)] rounded-[var(--radius-card)] bg-[var(--surface-raised)] ${className}`.trim()}
    >
      {icon && <div className="mb-3 text-[var(--text-muted)]">{icon}</div>}
      <h3 className="text-[16px] leading-[24px] font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      <p className="text-[12px] leading-[16px] text-[var(--text-secondary)] max-w-sm mb-4">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
