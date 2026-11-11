import React, { useState } from 'react';
import { ListRow } from '../../components/ui/ListRow';
import type { EnrichedStop } from '../../hooks/useStopAutocomplete';
import { useT } from '../../hooks/useT';

export interface LocationDetectorRowProps {
  onSelect: (stop: EnrichedStop) => void;
}

type GeoState = 'idle' | 'asking' | 'denied' | 'unavailable' | 'timeout';

export const LocationDetectorRow: React.FC<LocationDetectorRowProps> = ({ onSelect }) => {
  const { t } = useT();
  const [geoState, setGeoState] = useState<GeoState>('idle');

  const handleGetLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('unavailable');
      return;
    }

    setGeoState('asking');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState('idle');
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const stop: EnrichedStop = {
          index: -1,
          id: `coord:${lat.toFixed(5)},${lon.toFixed(5)}`,
          name: t('picker.my_location'),
          lat,
          lon,
          mode: 0,
          isCustomPoint: true,
          description: `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        };
        onSelect(stop);
      },
      (err) => {
        if (err.code === 1) {
          setGeoState('denied');
        } else if (err.code === 2) {
          setGeoState('unavailable');
        } else if (err.code === 3) {
          setGeoState('timeout');
        } else {
          setGeoState('unavailable');
        }
      },
      {
        timeout: 10000,
        maximumAge: 60000,
        enableHighAccuracy: true
      }
    );
  };

  const getStatusSubtitle = () => {
    switch (geoState) {
      case 'asking':
        return t('picker.geo_asking');
      case 'denied':
        return t('picker.geo_denied');
      case 'unavailable':
        return t('picker.geo_unavailable');
      case 'timeout':
        return t('picker.geo_timeout');
      default:
        return undefined;
    }
  };

  const isError = geoState === 'denied' || geoState === 'unavailable' || geoState === 'timeout';

  return (
    <ListRow
      prefix={
        <div className="w-8 h-8 rounded-full bg-[var(--action-primary)] text-white flex items-center justify-center text-[14px]">
          {geoState === 'asking' ? (
            <span className="animate-spin text-[12px]">⟳</span>
          ) : (
            <span>📍</span>
          )}
        </div>
      }
      title={
        <span className="font-bold text-[var(--action-primary)]">
          {t('picker.my_location')}
        </span>
      }
      subtitle={
        getStatusSubtitle() ? (
          <span className={isError ? 'text-red-500 font-medium' : 'text-[var(--text-secondary)]'}>
            {getStatusSubtitle()}
          </span>
        ) : undefined
      }
      onClick={handleGetLocation}
      className="bg-[var(--surface)] hover:bg-[var(--surface-raised)] border-b border-[var(--border)]"
    />
  );
};
