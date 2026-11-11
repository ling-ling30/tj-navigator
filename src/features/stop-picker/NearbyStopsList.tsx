import React from 'react';
import { ListRow } from '../../components/ui/ListRow';
import { LineBadge } from '../../components/ui/LineBadge';
import { getSavedFavorites } from './CustomPointEditor';
import type { EnrichedStop } from '../../hooks/useStopAutocomplete';
import { useT } from '../../hooks/useT';

export interface NearbyStopsListProps {
  stops: EnrichedStop[];
  onSelect: (stop: EnrichedStop) => void;
}

export const NearbyStopsList: React.FC<NearbyStopsListProps> = ({ stops, onSelect }) => {
  const { t } = useT();
  const favorites = getSavedFavorites();

  return (
    <div className="flex flex-col">
      {favorites.length > 0 && (
        <>
          <div className="px-4 py-2 text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] border-b border-[var(--rule)]">
            {t('picker.favorites_header')}
          </div>
          <div>
            {favorites.map(fav => (
              <ListRow
                key={fav.id}
                prefix={
                  <div className="w-6 h-6 rounded-full bg-[var(--action-primary)] text-white flex items-center justify-center text-[12px]">
                    ⭐
                  </div>
                }
                title={fav.name}
                subtitle={`${fav.lat.toFixed(5)}, ${fav.lon.toFixed(5)}`}
                onClick={() =>
                  onSelect({
                    index: -1,
                    id: fav.id,
                    name: fav.name,
                    lat: fav.lat,
                    lon: fav.lon,
                    mode: 0,
                    isCustomPoint: true,
                    description: `${fav.lat.toFixed(5)}, ${fav.lon.toFixed(5)}`
                  })
                }
              />
            ))}
          </div>
        </>
      )}

      <div className="px-4 py-2 text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] border-b border-[var(--rule)]">
        {t('picker.nearby_header')}
      </div>
      <div>
        {stops.map(stop => (
          <ListRow
            key={stop.id}
            prefix={<LineBadge mode={stop.mode} />}
            title={stop.name}
            subtitle={stop.description}
            trailing={
              stop.routeCodes && stop.routeCodes.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1 max-w-[130px] justify-end">
                  {stop.routeCodes.map(rc => (
                    <span
                      key={rc}
                      className="text-[11px] leading-[14px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--action-primary)]"
                    >
                      {rc}
                    </span>
                  ))}
                </div>
              ) : undefined
            }
            onClick={() => onSelect(stop)}
          />
        ))}
      </div>
    </div>
  );
};
