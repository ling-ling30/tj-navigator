import React from 'react';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefixIcon?: React.ReactNode;
  onClear?: () => void;
  action?: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  prefixIcon,
  onClear,
  action,
  value,
  className = '',
  disabled,
  ...props
}) => {
  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`.trim()}>
      {label && (
        <label className="text-[13px] leading-[18px] font-semibold text-[var(--text-secondary)]">
          {label}
        </label>
      )}

      <div className="relative flex items-center min-h-[var(--control-height)] h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] focus-within:border-[var(--action-primary)] transition-colors duration-150">
        {prefixIcon && (
          <div className="flex items-center justify-center w-10 shrink-0 text-[var(--text-muted)]">
            {prefixIcon}
          </div>
        )}

        <input
          value={value}
          disabled={disabled}
          className={`flex-1 min-w-0 h-full bg-transparent text-[14px] leading-[20px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none ${
            prefixIcon ? 'pl-0' : 'pl-3'
          } ${hasValue && onClear ? 'pr-1' : 'pr-3'}`}
          {...props}
        />

        {hasValue && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center justify-center min-w-[36px] min-h-[36px] w-9 h-9 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer mr-1"
            aria-label="Hapus teks"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {action && <div className="shrink-0 mr-2">{action}</div>}
      </div>
    </div>
  );
};
