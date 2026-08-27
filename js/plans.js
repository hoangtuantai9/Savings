// The three ladders, transcribed from the source spreadsheet: column A is VND, column B is USD and
// column D is the box — 185 steps each, the box being the one that only comes round when a USD wait
// has been sat through. Column C is not read by anything and has no ladder to sit on.
// The sheet keeps VND in thousands ("20,00" = 20.000 ₫), so every VND figure is stored ×1000 —
// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
//
// These tables are generated from the sheet and are not edited by hand. Where the sheet and the
// app disagree, the sheet is right — the sheet is the ladder, and this file is only a transcript
// of it. The re-cut sheet climbs at a flat ×1.10 in VND and ×1.08 in USD, with none of the steps
// that used to go down inside a run; if a step ever goes down again, it is a run boundary and the
// colour bands below will find it on their own.

/** Bumped whenever the tables below change, so a saved file adopts the new ladder. */
export const VERSION = 22;

/**
 * Vestigial, and here for one reason only: a state.js still sitting in a browser's HTTP cache
 * imports this name, and a module that cannot find an import it asks for takes the whole graph down
 * with it — a white window, not a degraded app. Removing an export is as breaking as adding one
 * while two generations of the same folder can still be mixed, so it outlives its own purpose by a
 * deploy. Delete it once the caches have turned over.
 *
 * The shape is chosen so that an older state.js reading it does something harmless rather than
 * something wrong: it looks for `.version` and `.done`, finds a version it has not seen and a
 * `done` of zero, and puts the VND track back to step 1 — a subset of the reset below, never a
 * contradiction of it.
 *
 * It mirrors JOURNEY_RESET_AT rather than VERSION, and moves only when that does — to the same
 * number, never past it. It sat at 19 through three versions that moved no ladder's position; it
 * moves to 22 with the re-cut sheet, because a new journey was asked for along with it. Ahead of the
 * reset it would send a set of books that has already been through one back to step 1 a second time,
 * which is a contradiction of the reset rather than a subset of it, and reachable only from a cache
 * nobody can see into.
 */
export const VND_REPEG = { version: 22, done: 0 };

// Minutes each track locks for after a step is banked. Deliberately different per currency, so the
// two ladders never fall into step and hand you both questions at once. USD came down from 25 to 24
// in VERSION 20; because a wait is only ever lengthened where it is read, state.js has to move a
// stored 25 down with it, or the change would never reach a set of books already in use.
const VND_LOCK = 18, USD_LOCK = 24;

// The box has no wait of its own, and that is the whole of its design: it turns up when the USD
// lock reaches zero and goes away once it is banked, so the thing that governs it is a wait that
// was already sat through rather than a second clock nobody can see.
const BOX_LOCK = 0;

/**
 * The wait a track was designed around, and the least it may ever be set to. The options panel can
 * lengthen a lock but not shorten one: a wait that can be turned down to nothing takes the verdict
 * with it, and then there is nothing left to have survived.
 */
export const lockFloor = currency => (currency === 'VND' ? VND_LOCK : USD_LOCK);

/**
 * Where the first two colour bands end, read off the ladder itself. A run is where a column starts
 * over at a round number, and the first two runs each get a colour of their own; everything from
 * the third on is green, so the top of a ladder reads as one long climb.
 *
 * Worked out rather than written down, because it was written down once and then the sheet changed
 * underneath it — leaving a red band that ended ten steps into the amber run.
 */
function bandEnds(steps) {
  const ends = [];
  for (let i = 1; i < steps.length && ends.length < 2; i++) if (steps[i] < steps[i - 1]) ends.push(i);
  return ends;
}

/**
 * Where the bands end on a column that never starts over.
 *
 * Column D climbs at a flat ×1.05 from ten cents to a thousand dollars and does not step down once,
 * so bandEnds() finds nothing in it and the whole ladder would wear one colour for 190 steps —
 * a climb with no promotion in it anywhere. Its runs are its decades instead: the step that first
 * asks for a dollar ends the first band, the step that first asks for ten ends the second, and
 * everything above that is green. Worked out from the figures for the same reason bandEnds() is —
 * so that re-cutting the sheet moves the colours without anybody having to remember to.
 */
