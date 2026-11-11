import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import type { EnrichedStop } from '../../hooks/useStopAutocomplete';
import { useT } from '../../hooks/useT';

export interface CustomPointEditorProps {
  coord: { lat: number; lon: number };
  onSelect: (stop: EnrichedStop) => void;
}

export interface FavoritePlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const FAVORITES_STORAGE_KEY = 'tj_favorite_places';

export function getSavedFavorites(): FavoritePlace[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavoritePlace(fav: FavoritePlace): void {
  try {
    const list = getSavedFavorites().filter(f => f.id !== fav.id);
    list.unshift(fav);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {}
}

export const CustomPointEditor: React.FC<CustomPointEditorProps> = ({ coord, onSelect }) => {
  const { t } = useT();
  const [customName, setCustomName] = useState('');
  const [saveAsFav, setSaveAsFav] = useState(false);

  const displayCoord = `${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`;
  const resolvedName = customName.trim() || displayCoord;

  const handleUsePoint = () => {
    if (saveAsFav && customName.trim()) {
      saveFavoritePlace({
        id: `fav:${coord.lat.toFixed(5)},${coord.lon.toFixed(5)}`,
        name: customName.trim(),
        lat: coord.lat,
        lon: coord.lon
      });
    }

    const stop: EnrichedStop = {
      index: -1,
      id: `coord:${coord.lat.toFixed(5)},${coord.lon.toFixed(5)}`,
      name: resolvedName,
      lat: coord.lat,
      lon: coord.lon,
      mode: 0,
      isCustomPoint: true,
      customLabel: customName.trim() || undefined,
      description: displayCoord
    };

    onSelect(stop);
  };

  return (
    <Card className="m-4 p-4 border border-[var(--border-focus)] bg-[var(--surface-raised)] space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[18px]">📍</span>
        <div>
          <div className="text-[14px] font-bold text-[var(--text-primary)]">
            {t('picker.custom_point_title')}
          </div>
          <div className="text-[12px] text-[var(--text-muted)] tabular-nums">
            {displayCoord}
          </div>
        </div>
      </div>

      <input
        type="text"
        placeholder={t('picker.custom_name_placeholder')}
        value={customName}
        onChange={e => setCustomName(e.target.value)}
        className="w-full h-10 px-3 text-[14px] bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
      />

      <div className="flex items-center gap-2">
        <Chip
          active={customName === t('picker.fav_home')}
          onClick={() => setCustomName(t('picker.fav_home'))}
        >
          🏠 {t('picker.fav_home')}
        </Chip>
        <Chip
          active={customName === t('picker.fav_office')}
          onClick={() => setCustomName(t('picker.fav_office'))}
        >
          🏢 {t('picker.fav_office')}
        </Chip>
        <button
          type="button"
          onClick={() => setSaveAsFav(!saveAsFav)}
          className={`text-[12px] ml-auto font-medium cursor-pointer ${saveAsFav ? 'text-[var(--action-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}
        >
          {saveAsFav ? '✓ ' + t('picker.save_favorite') : '+ ' + t('picker.save_favorite')}
        </button>
      </div>

      <Button
        variant="primary"
        size="compact"
        className="w-full mt-2"
        onClick={handleUsePoint}
      >
        {t('picker.use_point')}
      </Button>
    </Card>
  );
};
