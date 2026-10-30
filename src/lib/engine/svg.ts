import { GRAHA_ABBR, GRAHAS } from "./constants";
import type { Graha, NatalChart } from "./types";

/**
 * Centre points for houses 1-12 in a 400×400 North Indian chart.
 * House 1 is the top diamond; houses run counter-clockwise.
 */
const HOUSE_CENTRES: [number, number][] = [
  [200, 105],
  [100, 45],
  [45, 100],
  [105, 200],
  [45, 300],
  [100, 355],
  [200, 295],
  [300, 355],
  [355, 300],
  [295, 200],
  [355, 100],
  [300, 45],
];

/** Where the sign number goes: the inner corner of each house. */
const SIGN_LABELS: [number, number][] = [
  [200, 182],
  [100, 82],
  [82, 100],
  [182, 200],
  [82, 300],
  [100, 318],
  [200, 218],
  [300, 318],
  [318, 300],
  [218, 200],
  [318, 100],
  [300, 82],
];

export interface ChartSvgOptions {
  /** Which signs sit in which house. Defaults to the chart's lagna (or Moon) basis. */
  ascendantSign?: number;
  /** Planet signs to draw. Defaults to the natal positions; pass navamsa signs for D9. */
  planetSigns?: Record<Graha, number>;
  title?: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * North Indian chart as an SVG string. Uses `currentColor` so it follows the
 * surrounding text colour (and therefore light/dark themes).
 */
export function northIndianChartSvg(chart: NatalChart, opts: ChartSvgOptions = {}): string {
  const asc = opts.ascendantSign ?? chart.houses[0].sign;
  const signs = opts.planetSigns ?? (Object.fromEntries(GRAHAS.map((g) => [g, chart.planets[g].sign])) as Record<Graha, number>);
  const isNatal = !opts.planetSigns;

  const body: string[] = [];
  for (let h = 0; h < 12; h++) {
    const sign = (asc + h) % 12;
    const [lx, ly] = SIGN_LABELS[h];
    body.push(`<text x="${lx}" y="${ly}" class="sign">${sign + 1}</text>`);

    const occupants = GRAHAS.filter((g) => signs[g] === sign).map((g) => {
      const p = chart.planets[g];
      let label = GRAHA_ABBR[g];
      if (isNatal) {
        label += Math.floor(p.degree) + "°";
        if (p.retrograde && g !== "Rahu" && g !== "Ketu") label += "ᴿ";
        if (p.combust) label += "ᶜ";
      }
      return label;
    });
    if (h === 0 && chart.lagna) {
      // In a divisional chart (e.g. D9) house 1 is that chart's own ascendant; its degree isn't meaningful.
      if (!isNatal) occupants.unshift("Asc");
      else if (asc === chart.lagna.sign) occupants.unshift(`Asc ${Math.floor(chart.lagna.degree)}°`);
    }

    const [cx, cy] = HOUSE_CENTRES[h];
    const lineH = 15;
    const top = cy - ((occupants.length - 1) * lineH) / 2;
    occupants.forEach((t, i) => body.push(`<text x="${cx}" y="${top + i * lineH}" class="pl">${esc(t)}</text>`));
  }

  const title = opts.title ? `<title>${esc(opts.title)}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" fill="none" stroke="currentColor">${title}
<style>text{fill:currentColor;stroke:none;font-family:system-ui,sans-serif;text-anchor:middle;dominant-baseline:middle}.sign{font-size:11px;opacity:.55}.pl{font-size:12px;font-weight:600}</style>
<rect x="1" y="1" width="398" height="398" stroke-width="2"/>
<path d="M1 1L399 399M399 1L1 399M200 1L399 200L200 399L1 200Z" stroke-width="1.5"/>
${body.join("\n")}
</svg>`;
}
