import React from 'react';
import { ListRow } from '../../components/ui/ListRow';
import { LineBadge } from '../../components/ui/LineBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { EnrichedStop } from '../../hooks/useStopAutocomplete';
import { useT } from '../../hooks/useT';

export interface StopSearchResultsProps {
  stops: EnrichedStop[];
  query: string;
  onSelect: (stop: EnrichedStop) => void;
}

function renderHighlightedName(name: string, query: string): React.ReactNode {
  if (!query.trim()) return name;
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerName.indexOf(lowerQuery);

  if (index === -1) return name;

  const before = name.slice(0, index);
  const match = name.slice(index, index + query.length);
  const after = name.slice(index + query.length);

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

export const StopSearchResults: React.FC<StopSearchResultsProps> = ({
  stops,
  query,
  onSelect
}) => {
  const { t } = useT();

  if (stops.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title={t('picker.no_results')}
          description={t('state.empty_desc')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-2 text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] border-b border-[var(--rule)]">
        {t('picker.results_header')} ({stops.length})
      </div>
      <div>
        {stops.map(stop => (
          <ListRow
            key={`${stop.id}-${stop.index}`}
            prefix={
              stop.isCustomPoint ? (
                <div className="w-6 h-6 rounded-full bg-[var(--action-primary)] text-white flex items-center justify-center text-[12px] font-bold">
                  📍
                </div>
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
    </div>
  );
};
