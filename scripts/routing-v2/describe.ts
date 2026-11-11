/** Plain-text rendering of plan options, for the benchmark and for debugging in a terminal. */
import type { NetworkIndex } from '../../src/lib/router/v2/network-index';
import type { PlanOption } from '../../src/lib/router/v2/option';
import type { PlanResult } from '../../src/lib/router/v2/planner';

const min = (sec: number) => Math.round(sec / 60);
const km = (m: number) => (m / 1000).toFixed(1);

export function lineNames(ix: NetworkIndex, lines: number[]): string {
  return lines.map(l => ix.net.lines[l][1]).join('/');
}

export function describeOption(ix: NetworkIndex, o: PlanOption): string {
  const stopName = (s: number, fallback: string) => (s < 0 ? fallback : ix.net.stops[s][1]);
  const legs = o.legs.map(leg => {
    if (leg.kind === 'walk') {
      const tag = leg.uncovered ? ' (NOT COVERED)' : leg.paidArea ? ' (paid area)' : '';
      return `    walk ${leg.meters} m, ${min(leg.sec)} min: ${stopName(leg.fromStop, 'origin')} > ${stopName(leg.toStop, 'destination')}${tag}`;
    }
    const headway = Number.isFinite(leg.headwaySec) ? `every ${min(leg.headwaySec)} min` : 'no service';
    return `    ride ${lineNames(ix, leg.lines)}: ${stopName(leg.boardStop, '?')} > ${stopName(leg.alightStop, '?')}, ` +
      `${leg.hops} stops, ${km(leg.meters)} km, wait ${min(leg.waitSec)} + ride ${min(leg.rideSec)} min, ${headway}${leg.infrequent ? ' (infrequent)' : ''}`;
  });
  const head = `  ${min(o.typicalSec)} min (${min(o.minSec)}-${min(o.maxSec)}), ${o.transfers} transfers, walk ${o.walkMeters} m, ` +
    `Rp ${o.fareIdr}${o.fareIntegrated ? ' (integrated)' : ''}, cost ${Math.round(o.cost)}${o.badges.length ? ' [' + o.badges.join(', ') + ']' : ''}`;
  return [head, ...legs].join('\n');
}

export function describeResult(ix: NetworkIndex, title: string, r: PlanResult): string {
  const lines = [`\n== ${title} -> ${r.answerKind}, ${r.options.length} option(s)${r.modesGaveNothing ? ' (chosen modes gave nothing)' : ''}`];
  for (const o of r.options) lines.push(describeOption(ix, o));
  if (r.suggestion) {
    const modes = r.suggestion.modeGroups.join(',');
    lines.push(`  SUGGESTION: ${min(r.suggestion.savesSec)} min faster with mode group(s) ${modes}:`, describeOption(ix, r.suggestion.option));
  }
  return lines.join('\n');
}
