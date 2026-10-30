# Grahify — architecture

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Ephemeris | `astronomy-engine` (MIT) | Pure JS, ~1 arc-minute accuracy, no native build, no AGPL obligations. Swiss Ephemeris (`sweph`) is AGPL: using it in a hosted web app would require publishing Grahify's full source, or buying a commercial licence. |
| Ayanamsa | Lahiri, computed in code | Same definition as Swiss Ephemeris `SE_SIDM_LAHIRI` (23.245524743° at JD 2435553.5, carried forward with IAU 2006 precession). |
| Nodes | Mean node | As specified. |
| Houses | Whole-sign from the lagna | As specified. |
| Database | Postgres via Prisma | Works with Neon or Supabase (both have free tiers). Prisma keeps the schema in one typed file. |
| Places | GeoNames `cities1000` (CC BY 4.0), built into `data/places.tsv` by `scripts/build-places.mjs` | Offline, free, includes IANA time zones and Indic-script names. Credit line is in the footer. |
| Sign-in | Auth.js magic links, database sessions | Passwordless. No email provider yet: in development the link is logged and shown on the "check your email" page. |
| Local database | `embedded-postgres` (`npm run db`, port 5433) | Real Postgres with no Docker or account. Moving to Neon or Supabase means changing `DATABASE_URL`. |
| Claude | `claude-opus-5-5`, structured JSON output, cached shared system prompt, server-side refusal fallback | Without `ANTHROPIC_API_KEY` the app runs in preview mode and shows exactly what Claude would be sent. |
| Languages | Language is a user setting, not a URL segment | Readings follow the user's choice; next-intl runs without locale routing (step 8). |
| Engine boundary | `src/lib/engine` is pure TypeScript with no Next.js, DB or network code | So it can be unit-tested, reused in cron jobs, and never touched by the LLM. Claude receives only its JSON output. |

## Folder structure

```
grahify/
├─ docs/ARCHITECTURE.md
├─ prisma/schema.prisma            # data model (below)
├─ public/tarot/                   # 78 RWS 1909 scans (step 3)
├─ messages/{en,hi,or}.json        # UI strings for next-intl (step 8)
└─ src/
   ├─ app/                         # App Router pages (no locale segment; language is a user setting)
   │  ├─ signin/                   # magic-link sign-in (step 2)
   │  ├─ onboarding/               # profile form (step 2)
   │  ├─ home/                     # today's affirmation, quick links
   │  ├─ astrology/                # base report, deep dives, weekly reading
   │  ├─ tarot/                    # five spreads
   │  ├─ numerology/
   │  ├─ ask/                      # chat
   │  ├─ journal/                  # timeline, search, filters
   │  └─ settings/                 # language, WhatsApp opt-in, export/delete
   ├─ app/api/
   │  ├─ tarot/shuffle/            # server-side CSPRNG shuffle
   │  ├─ whatsapp/webhook/         # inbound STOP, delivery receipts
   │  └─ cron/                     # weekly + daily sends
   ├─ lib/
   │  ├─ engine/                   # STEP 1: calculations only, no I/O
   │  │  ├─ constants.ts           # signs, nakshatras, lords, dignities
   │  │  ├─ math.ts                # angle helpers
   │  │  ├─ time.ts                # local time + IANA zone → UTC
   │  │  ├─ ayanamsa.ts            # Lahiri
   │  │  ├─ positions.ts           # sidereal longitudes, speed, lagna
   │  │  ├─ chart.ts               # computeNatalChart() → NatalChart JSON
   │  │  ├─ yogas.ts
   │  │  ├─ dasha.ts               # Vimshottari MD / AD / PD
   │  │  ├─ saturn.ts              # Sade Sati + Ashtama Shani timeline
   │  │  ├─ transits.ts            # computeTransits(range, natal)
   │  │  ├─ svg.ts                 # North Indian chart SVG
   │  │  ├─ types.ts
   │  │  └─ index.ts
   │  ├─ numerology/               # step 4 (pure functions too)
   │  ├─ tarot/                    # deck data, shuffle, spreads (step 3)
   │  ├─ llm/                      # Claude prompts + calls; input = engine JSON only
   │  ├─ whatsapp/                 # template sender (step 9)
   │  ├─ crypto.ts                 # field-level encryption helpers
   │  └─ db.ts                     # Prisma client
   └─ tests/engine/                # vitest
```

## Data model

See `prisma/schema.prisma` for the full schema. Summary:

- **User**: account, preferred language, timezone.
- **Profile**: one or more per user (self, family). Birth data is **encrypted at rest** (`birthDataEnc`), with only non-identifying derived fields left in plain text (for example `moonSign`) so scheduled jobs can query them. The natal chart JSON is stored encrypted, together with `engineVersion` so charts can be recomputed when the engine changes.
- **Reading**: every generated interpretation (base report, deep dive, weekly, affirmation, tarot, numerology, answer). It stores `inputJson` (exactly what the LLM saw), `content`, `language`, `model` and `promptVersion`, so results can be audited and reproduced. Translations are child rows (`translatedFromId`).
- **TarotSession**: the shuffled order is saved **before** the user picks (`deckOrder` + `reversals`), followed by `picks`. Each session links to a Reading.
- **ChatThread / ChatMessage**: Ask-a-Question history. Each assistant message stores `basis` (the planets and periods the answer used).
- **JournalEntry**: encrypted body, optionally linked to a Reading. Has a `section` field for filtering.
- **WhatsAppSubscription**: phone number (encrypted), `optedInAt`, `optedOutAt`, opt-in source and wording, chosen daily time, weekly/daily flags. **MessageLog** records every send for audit.
- **DailyAffirmation**: unique per profile and date, so the home screen and WhatsApp send the same text.
