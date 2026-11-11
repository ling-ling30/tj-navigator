import React, { useState, useEffect } from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { useTransitStore } from '../../lib/store/transit-store';
import { useT } from '../../hooks/useT';

export interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useT();
  const { departAtMs, setDepartAt } = useTransitStore();

  const getInitialTime = (): string => {
    const d = departAtMs ? new Date(departAtMs) : new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [customTime, setCustomTime] = useState(getInitialTime);

  useEffect(() => {
    if (isOpen) {
      setCustomTime(getInitialTime());
    }
  }, [isOpen, departAtMs]);

  const handleSelectNow = () => {
    setDepartAt(null);
    onClose();
  };

  const handleApplyCustom = () => {
    const parts = customTime.split(':').map(Number);
    const hh = Number.isFinite(parts[0]) ? parts[0] : 8;
    const mm = Number.isFinite(parts[1]) ? parts[1] : 0;
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    setDepartAt(target.getTime());
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={t('search.depart_now')}>
      <div className="p-4 flex flex-col gap-4">
        {/* Instant Depart Now Option */}
        <Button variant="secondary" fullWidth onClick={handleSelectNow}>
          {t('search.depart_now')}
        </Button>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[12px] leading-[16px] text-[var(--text-muted)]">
            {t('journey.conjunction_or')}
          </span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Custom Departure Time Input */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            {t('search.depart_time', { time: customTime })}
          </label>
          <input
            type="time"
            value={customTime}
            onChange={e => setCustomTime(e.target.value)}
            className="w-full min-h-[var(--control-height)] px-4 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] text-[16px] leading-[24px] font-semibold tabular-nums text-[var(--text-primary)]"
          />
        </div>

        <Button variant="primary" fullWidth onClick={handleApplyCustom}>
          {t('options.apply')}
        </Button>
      </div>
    </Sheet>
  );
};
