import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { useTransitStore } from '../../lib/store/transit-store';
import type { WalkingTolerance, TransferTime } from '../../lib/router/v2/cost-profiles';
import { useT } from '../../hooks/useT';

export interface ConnectionFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionFilterSheet: React.FC<ConnectionFilterSheetProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useT();
  const { travelOptions, setTravelOptions } = useTransitStore();

  const maxTransferChoices: Array<{ label: string; value: number }> = [
    { label: t('options.transfers_direct'), value: 0 },
    { label: t('options.transfers_1'), value: 1 },
    { label: t('options.transfers_2'), value: 2 },
    { label: t('options.transfers_any'), value: 3 }
  ];

  const walkingChoices: Array<{ label: string; value: WalkingTolerance }> = [
    { label: t('options.walking_sedikit'), value: 'sedikit' },
    { label: t('options.walking_normal'), value: 'normal' },
    { label: t('options.walking_jauh'), value: 'jauh' }
  ];

  const transferTimeChoices: Array<{ label: string; value: TransferTime }> = [
    { label: t('options.transfer_time_normal'), value: 'normal' },
    { label: t('options.transfer_time_longgar'), value: 'longgar' }
  ];

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={t('options.title')}>
      <div className="p-4 flex flex-col gap-5">
        {/* Maximum Transfers */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            {t('options.max_transfers')}
          </label>
          <div className="flex flex-wrap gap-2">
            {maxTransferChoices.map(opt => (
              <Chip
                key={opt.value}
                active={travelOptions.maxTransfers === opt.value}
                showCheckmark
                onClick={() => setTravelOptions({ maxTransfers: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Walking */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            {t('options.walking')}
          </label>
          <div className="flex flex-wrap gap-2">
            {walkingChoices.map(opt => (
              <Chip
                key={opt.value}
                active={travelOptions.walking === opt.value}
                showCheckmark
                onClick={() => setTravelOptions({ walking: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Transfer Time */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            {t('options.transfer_time')}
          </label>
          <div className="flex flex-wrap gap-2">
            {transferTimeChoices.map(opt => (
              <Chip
                key={opt.value}
                active={travelOptions.transferTime === opt.value}
                showCheckmark
                onClick={() => setTravelOptions({ transferTime: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Premium Bus Switch */}
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--border)]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] leading-[18px] font-semibold text-[var(--text-primary)]">
              {t('options.premium_bus')}
            </span>
            <span className="text-[12px] leading-[16px] text-[var(--text-secondary)]">
              {t('options.premium_bus_note')}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={travelOptions.includePremium}
            aria-label={t('options.premium_bus')}
            onClick={() => setTravelOptions({ includePremium: !travelOptions.includePremium })}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 select-none ${
              travelOptions.includePremium ? 'bg-[var(--action-primary)]' : 'bg-[var(--border-strong)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-[var(--surface)] shadow-sm transition duration-150 ${
                travelOptions.includePremium ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Apply Action */}
        <Button variant="primary" fullWidth onClick={onClose} className="mt-2">
          {t('options.apply')}
        </Button>
      </div>
    </Sheet>
  );
};
