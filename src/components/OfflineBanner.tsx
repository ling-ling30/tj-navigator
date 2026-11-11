import React, { useState, useEffect } from 'react';
import { useT } from '../hooks/useT';

export const OfflineBanner: React.FC = () => {
  const { t } = useT();
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="w-full px-4 py-2 bg-[var(--status-warning-surface)] text-[var(--status-warning-text)] border-b border-[var(--status-warning)] flex items-center justify-center gap-2 text-[13px] leading-[18px] font-medium select-none text-center"
    >
      <svg
        aria-hidden="true"
        className="w-4 h-4 text-[var(--status-warning-text)] shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{t('state.offline_banner')}</span>
    </aside>
  );
};
