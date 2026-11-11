import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import type { SearchFilters } from '../../hooks/useTransitSearch';
import { useT } from '../../hooks/useT';

export interface ConnectionFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChangeFilters: (filters: SearchFilters) => void;
}

export const ConnectionFilterSheet: React.FC<ConnectionFilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onChangeFilters
}) => {
  const { t } = useT();

  const transferOptions = [
    { label: t('search.mode_all'), value: null },
    { label: t('results.direct'), value: 0 },
    { label: 'Maks. 1 Transit', value: 1 },
    { label: 'Maks. 2 Transit', value: 2 }
  ];

  const sortOptions = [
    { label: t('results.fastest_badge'), value: 'fastest' as const },
    { label: t('results.least_transfers'), value: 'fewest_transfers' as const },
    { label: 'Termurah', value: 'cheapest' as const }
  ];

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={t('results.filter_title')}>
      <div className="p-4 flex flex-col gap-5">
        {/* Maximum Transfers */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            {t('results.filter_max_transfers')}
          </label>
          <div className="flex flex-wrap gap-2">
            {transferOptions.map(opt => (
              <Chip
                key={opt.label}
                active={filters.maxTransfers === opt.value}
                onClick={() =>
                  onChangeFilters({ ...filters, maxTransfers: opt.value })
                }
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Sort Strategy */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">
            Urutkan Berdasarkan
          </label>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map(opt => (
              <Chip
                key={opt.label}
                active={filters.sortBy === opt.value}
                onClick={() =>
                  onChangeFilters({ ...filters, sortBy: opt.value })
                }
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button variant="primary" fullWidth onClick={onClose} className="mt-2">
          {t('results.filter_apply')}
        </Button>
      </div>
    </Sheet>
  );
};
