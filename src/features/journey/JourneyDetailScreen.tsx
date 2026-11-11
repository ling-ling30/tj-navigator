import React from 'react';
import { useTransitStore } from '../../lib/store/transit-store';
import { Button } from '../../components/ui/Button';
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

export const JourneyDetailScreen: React.FC<JourneyDetailScreenProps> = ({ onBack }) => {
  const { t } = useT();
  const {
    selectedItinerary,
    itineraries,
    originStop,
    destinationStop,
    openLiveRadar
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
      const hasLive = Boolean(leg.liveBusId || leg.recountedDelaySeconds !== undefined);
      const headwayMin = leg.headwaySeconds ? Math.round(leg.headwaySeconds / 60) : null;

      stepperItems.push({
        id: `transit-step-${index}`,
        dotType: 'solid',
        dotColor: modeColor,
        time: leg.departureTime,
        title: leg.fromStopName,
        subtitle: leg.toStopName ? t('journey.direction', { destination: leg.toStopName }) : undefined,
        content: (
          <div className="flex flex-col gap-2 my-1">
            <div className="flex items-center gap-2">
              <LineBadge
                mode={leg.mode}
                code={leg.routeShortName || leg.routeId}
              />
              {hasLive ? (
                <span className="text-[12px] font-semibold text-[var(--status-on-time-text)] bg-[var(--status-on-time-surface)] px-2 py-0.5 rounded-[var(--radius-badge)]">
                  ● {t('results.status_ontime')}
                </span>
              ) : headwayMin ? (
                <span className="text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-[var(--radius-badge)] tabular-nums">
                  {t('results.status_headway', { minutes: headwayMin })}
                </span>
              ) : null}
            </div>

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
        subtitle: t('journey.exit_instruction'),
        isLast: true
      });
    }
  });

  const handleOpenRadar = () => {
    openLiveRadar(currentItin.legs.find(l => l.liveBusId)?.liveBusId);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--ground)]">
      <JourneyTopBar onBack={onBack} onOpenRadar={handleOpenRadar} />

      <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-4 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full pb-24">
        {currentItin.answerKind === 'relaxed' && (
          <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-primary)] font-medium flex items-center gap-2">
            <span className="text-[16px]">🚶</span>
            <span>{t('ladder.relaxed_banner')}</span>
          </div>
        )}

        {currentItin.answerKind === 'closest-approach' && (
          <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--action-primary)] text-[13px] leading-[18px] text-[var(--text-primary)] space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-[var(--action-primary)]">
              <span className="text-[16px]">⚠️</span>
              <span>{t('ladder.closest_banner')}</span>
            </div>
            <div className="text-[12px] text-[var(--text-secondary)]">
              {t('ladder.closest_hint')}
            </div>
          </div>
        )}

        {currentItin.answerKind === 'walk-only' && (
          <div className="p-3 rounded-[var(--radius-card)] bg-[var(--surface-raised)] border border-[var(--border)] text-[13px] leading-[18px] text-[var(--text-primary)] font-medium flex items-center gap-2">
            <span className="text-[16px]">🚶</span>
            <span>{t('ladder.walk_only_banner')}</span>
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

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--surface)] border-t border-[var(--border)] z-[var(--z-sticky)]">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full">
          <Button variant="primary" fullWidth onClick={handleOpenRadar}>
            {t('journey.radar_cta')}
          </Button>
        </div>
      </footer>
    </div>
  );
};
