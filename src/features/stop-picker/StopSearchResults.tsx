import React from 'react';
import { ListRow } from '../../components/ui/ListRow';
import { LineBadge } from '../../components/ui/LineBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import type { EnrichedStop } from '../../hooks/useStopAutocomplete';
import type { AddressSearchStatus } from '../../hooks/useAddressSearch';
import type { AddressStop, PlaceKind } from '../../lib/places/address-search';
import type { TranslationKey } from '../../i18n/types';
import { useT } from '../../hooks/useT';

export interface StopSearchResultsProps {
  stops: EnrichedStop[];
  addresses: AddressStop[];
  addressStatus: AddressSearchStatus;
  query: string;
  onSearchAddress: () => void;
  onSelect: (stop: EnrichedStop) => void;
}

const PLACE_KIND_KEYS: Record<PlaceKind, TranslationKey> = {
  mall: 'picker.place_kind_mall',
  street: 'picker.place_kind_street',
  hospital: 'picker.place_kind_hospital',
  education: 'picker.place_kind_education',
  building: 'picker.place_kind_building',
  area: 'picker.place_kind_area',
  place: 'picker.place_kind_place'
};

function renderHighlightedName(name: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return name;
  const lowerName = name.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerName.indexOf(lowerQuery);

  if (index === -1) return name;

  const before = name.slice(0, index);
  const match = name.slice(index, index + trimmed.length);
  const after = name.slice(index + trimmed.length);

  return (
    <span>
      {before}
      <span className="font-extrabold text-[var(--action-primary)] underline underline-offset-2">
        {match}
      </span>
      {after}
    </span>
  );
}

const PinBadge: React.FC = () => (
  <div className="w-7 h-7 rounded-full bg-[var(--action-primary-surface)] text-[var(--action-primary)] flex items-center justify-center shrink-0">
    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </div>
);

export const StopSearchResults: React.FC<StopSearchResultsProps> = ({
  stops,
  addresses,
  addressStatus,
  query,
  onSearchAddress,
  onSelect
}) => {
  const { t } = useT();
  const trimmed = query.trim();
  const canSearchAddress = trimmed.length >= 3;

  if (!canSearchAddress && stops.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title={t('picker.no_results')}
          description={t('picker.address_search_hint')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {stops.length > 0 && (
        <>
          <div className="px-4 py-2 text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] border-b border-[var(--rule)]">
            {t('picker.stops_header')} ({stops.length})
          </div>
          <div>
            {stops.map(stop => (
              <ListRow
                key={`${stop.id}-${stop.index}`}
                prefix={
                  stop.isCustomPoint ? (
                    <PinBadge />
                  ) : (
                    <LineBadge mode={stop.mode} />
                  )
                }
                title={renderHighlightedName(stop.name, query)}
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
        </>
      )}

      {canSearchAddress && (
        <>
          <div className="px-4 py-2 flex items-center justify-between text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] border-b border-[var(--rule)]">
            <span>
              {t('picker.addresses_header')}
              {addressStatus === 'done' && addresses.length > 0 ? ` (${addresses.length})` : ''}
            </span>
          </div>

          {addressStatus === 'loading' && (
            <div className="p-4 flex flex-col gap-3">
              <div className="text-[12px] text-[var(--text-secondary)] font-medium">
                {t('picker.address_searching')}
              </div>
              <Skeleton height="44px" rounded="card" />
              <Skeleton height="44px" rounded="card" />
            </div>
          )}

          {addressStatus === 'done' && addresses.length > 0 && (
            <>
              <div>
                {addresses.map(addr => (
                  <ListRow
                    key={addr.id}
                    prefix={<PinBadge />}
                    title={renderHighlightedName(addr.name, query)}
                    subtitle={addr.description}
                    trailing={
                      <span className="text-[11px] leading-[14px] font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {t(PLACE_KIND_KEYS[addr.placeKind])}
                      </span>
                    }
                    onClick={() => onSelect(addr)}
                  />
                ))}
              </div>
              <div className="px-4 py-2 text-[11px] leading-[14px] text-[var(--text-muted)] border-t border-[var(--rule)]">
                {t('picker.address_attribution')}
              </div>
            </>
          )}

          {addressStatus === 'done' && addresses.length === 0 && (
            stops.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={t('picker.no_results')}
                  description={t('picker.address_none')}
                />
              </div>
            ) : (
              <div className="px-4 py-3 text-[12px] leading-[16px] text-[var(--text-secondary)]">
                {t('picker.address_none')}
              </div>
            )
          )}

          {addressStatus === 'offline' && (
            <div className="px-4 py-3 text-[12px] leading-[16px] text-[var(--text-secondary)]">
              {t('picker.address_offline')}
            </div>
          )}

          {addressStatus === 'error' && (
            <ListRow
              prefix={<PinBadge />}
              title={
                <span className="text-[var(--action-primary)]">
                  {t('picker.address_error')}
                </span>
              }
              onClick={onSearchAddress}
            />
          )}

          {addressStatus === 'idle' && (
            <ListRow
              prefix={
                <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] text-[var(--action-primary)] flex items-center justify-center shrink-0">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              }
              title={
                <span className="text-[var(--action-primary)]">
                  {t('picker.address_search_action', { query: trimmed })}
                </span>
              }
              subtitle={t('picker.address_search_hint')}
              onClick={onSearchAddress}
            />
          )}
        </>
      )}
    </div>
  );
};
