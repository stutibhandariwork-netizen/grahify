import { SIGNS } from "./constants";
import { addDays, bisect, houseFrom, signOf } from "./math";
import { siderealLongitude } from "./positions";
import type { SaturnCycle, SaturnPhase, SaturnSegment } from "./types";

/**
 * Every Saturn sign segment between `from` and `to`, ingress times refined to the minute.
 * Retrograde re-entries appear as separate segments.
 */
export function saturnSegments(from: Date, to: Date, moonSign: number): SaturnSegment[] {
  const signAt = (d: Date) => signOf(siderealLongitude("Saturn", d));
  const segments: SaturnSegment[] = [];
  let segStart = from;
  let sign = signAt(from);
  const step = 2; // days; Saturn never spends less than weeks in a sign

  for (let d = from; d < to; ) {
    const next = addDays(d, step);
    const s = signAt(next);
    if (s !== sign) {
      // f > 0 while still in the old sign
      const ingress = bisect((x) => (signAt(x) === sign ? 1 : -1), d, next);
      segments.push(segment(sign, segStart, ingress, moonSign));
      segStart = ingress;
      sign = s;
    }
    d = next;
  }
  segments.push(segment(sign, segStart, to, moonSign));
  return segments;
}

function segment(sign: number, start: Date, end: Date, moonSign: number): SaturnSegment {
  return {
    sign,
    signName: SIGNS[sign].en,
    houseFromMoon: houseFrom(sign, moonSign),
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

const PHASE: Record<number, SaturnPhase> = { 12: "rising", 1: "peak", 2: "setting" };

/** Sade Sati (Saturn in 12th/1st/2nd from Moon) and Ashtama Shani (8th from Moon) cycles. */
export function saturnCycles(segments: SaturnSegment[]): SaturnCycle[] {
  const cycles: SaturnCycle[] = [];
  let open: SaturnCycle | null = null;

  for (const seg of segments) {
    const kind = seg.houseFromMoon in PHASE ? "sade_sati" : seg.houseFromMoon === 8 ? "ashtama_shani" : null;
    if (open && open.kind === kind) {
      open.segments.push({ ...seg, phase: PHASE[seg.houseFromMoon] });
      open.end = seg.end;
      continue;
    }
    if (open) cycles.push(open);
    open = kind
      ? { kind, start: seg.start, end: seg.end, segments: [{ ...seg, phase: PHASE[seg.houseFromMoon] }] }
      : null;
  }
  if (open) cycles.push(open);
  return cycles;
}
