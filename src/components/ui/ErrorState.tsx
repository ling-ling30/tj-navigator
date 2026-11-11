import React from 'react';

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  retryLabel = 'Coba Lagi',
  onRetry,
  className = ''
}) => {
  return (
    <div
      role="alert"
      className={`p-4 rounded-[var(--radius-card)] border border-[var(--status-delayed)] bg-[var(--status-delayed-surface)] text-[var(--status-delayed-text)] ${className}`.trim()}
    >
      <div className="font-semibold text-[14px] leading-[20px]">{title}</div>
      {message && (
        <div className="text-[12px] leading-[16px] mt-1 opacity-90">{message}</div>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--status-delayed)] text-[var(--text-inverse)] text-[12px] leading-[16px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};
