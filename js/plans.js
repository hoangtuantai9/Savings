// The four ladders, transcribed from the source spreadsheet: column A is VND and column B is USD,
// 183 steps each; columns C and D are the bonuses behind them.
// The sheet keeps VND in thousands ("20,00" = 20.000 ₫), so every VND figure is stored ×1000 —
// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
//
// These tables are generated from the sheet and are not edited by hand. Where the sheet and the
// app disagree, the sheet is right — the sheet is the ladder, and this file is only a transcript
// of it. The re-cut sheet climbs at a flat ×1.10 in VND and ×1.08 in USD, with none of the steps
// that used to go down inside a run; if a step ever goes down again, it is a run boundary and the
// colour bands below will find it on their own.

/** Bumped whenever the tables below change, so a saved file adopts the new ladder. */
export const VERSION = 18;

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
 */
export const VND_REPEG = { version: 18, done: 0 };

// Minutes each track locks for after a step is banked. Deliberately different per currency, so the
// two ladders never fall into step and hand you both questions at once.
const VND_LOCK = 18, USD_LOCK = 25;

// How long each bonus stays away once taken, and how many times a day it may be taken at all.
// Neither is ever drawn anywhere: the whole point of a bonus is that you cannot tell whether it is
// five minutes or fifty away, and a counter of what is left today would give the second one up as
// surely as a clock gives the first.
const VND_BONUS_LOCK = 45, USD_BONUS_LOCK = 45;

/** Twice a day, per currency. The third take of the day does not come round until tomorrow. */
export const BONUS_PER_DAY = 2;

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

const VND_STEPS = [
  // red — run 1: steps 1-40, 20.000 d -> 822.900 d
  20_000, 22_000, 24_200, 26_620, 29_280, 32_210, 35_430, 38_970, 42_870,
  47_160, 51_870, 57_060, 62_770, 69_050, 75_950, 83_540, 91_900, 101_090,
  111_200, 122_320, 134_550, 148_000, 162_810, 179_090, 196_990, 216_690, 238_360,
  262_200, 288_420, 317_260, 348_990, 383_890, 422_280, 464_500, 510_950, 562_050,
  618_250, 680_080, 748_090, 822_900,
  // amber — run 2: steps 41-78, 150.000 d -> 5.100.590 d
  150_000, 165_000, 181_500, 199_650, 219_620, 241_580, 265_730, 292_310, 321_540,
  353_690, 389_060, 427_970, 470_760, 517_840, 569_620, 626_590, 689_250, 758_170,
  833_990, 917_390, 1_009_120, 1_110_040, 1_221_040, 1_343_150, 1_477_460, 1_625_210, 1_787_730,
  1_966_500, 2_163_150, 2_379_460, 2_617_410, 2_879_150, 3_167_070, 3_483_770, 3_832_150, 4_215_370,
  4_636_900, 5_100_590,
  // green — run 3: steps 79-103, 500.000 d -> 4.924.870 d
  500_000, 550_000, 605_000, 665_500, 732_050, 805_260, 885_780, 974_360, 1_071_790,
  1_178_970, 1_296_870, 1_426_560, 1_569_210, 1_726_140, 1_898_750, 2_088_620, 2_297_490, 2_527_240,
  2_779_960, 3_057_950, 3_363_750, 3_700_120, 4_070_140, 4_477_150, 4_924_870,
  // green — run 4: steps 104-128, 800.000 d -> 7.879.790 d
  800_000, 880_000, 968_000, 1_064_800, 1_171_280, 1_288_410, 1_417_250, 1_558_970, 1_714_870,
  1_886_360, 2_074_990, 2_282_490, 2_510_740, 2_761_820, 3_038_000, 3_341_800, 3_675_980, 4_043_580,
  4_447_930, 4_892_730, 5_382_000, 5_920_200, 6_512_220, 7_163_440, 7_879_790,
  // green — run 5: steps 129-153, 800.000 d -> 7.879.790 d
  800_000, 880_000, 968_000, 1_064_800, 1_171_280, 1_288_410, 1_417_250, 1_558_970, 1_714_870,
  1_886_360, 2_074_990, 2_282_490, 2_510_740, 2_761_820, 3_038_000, 3_341_800, 3_675_980, 4_043_580,
  4_447_930, 4_892_730, 5_382_000, 5_920_200, 6_512_220, 7_163_440, 7_879_790,
  // green — run 6: steps 154-183, 800.000 d -> 12.690.470 d
  800_000, 880_000, 968_000, 1_064_800, 1_171_280, 1_288_410, 1_417_250, 1_558_970, 1_714_870,
  1_886_360, 2_074_990, 2_282_490, 2_510_740, 2_761_820, 3_038_000, 3_341_800, 3_675_980, 4_043_580,
  4_447_930, 4_892_730, 5_382_000, 5_920_200, 6_512_220, 7_163_440, 7_879_790, 8_667_760, 9_534_540,
  10_488_000, 11_536_790, 12_690_470
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
  // green — run 5: steps 132-159, $50.00 -> $399.40
  50.00, 54.00, 58.32, 62.99, 68.02, 73.47, 79.34, 85.69, 92.55,
  99.95, 107.95, 116.58, 125.91, 135.98, 146.86, 158.61, 171.30, 185.00,
  199.80, 215.79, 233.05, 251.69, 271.83, 293.57, 317.06, 342.42, 369.82,
  399.40,
  // green — run 6: steps 160-183, $80.00 -> $469.72
  80.00, 86.40, 93.31, 100.78, 108.84, 117.55, 126.95, 137.11, 148.07,
  159.92, 172.71, 186.53, 201.45, 217.57, 234.98, 253.77, 274.08, 296.00,
  319.68, 345.26, 372.88, 402.71, 434.92, 469.72
];