function decadeEnds(steps) {
  const ends = [];
  let bar = 1;
  for (let i = 0; i < steps.length && ends.length < 2; i++) {
    if (steps[i] < bar) continue;
    if (i > 0) ends.push(i);
    bar *= 10;
  }
  return ends;
}

const VND_STEPS = [
  // red — run 1: steps 1-35, 20.000 d -> 510.950 d
  20_000, 22_000, 24_200, 26_620, 29_280, 32_210, 35_430, 38_970, 42_870,
  47_160, 51_870, 57_060, 62_770, 69_050, 75_950, 83_540, 91_900, 101_090,
  111_200, 122_320, 134_550, 148_000, 162_810, 179_090, 196_990, 216_690, 238_360,
  262_200, 288_420, 317_260, 348_990, 383_890, 422_280, 464_500, 510_950,
  // amber — run 2: steps 36-59, 400.000 d -> 3.581.720 d
  400_000, 440_000, 484_000, 532_400, 585_640, 644_200, 708_620, 779_490, 857_440,
  943_180, 1_037_500, 1_141_250, 1_255_370, 1_380_910, 1_519_000, 1_670_900, 1_837_990, 2_021_790,
  2_223_970, 2_446_360, 2_691_000, 2_960_100, 3_256_110, 3_581_720,
  // green — run 3: steps 60-88, 300.000 d -> 4.326.300 d
  300_000, 330_000, 363_000, 399_300, 439_230, 483_150, 531_470, 584_620, 643_080,
  707_380, 778_120, 855_940, 941_530, 1_035_680, 1_139_250, 1_253_170, 1_378_490, 1_516_340,
  1_667_980, 1_834_770, 2_018_250, 2_220_070, 2_442_080, 2_686_290, 2_954_920, 3_250_410, 3_575_450,
  3_933_000, 4_326_300,
  // green — run 4: steps 89-119, 300.000 d -> 5.234.820 d
  300_000, 330_000, 363_000, 399_300, 439_230, 483_150, 531_470, 584_620, 643_080,
  707_380, 778_120, 855_940, 941_530, 1_035_680, 1_139_250, 1_253_170, 1_378_490, 1_516_340,
  1_667_980, 1_834_770, 2_018_250, 2_220_070, 2_442_080, 2_686_290, 2_954_920, 3_250_410, 3_575_450,
  3_933_000, 4_326_300, 4_758_930, 5_234_820,
  // green — run 5: steps 120-141, 1.000.000 d -> 7.400.250 d
  1_000_000, 1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510, 1_771_560, 1_948_720, 2_143_590,
  2_357_950, 2_593_740, 2_853_120, 3_138_430, 3_452_270, 3_797_500, 4_177_250, 4_594_970, 5_054_470,
  5_559_920, 6_115_910, 6_727_500, 7_400_250,
  // green — run 6: steps 142-163, 1.000.000 d -> 7.400.250 d
  1_000_000, 1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510, 1_771_560, 1_948_720, 2_143_590,
  2_357_950, 2_593_740, 2_853_120, 3_138_430, 3_452_270, 3_797_500, 4_177_250, 4_594_970, 5_054_470,
  5_559_920, 6_115_910, 6_727_500, 7_400_250,
  // green — run 7: steps 164-185, 1.000.000 d -> 7.400.250 d
  1_000_000, 1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510, 1_771_560, 1_948_720, 2_143_590,
  2_357_950, 2_593_740, 2_853_120, 3_138_430, 3_452_270, 3_797_500, 4_177_250, 4_594_970, 5_054_470,
  5_559_920, 6_115_910, 6_727_500, 7_400_250
];

