import React from 'react';
import { useTransitStore } from '../../lib/store/transit-store';
import { Stepper, type StepperItem } from '../../components/ui/Stepper';
import { LineBadge } from '../../components/ui/LineBadge';
import { JourneyHeader } from './JourneyHeader';
import { JourneyTopBar } from './JourneyTopBar';
import { TransferCard } from './TransferCard';
import { IntermediateStops } from './IntermediateStops';
import { useT } from '../../hooks/useT';

export interface JourneyDetailScreenProps {
  onBack: () => void;
}

function formatLineNames(names: string[], orWord: string): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ${orWord} ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} ${orWord} ${names[names.length - 1]}`;
}

export const JourneyDetailScreen: React.FC<JourneyDetailScreenProps> = ({ onBack }) => {
  const { t } = useT();
  const {
    selectedItinerary,
    itineraries,
    originStop,
    destinationStop
  } = useTransitStore();

  const currentItin = selectedItinerary || itineraries[0];

  if (!currentItin) return null;

  const originName = originStop?.name || currentItin.legs[0]?.fromStopName || 'Asal';
  const destName = destinationStop?.name || currentItin.legs[currentItin.legs.length - 1]?.toStopName || 'Tujuan';

  const stepperItems: StepperItem[] = [];

  currentItin.legs.forEach((leg, index) => {
    if (leg.type === 'WALK') {
      stepperItems.push({
        id: `walk-step-${index}`,
        dotType: 'ring',
        dotColor: 'var(--line-walk)',
        time: leg.departureTime,
        title: leg.fromStopName,
        content: <TransferCard leg={leg} googleMapsUrl={currentItin.googleMapsUrl} />
      });
    } else {
      const modeColor =
        leg.mode === 0 || leg.mode === 1 ? 'var(--line-tj)' :
        leg.mode === 2 ? 'var(--line-krl)' :
        leg.mode === 3 ? 'var(--line-mrt)' :
        leg.mode === 4 ? 'var(--line-lrt)' :
        leg.mode === 5 ? 'var(--line-mikro)' : 'var(--action-primary)';

      const headwayMin = leg.headwaySeconds ? Math.round(leg.headwaySeconds / 60) : null;
      const waitMin = leg.waitSeconds !== undefined ? Math.round(leg.waitSeconds / 60) : null;

      const lines = leg.lineNames && leg.lineNames.length > 0
        ? leg.lineNames
        : [leg.routeShortName || leg.routeId || ''];
      const rideInstruction = t('journey.ride_board', {
        lines: formatLineNames(lines, t('journey.conjunction_or'))
      });

      stepperItems.push({
        id: `transit-step-${index}`,
        dotType: 'solid',
        dotColor: modeColor,
        time: leg.departureTime,
        title: leg.fromStopName,
        subtitle: leg.toStopName ? t('journey.direction', { destination: leg.toStopName }) : undefined,
        content: (
          <div className="flex flex-col gap-2 my-1">
            <div className="text-[13px] leading-[18px] font-semibold text-[var(--text-primary)]">
              {rideInstruction}
            </div>

            <div className="flex items-center flex-wrap gap-2 text-[12px] leading-[16px]">
              <LineBadge
                mode={leg.mode}
                code={lines[0]}
              />

              {headwayMin && (
                <span className="text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-[var(--radius-badge)] font-medium tabular-nums">
                  {t('journey.headway_label', { minutes: headwayMin })}
                </span>
              )}

              {waitMin !== null && waitMin > 0 && (
                <span className="text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-[var(--radius-badge)] font-medium tabular-nums">
                  {t('journey.wait_label', { minutes: waitMin })}
                </span>
              )}

              {leg.premiumFareClass && (
                <span className="text-[var(--action-primary)] bg-[var(--action-primary-surface)] px-2 py-0.5 rounded-[var(--radius-badge)] font-semibold">
                  {t('journey.premium_bus_tag')}
                </span>
              )}
            </div>

            {leg.isInfrequent && headwayMin && (
              <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--status-warning-surface)] border border-[var(--status-warning)] text-[var(--status-warning-text)] text-[12px] leading-[16px]">
                {t('journey.infrequent_warning', { minutes: headwayMin })}
              </div>
            )}

            <IntermediateStops
              stops={leg.intermediateStopNames}
              count={leg.intermediateStopCount}
            />
          </div>
        )
      });
    }

    if (index === currentItin.legs.length - 1) {
      stepperItems.push({
        id: 'final-dest-step',
        dotType: 'solid',
        dotColor: 'var(--text-primary)',
        time: leg.arrivalTime,
        title: leg.toStopName,
        subtitle: leg.toStopId ? t('journey.exit_instruction') : t('journey.arrive_destination'),
        isLast: true
      });
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-[var(--ground)]">
      <JourneyTopBar onBack={onBack} />

      <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-4 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full pb-12">
        {currentItin.answerKind === 'relaxed' && (
          <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
            {t('results.banner_relaxed')}
          </div>
        )}

        {currentItin.answerKind === 'closest-approach' && (
          <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium space-y-1">
            <div className="font-semibold text-[var(--text-primary)]">
              {t('ladder.closest_banner')}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] font-normal">
              {t('ladder.closest_hint')}
            </div>
          </div>
        )}

        {currentItin.answerKind === 'walk-only' && (
          <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-secondary)] font-medium">
            {t('ladder.walk_only_banner')}
          </div>
        )}

        <JourneyHeader
          itinerary={currentItin}
          originName={originName}
          destName={destName}
        />

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)]">
          <Stepper items={stepperItems} />
        </div>
      </main>
    </div>
  );
};
