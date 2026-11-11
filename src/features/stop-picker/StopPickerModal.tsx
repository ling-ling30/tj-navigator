import React, { useState } from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { NearbyStopsList } from './NearbyStopsList';
import { StopSearchResults } from './StopSearchResults';
import { LocationDetectorRow } from './LocationDetectorRow';
import { CustomPointEditor } from './CustomPointEditor';
import { useStopAutocomplete, type EnrichedStop } from '../../hooks/useStopAutocomplete';
import { TransitMode } from '../../types/transit';
import { useT } from '../../hooks/useT';

export interface StopPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stop: EnrichedStop) => void;
  title?: string;
}

export const StopPickerModal: React.FC<StopPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title
}) => {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<number | null>(null);

  const { results, curatedStops, parsedCoordinate } = useStopAutocomplete(query, selectedMode);

  const handleSelect = (stop: EnrichedStop) => {
    onSelect(stop);
    onClose();
    setQuery('');
  };

  const handleClose = () => {
    onClose();
    setQuery('');
  };

  const modeOptions = [
    { label: t('search.mode_all'), value: null },
    { label: t('search.mode_tj'), value: TransitMode.BRT },
    { label: t('search.mode_krl'), value: TransitMode.COMMUTER_RAIL },
    { label: t('search.mode_mrt'), value: TransitMode.MRT },
    { label: t('search.mode_lrt'), value: TransitMode.LRT }
  ];

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={title || t('search.origin_label')}
      headerRight={
        <Button variant="ghost" size="compact" onClick={handleClose}>
          {t('nav.cancel')}
        </Button>
      }
      maxHeight="max-h-[90vh]"
    >
      <div className="flex flex-col h-full">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <Field
            placeholder={t('picker.search_placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            autoFocus
          />

          {/* Mode Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {modeOptions.map(opt => (
              <Chip
                key={opt.label}
                active={selectedMode === opt.value}
                onClick={() => setSelectedMode(opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Always provide LocationDetectorRow when query is empty */}
          {!query.trim() && (
            <LocationDetectorRow onSelect={handleSelect} />
          )}

          {parsedCoordinate ? (
            <CustomPointEditor
              coord={parsedCoordinate}
              onSelect={handleSelect}
            />
          ) : query.trim().length > 0 ? (
            <StopSearchResults
              stops={results}
              query={query}
              onSelect={handleSelect}
            />
          ) : (
            <NearbyStopsList stops={curatedStops} onSelect={handleSelect} />
          )}
        </div>
      </div>
    </Sheet>
  );
};