const USD_STEPS = [
  // red — run 1: steps 1-71, $0.30 -> $62.99
  0.30, 0.32, 0.35, 0.38, 0.41, 0.44, 0.48, 0.51, 0.56,
  0.60, 0.65, 0.70, 0.76, 0.82, 0.88, 0.95, 1.03, 1.11,
  1.20, 1.29, 1.40, 1.51, 1.63, 1.76, 1.90, 2.05, 2.22,
  2.40, 2.59, 2.80, 3.02, 3.26, 3.52, 3.80, 4.11, 4.44,
  4.79, 5.17, 5.59, 6.03, 6.52, 7.04, 7.60, 8.21, 8.87,
  9.58, 10.34, 11.17, 12.06, 13.03, 14.07, 15.20, 16.41, 17.72,
  19.14, 20.67, 22.33, 24.11, 26.04, 28.13, 30.38, 32.81, 35.43,
  38.27, 41.33, 44.63, 48.20, 50.00, 54.00, 58.32, 62.99,
  // amber — run 2: steps 72-88, $30.00 -> $102.78
  30.00, 32.40, 34.99, 37.79, 40.81, 44.08, 47.61, 51.41, 55.53,
  59.97, 64.77, 69.95, 75.55, 81.59, 88.12, 95.17, 102.78,
  // green — run 3: steps 89-107, $50.00 -> $199.80
  50.00, 54.00, 58.32, 62.99, 68.02, 73.47, 79.34, 85.69, 92.55,
  99.95, 107.95, 116.58, 125.91, 135.98, 146.86, 158.61, 171.30, 185.00,
  199.80,
  // green — run 4: steps 108-131, $50.00 -> $293.57
  50.00, 54.00, 58.32, 62.99, 68.02, 73.47, 79.34, 85.69, 92.55,
  99.95, 107.95, 116.58, 125.91, 135.98, 146.86, 158.61, 171.30, 185.00,
  199.80, 215.79, 233.05, 251.69, 271.83, 293.57,
  // green — run 5: steps 132-153, $50.00 -> $251.69
  50.00, 54.00, 58.32, 62.99, 68.02, 73.47, 79.34, 85.69, 92.55,
  99.95, 107.95, 116.58, 125.91, 135.98, 146.86, 158.61, 171.30, 185.00,
  199.80, 215.79, 233.05, 251.69,
  // green — run 6: steps 154-172, $80.00 -> $319.68
  80.00, 86.40, 93.31, 100.78, 108.84, 117.55, 126.95, 137.11, 148.07,
  159.92, 172.71, 186.53, 201.45, 217.57, 234.98, 253.77, 274.08, 296.00,
  319.68,
  // green — run 7: steps 173-185, $100.00 -> $251.82
  100.00, 108.00, 116.64, 125.97, 136.05, 146.93, 158.69, 171.38, 185.09,
  199.90, 215.89, 233.16, 251.82
];

