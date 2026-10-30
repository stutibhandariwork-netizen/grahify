import { EXALTATION, KENDRAS, SAPTA_GRAHAS, SIGN_LORDS, SIGNS } from "./constants";
import { houseFrom, norm360 } from "./math";
import { dignity } from "./positions";
import type { Graha, PlanetPosition, Yoga } from "./types";

type Planets = Record<Graha, PlanetPosition>;

const inKendraFrom = (sign: number, from: number) => KENDRAS.includes(houseFrom(sign, from));
const sameSign = (p: Planets, a: Graha, b: Graha) => p[a].sign === p[b].sign;

/**
 * Classical yogas from sidereal sign placements.
 * `basisSign` is the lagna sign, or the Moon sign when birth time is unknown.
 * Each check returns present: false when absent so the LLM can say so honestly.
 */
export function detectYogas(p: Planets, basisSign: number, basisIsLagna: boolean): Yoga[] {
  const moon = p.Moon.sign;
  // Without a birth time the basis is the Moon itself, so name it once.
  const basisLabel = basisIsLagna ? "lagna" : "Moon";
  const kendraRef = basisIsLagna ? "the lagna or Moon" : "the Moon";
  const yogas: Yoga[] = [];

  // Budhaditya: Sun and Mercury together.
  yogas.push({
    key: "budhaditya",
    name: "Budhaditya Yoga",
    present: sameSign(p, "Sun", "Mercury"),
    involves: ["Sun", "Mercury"],
    details: sameSign(p, "Sun", "Mercury")
      ? `Sun and Mercury both in ${SIGNS[p.Sun.sign].en} (house ${p.Sun.house}).` +
        (p.Mercury.combust ? " Mercury is combust, which some astrologers say softens this yoga." : "")
      : "Sun and Mercury are in different signs.",
  });

  // Gajakesari: Jupiter in a kendra from the Moon.
  const gk = inKendraFrom(p.Jupiter.sign, moon);
  yogas.push({
    key: "gajakesari",
    name: "Gajakesari Yoga",
    present: gk,
    involves: ["Jupiter", "Moon"],
    details: `Jupiter is in house ${houseFrom(p.Jupiter.sign, moon)} from the Moon` + (gk ? " (a kendra)." : " (not a kendra)."),
  });

  // Neecha Bhanga: cancellation of debilitation.
  for (const g of SAPTA_GRAHAS) {
    if (p[g].dignity !== "debilitated") continue;
    const s = p[g].sign;
    const rules: string[] = [];
    const dispositor = SIGN_LORDS[s];
    const kendra = (x: Graha) => inKendraFrom(p[x].sign, basisSign) || inKendraFrom(p[x].sign, moon);
    if (kendra(dispositor)) rules.push(`its dispositor ${dispositor} is in a kendra from ${kendraRef}`);
    const exaltedHere = (Object.keys(EXALTATION) as Graha[]).find((x) => EXALTATION[x] === s);
    if (exaltedHere && kendra(exaltedHere))
      rules.push(`${exaltedHere}, which is exalted in ${SIGNS[s].en}, is in a kendra from ${kendraRef}`);
    const exaltLord = SIGN_LORDS[EXALTATION[g]!];
    if (kendra(exaltLord)) rules.push(`${exaltLord}, lord of ${g}'s exaltation sign, is in a kendra from ${kendraRef}`);
    if (p[dispositor].sign === s && dispositor !== g) rules.push(`its dispositor ${dispositor} sits with it`);
    if (dignity(g, p[g].navamsaSign) === "exalted") rules.push(`${g} is exalted in the navamsa`);
    yogas.push({
      key: `neecha_bhanga_${g.toLowerCase()}`,
      name: `Neecha Bhanga (${g})`,
      present: rules.length > 0,
      involves: [g, dispositor],
      details:
        `${g} is debilitated in ${SIGNS[s].en}. ` +
        (rules.length ? `The debilitation is cancelled because ${rules.join("; ")}.` : "No classical cancellation rule applies."),
    });
  }

  // Grahan: Sun or Moon with Rahu or Ketu.
  const eclipsed = (["Sun", "Moon"] as Graha[]).flatMap((l) =>
    (["Rahu", "Ketu"] as Graha[]).filter((n) => sameSign(p, l, n)).map((n) => [l, n] as const),
  );
  yogas.push({
    key: "grahan",
    name: "Grahan Yoga",
    present: eclipsed.length > 0,
    involves: [...new Set(eclipsed.flat())],
    details: eclipsed.length
      ? eclipsed.map(([l, n]) => `${l} with ${n} in ${SIGNS[p[l].sign].en}`).join("; ") + "."
      : "Neither the Sun nor the Moon shares a sign with Rahu or Ketu.",
  });

  // Mangal dosha: Mars in 1, 2, 4, 7, 8 or 12 from lagna, Moon and Venus.
  const MANGAL = [1, 2, 4, 7, 8, 12];
  const refs: [string, number][] = [
    ...(basisIsLagna ? [["lagna", basisSign] as [string, number]] : []),
    ["Moon", moon],
    ["Venus", p.Venus.sign],
  ];
  const hits = refs.filter(([, s]) => MANGAL.includes(houseFrom(p.Mars.sign, s)));
  yogas.push({
    key: "mangal_dosha",
    name: "Mangal Dosha",
    present: hits.length > 0,
    involves: ["Mars"],
    details:
      refs.map(([label, s]) => `Mars is in house ${houseFrom(p.Mars.sign, s)} from the ${label}`).join("; ") +
      `. Counted from ${hits.length ? hits.map(([l]) => l).join(", ") : "none of these"}.` +
      (p.Mars.dignity === "own" || p.Mars.dignity === "exalted" ? " Mars is in its own or exalted sign, a common cancellation." : ""),
  });

  // Kaal Sarp: all seven planets on one side of the Rahu-Ketu axis.
  const rahu = p.Rahu.longitude;
  const arcs = SAPTA_GRAHAS.map((g) => norm360(p[g].longitude - rahu));
  const allOneSide = arcs.every((a) => a > 0 && a < 180) || arcs.every((a) => a > 180 && a < 360);
  const outside = SAPTA_GRAHAS.filter((_, i) => (arcs[i] < 180) !== (arcs.filter((a) => a < 180).length > 3));
  yogas.push({
    key: "kaal_sarp",
    name: "Kaal Sarp Yoga",
    present: allOneSide,
    involves: allOneSide ? ["Rahu", "Ketu"] : ["Rahu", "Ketu", ...outside],
    details: allOneSide
      ? "All seven planets fall on one side of the Rahu-Ketu axis."
      : `Not present: ${outside.join(", ")} ${outside.length === 1 ? "lies" : "lie"} on the other side of the Rahu-Ketu axis.`,
  });

  // Pancha Mahapurusha: Mars/Mercury/Jupiter/Venus/Saturn in own or exalted sign in a kendra.
  const MAHAPURUSHA: [Graha, string][] = [
    ["Mars", "Ruchaka"],
    ["Mercury", "Bhadra"],
    ["Jupiter", "Hamsa"],
    ["Venus", "Malavya"],
    ["Saturn", "Shasha"],
  ];
  for (const [g, name] of MAHAPURUSHA) {
    const strong = p[g].dignity === "own" || p[g].dignity === "exalted";
    const kendra = inKendraFrom(p[g].sign, basisSign);
    yogas.push({
      key: name.toLowerCase(),
      name: `${name} Yoga`,
      present: strong && kendra,
      involves: [g],
      details: `${g} is in ${SIGNS[p[g].sign].en}${p[g].dignity ? ` (${p[g].dignity})` : ""}, house ${houseFrom(p[g].sign, basisSign)} from the ${basisLabel}.`,
    });
  }

  // Chandra-Mangal: Moon with Mars.
  yogas.push({
    key: "chandra_mangal",
    name: "Chandra-Mangal Yoga",
    present: sameSign(p, "Moon", "Mars"),
    involves: ["Moon", "Mars"],
    details: sameSign(p, "Moon", "Mars") ? `Moon and Mars together in ${SIGNS[moon].en}.` : "Moon and Mars are in different signs.",
  });

  // Kemadruma: no planet (other than Sun and nodes) in 2nd or 12th from the Moon.
  const flanking = (["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as Graha[]).filter((g) =>
    [2, 12].includes(houseFrom(p[g].sign, moon)),
  );
  const kemaCancel = (["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as Graha[]).filter(
    (g) => inKendraFrom(p[g].sign, moon) || inKendraFrom(p[g].sign, basisSign),
  );
  yogas.push({
    key: "kemadruma",
    name: "Kemadruma Yoga",
    present: flanking.length === 0,
    cancelled: flanking.length === 0 && kemaCancel.length > 0 ? true : undefined,
    involves: ["Moon"],
    details: flanking.length
      ? `${flanking.join(", ")} ${flanking.length === 1 ? "sits" : "sit"} next to the Moon (2nd/12th), so it does not form.`
      : `No planet in the 2nd or 12th from the Moon.` +
        (kemaCancel.length ? ` Cancelled: ${kemaCancel.join(", ")} in a kendra from ${kendraRef}.` : ""),
  });

  return yogas;
}
