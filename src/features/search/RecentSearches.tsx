import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import type { StopEntity } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface RecentTrip {
  id: string;
  originName: string;
  destName: string;
  originId: string;
  destId: string;
  originStop?: StopEntity;
  destStop?: StopEntity;
  timestamp: number;
}

export interface RecentSearchesProps {
  onSelectTrip: (trip: RecentTrip) => void;
}

const STORAGE_KEY = 'tj_recent_searches';
const MAX_RECENTS = 5;

export function getStoredRecentTrips(): RecentTrip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentTrip(trip: Omit<RecentTrip, 'id' | 'timestamp'>): void {
  try {
    const existing = getStoredRecentTrips().filter(
      item => !(item.originId === trip.originId && item.destId === trip.destId)
    );
    const updated: RecentTrip[] = [
      {
        id: `recent-${Date.now()}`,
        timestamp: Date.now(),
        ...trip
      },
      ...existing
    ].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({ onSelectTrip }) => {
  const { t } = useT();
  const [trips, setTrips] = useState<RecentTrip[]>([]);

  useEffect(() => {
    setTrips(getStoredRecentTrips());
  }, []);

  if (trips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] leading-[18px] font-semibold text-[var(--text-secondary)]">
        {t('search.recents_header')}
      </div>
      <div className="flex flex-col gap-2">
        {trips.map(trip => (
          <Card
            key={trip.id}
            variant="interactive"
            padding="sm"
            onClick={() => onSelectTrip(trip)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-[14px] leading-[20px] font-medium text-[var(--text-primary)] min-w-0">
              <span className="truncate">{trip.originName}</span>
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="truncate">{trip.destName}</span>
            </div>
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-[var(--text-muted)] shrink-0 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Card>
        ))}
      </div>
    </div>
  );
};
