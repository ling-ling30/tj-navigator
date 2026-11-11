import React from 'react';

export interface ListRowProps {
  prefix?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  prefix,
  title,
  subtitle,
  meta,
  trailing,
  onClick,
  className = ''
}) => {
  const isInteractive = Boolean(onClick);

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex items-center min-h-[var(--touch-target-min)] py-3 px-4 gap-3 border-b border-[var(--rule)] last:border-b-0 ${
        isInteractive
          ? 'tactile-row cursor-pointer hover:bg-[var(--surface-raised)] active:bg-[var(--surface-active)]'
          : ''
      } ${className}`.trim()}
    >
      {prefix && <div className="shrink-0">{prefix}</div>}

      <div className="flex-1 min-w-0">
        <div
          title={typeof title === 'string' ? title : undefined}
          className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)] truncate"
        >
          {title}
        </div>
        {subtitle && (
          <div
            title={typeof subtitle === 'string' ? subtitle : undefined}
            className="text-[12px] leading-[16px] text-[var(--text-secondary)] truncate mt-0.5"
          >
            {subtitle}
          </div>
        )}
      </div>

      {(meta || trailing) && (
        <div className="flex items-center gap-2 shrink-0 text-right">
          {meta && (
            <div className="text-[12px] leading-[16px] tabular-nums text-[var(--text-muted)] font-medium">
              {meta}
            </div>
          )}
          {trailing && <div className="text-[var(--text-muted)]">{trailing}</div>}
        </div>
      )}
    </div>
  );
};
