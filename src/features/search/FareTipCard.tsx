import React from 'react';
import { Card } from '../../components/ui/Card';
import { useT } from '../../hooks/useT';

export const FareTipCard: React.FC = () => {
  const { t } = useT();

  return (
    <Card variant="surface" padding="sm" className="flex items-start gap-2.5">
      <svg
        aria-hidden="true"
        className="w-4 h-4 text-[var(--action-primary)] shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-[12px] leading-[16px] text-[var(--text-secondary)] font-normal">
        {t('status.fare_tip')}
      </p>
    </Card>
  );
};
