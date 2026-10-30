// Builds data/places.tsv from GeoNames dumps (https://download.geonames.org/export/dump/, CC BY 4.0).
//
// Usage: node scripts/build-places.mjs <cities1000.txt> <admin1CodesASCII.txt> <countryInfo.txt> <out.tsv>
//
// Output columns: name, alternates (|-separated), state, country code, country,
// latitude, longitude, IANA timezone, population. Sorted by population, largest first.

import { readFileSync, writeFileSync } from "node:fs";

const [citiesPath, admin1Path, countryPath, outPath] = process.argv.slice(2);
if (!outPath) {
  console.error("usage: build-places.mjs <cities1000.txt> <admin1CodesASCII.txt> <countryInfo.txt> <out.tsv>");
  process.exit(1);
}

const lines = (p) => readFileSync(p, "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
const clean = (s) => s.replace(/[\t\n|]/g, " ").trim();

const admin1 = new Map(lines(admin1Path).map((l) => l.split("\t")).map(([code, name]) => [code, name]));
const countries = new Map(lines(countryPath).map((l) => l.split("\t")).map((c) => [c[0], c[4]]));

// Indic scripts (Devanagari to Malayalam), so people can type a place in Hindi, Odia, Tamil and so on.
const INDIC = /[ऀ-ൿ]/;
const LATIN = /^[\p{Script=Latin}\s'.-]+$/u;

const rows = [];
for (const l of lines(citiesPath)) {
  const f = l.split("\t");
  const [, name, ascii, alternates, lat, lon, , , cc, , a1] = f;
  const population = Number(f[14]) || 0;
  const tz = f[17];
  if (!tz) continue;

  const alts = new Set();
  if (ascii && ascii !== name) alts.add(ascii);
  for (const a of alternates ? alternates.split(",") : []) {
    if (a === name || a.length < 2) continue;
    // Indian places keep their Latin spellings too (Calcutta, Bombay, Katak).
    if (INDIC.test(a) || (cc === "IN" && LATIN.test(a) && a.length > 2)) alts.add(clean(a));
  }

  rows.push({
    population,
    line: [
      clean(name),
      [...alts].slice(0, 24).join("|"),
      clean(admin1.get(`${cc}.${a1}`) ?? ""),
      cc,
      clean(countries.get(cc) ?? cc),
      Number(lat).toFixed(4),
      Number(lon).toFixed(4),
      tz,
      population,
    ].join("\t"),
  });
}

rows.sort((a, b) => b.population - a.population);
writeFileSync(outPath, rows.map((r) => r.line).join("\n") + "\n");
console.log(`wrote ${rows.length} places to ${outPath}`);
