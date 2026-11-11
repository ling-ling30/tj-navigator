import React, { useEffect } from 'react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
  maxHeight = 'max-h-[85vh]'
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-sheet)] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={`relative z-10 w-full bg-[var(--surface)] border-t border-[var(--border)] rounded-t-[var(--radius-sheet)] shadow-[var(--shadow-sheet)] flex flex-col ${maxHeight} overflow-hidden`}
      >
        {/* Drag Handle Indicator */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Optional Header */}
        {(title || headerRight) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--rule)] shrink-0">
            {title ? (
              <h2 className="text-[16px] leading-[24px] font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
            ) : (
              <div />
            )}
            {headerRight}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