// Column C — 100 steps at ×1.20, opening below the main VND ladder and overtaking it by step three:
// by step ten it asks 92.360 ₫ where the main ladder asks 47.160 ₫.
const VND_BONUS_STEPS = [
  // run 1: steps 1-25, 17.900 d -> 1.422.990 d
  17_900, 21_480, 25_780, 30_930, 37_120, 44_540, 53_450, 64_140, 76_970,
  92_360, 110_830, 133_000, 159_600, 191_520, 229_820, 275_790, 330_940, 397_130,
  476_560, 571_870, 686_240, 823_490, 988_190, 1_185_830, 1_422_990,
  // run 2: steps 26-40, 150.000 d -> 1.925.880 d
  150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
  773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
  // run 3: steps 41-55, 150.000 d -> 1.925.880 d
  150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
  773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
  // run 4: steps 56-70, 150.000 d -> 1.925.880 d
  150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
  773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
  // run 5: steps 71-85, 150.000 d -> 1.925.880 d
  150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
  773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
  // run 6: steps 86-100, 150.000 d -> 1.925.880 d
  150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
  773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880
];

// Column D — 104 steps at ×1.20, the shallowest start in the app at five cents.
const USD_BONUS_STEPS = [
  // run 1: steps 1-21, $0.05 -> $1.92
  0.05, 0.06, 0.07, 0.09, 0.10, 0.12, 0.15, 0.18, 0.21,
  0.26, 0.31, 0.37, 0.45, 0.53, 0.64, 0.77, 0.92, 1.11,
  1.33, 1.60, 1.92,
  // run 2: steps 22-39, $0.80 -> $17.75
  0.80, 0.96, 1.15, 1.38, 1.66, 1.99, 2.39, 2.87, 3.44,
  4.13, 4.95, 5.94, 7.13, 8.56, 10.27, 12.33, 14.79, 17.75,
  // run 3: steps 40-48, $7.00 -> $30.10
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  // run 4: steps 49-62, $7.00 -> $74.90
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90,
  // run 5: steps 63-76, $7.00 -> $74.90
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90,
  // run 6: steps 77-90, $7.00 -> $74.90
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90,
  // run 7: steps 91-104, $7.00 -> $74.90
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90
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
  // No tiers on either bonus: one colour of its own, deliberately outside the red-amber-green
  // scale, so an ice stone can never be mistaken for having just been promoted.
  vndBonus: () => ({
    custom: VND_BONUS_STEPS.slice(), tierEnds: [], cooldown: VND_BONUS_LOCK,
    start: 17900, ratio: 1.20, steps: VND_BONUS_STEPS.length, roundTo: 10
  }),
  usdBonus: () => ({
    custom: USD_BONUS_STEPS.slice(), tierEnds: [], cooldown: USD_BONUS_LOCK,
    start: 0.05, ratio: 1.20, steps: USD_BONUS_STEPS.length, roundTo: 0.01
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
