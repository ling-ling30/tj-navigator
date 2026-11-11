import React, { useState } from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { useT } from '../../hooks/useT';

export interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (timeLabel: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTime
}) => {
  const { t } = useT();
  const [customTime, setCustomTime] = useState('07:30');

  const handleSelectNow = () => {
    onSelectTime(t('search.depart_now'));
    onClose();
  };

  const handleApplyCustom = () => {
    onSelectTime(t('search.depart_time', { time: customTime }));
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
          <span className="text-[12px] leading-[16px] text-[var(--text-muted)]">atau</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Custom Departure Time Input */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            Tentukan Jam Keberangkatan
          </label>
          <input
            type="time"
            value={customTime}
            onChange={e => setCustomTime(e.target.value)}
            className="w-full min-h-[var(--control-height)] px-4 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] text-[16px] leading-[24px] font-semibold tabular-nums text-[var(--text-primary)]"
          />
        </div>

        <Button variant="primary" fullWidth onClick={handleApplyCustom}>
          {t('results.filter_apply')}
        </Button>
      </div>
    </Sheet>
  );
};