// Column D — 185 steps at ×1.05, opening at the same thirty cents column B does and climbing well
// past it. One single run: no figure in it is ever lower than the one before it, which is why its
// colours are read off the decades above rather than off a step that goes down.
const BOX_STEPS = [
  // steps 1-25: $0.30 -> $0.97
  0.30, 0.32, 0.33, 0.35, 0.36, 0.38, 0.40, 0.42, 0.44,
  0.47, 0.49, 0.51, 0.54, 0.57, 0.59, 0.62, 0.65, 0.69,
  0.72, 0.76, 0.80, 0.84, 0.88, 0.92, 0.97,
  // steps 26-72: $1.02 -> $9.58
  1.02, 1.07, 1.12, 1.18, 1.23, 1.30, 1.36, 1.43, 1.50,
  1.58, 1.65, 1.74, 1.82, 1.92, 2.01, 2.11, 2.22, 2.33,
  2.44, 2.57, 2.70, 2.83, 2.97, 3.12, 3.28, 3.44, 3.61,
  3.79, 3.98, 4.18, 4.39, 4.61, 4.84, 5.08, 5.34, 5.60,
  5.88, 6.18, 6.49, 6.81, 7.15, 7.51, 7.89, 8.28, 8.69,
  9.13, 9.58,
  // steps 73-120: $10.06 -> $99.69
  10.06, 10.57, 11.10, 11.65, 12.23, 12.84, 13.49, 14.16, 14.87,
  15.61, 16.39, 17.21, 18.07, 18.98, 19.93, 20.92, 21.97, 23.07,
  24.22, 25.43, 26.70, 28.04, 29.44, 30.91, 32.46, 34.08, 35.78,
  37.57, 39.45, 41.42, 43.49, 45.67, 47.95, 50.35, 52.87, 55.51,
  58.29, 61.20, 64.26, 67.47, 70.85, 74.39, 78.11, 82.01, 86.12,
  90.42, 94.94, 99.69,
  // steps 121-167: $104.67 -> $987.52
  104.67, 109.91, 115.40, 121.17, 127.23, 133.59, 140.27, 147.29, 154.65,
  162.38, 170.50, 179.03, 187.98, 197.38, 207.25, 217.61, 228.49, 239.91,
  251.91, 264.50, 277.73, 291.62, 306.20, 321.51, 337.58, 354.46, 372.19,
  390.79, 410.33, 430.85, 452.39, 475.01, 498.76, 523.70, 549.89, 577.38,
  606.25, 636.56, 668.39, 701.81, 736.90, 773.75, 812.43, 853.05, 895.71,
  940.49, 987.52,
  // steps 168-185: $1036.89 -> $2376.58
  1036.89, 1088.74, 1143.18, 1200.33, 1260.35, 1323.37, 1389.54, 1459.01, 1531.96,
  1608.56, 1688.99, 1773.44, 1862.11, 1955.22, 2052.98, 2155.63, 2263.41, 2376.58
];

export const plans = {
  vnd: (cooldown = VND_LOCK) => ({
    custom: VND_STEPS.slice(), tierEnds: bandEnds(VND_STEPS), cooldown,
    // Only a fallback for the options dialog, should the list ever be cleared.
    start: 20000, ratio: 1.10, steps: VND_STEPS.length, roundTo: 10
  }),
  usd: (cooldown = USD_LOCK) => ({
    custom: USD_STEPS.slice(), tierEnds: bandEnds(USD_STEPS), cooldown,
    start: 0.30, ratio: 1.08, steps: USD_STEPS.length, roundTo: 0.01
  }),
  // The box wears the same three colours as the tracks — the frame it is drawn in is gold whatever
  // happens, so the band colour is free to go on saying the one thing colour says in this app.
  box: () => ({
    custom: BOX_STEPS.slice(), tierEnds: decadeEnds(BOX_STEPS), cooldown: BOX_LOCK,
    start: 0.30, ratio: 1.05, steps: BOX_STEPS.length, roundTo: 0.01
  })
};

// ---- reading a plan --------------------------------------------------------------------------

const usesCustom = p => p.custom.length > 0;
export const count = p => (usesCustom(p) ? p.custom.length : Math.max(1, p.steps));

export function amountAt(p, index) {
  const i = Math.max(0, index);
  if (usesCustom(p)) return p.custom[Math.min(i, p.custom.length - 1)];
  const raw = p.start * Math.pow(p.ratio, i);
  return p.roundTo > 0 ? Math.round(raw / p.roundTo) * p.roundTo : raw;
}

/** Zero-based colour tier the given step falls in. */
export function tierAt(p, index) {
  let tier = 0;
  for (const end of p.tierEnds) { if (index < end) break; tier++; }
  return tier;
}

/**
 * Steps still to clear before the colour changes. Past the last band there is no next colour, so
 * the end of the ladder stands in for one — the run-up to finishing should feel like the run-up to
 * a promotion, not like nothing at all.
 */
export function toNextTier(p, done) {
  for (const end of p.tierEnds) if (done < end) return end - done;
  return Math.max(0, count(p) - done);
}
