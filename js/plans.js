// The four ladders, transcribed from the source spreadsheet: column A is VND and column B is USD,
// 206 steps each; columns C and D are the bonuses behind them.
// The sheet keeps VND in thousands ("17,90" = 17.900 ₫), so every VND figure is stored ×1000 —
// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
//
// These tables are generated from the sheet and are not edited by hand. Where the sheet and the
// app disagree, the sheet is right — the sheet is the ladder, and this file is only a transcript
// of it. The re-cut sheet climbs at a flat ×1.11 in VND and ×1.10 in USD, with none of the steps
// that used to go down inside a run; if a step ever goes down again, it is a run boundary and the
// colour bands below will find it on their own.

/** Bumped whenever the tables below change, so a saved file adopts the new ladder. */
export const VERSION = 14;

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
export const VND_REPEG = { version: 14, done: 0 };

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
  // red — run 1: steps 1-42, 17.900 d -> 1.291.500 d
  17_900, 19_870, 22_050, 24_480, 27_170, 30_160, 33_480, 37_160, 41_250,
  45_790, 50_830, 56_420, 62_620, 69_510, 77_160, 85_640, 95_070, 105_520,
  117_130, 130_010, 144_320, 160_190, 177_810, 197_370, 219_080, 243_180, 269_930,
  299_620, 332_580, 369_160, 409_770, 454_850, 504_880, 560_420, 622_060, 690_490,
  766_440, 850_750, 944_340, 1_048_210, 1_163_520, 1_291_500,
  // amber — run 2: steps 43-85, 50.000 d -> 4.004.380 d
  50_000, 55_500, 61_610, 68_380, 75_900, 84_250, 93_520, 103_810, 115_230,
  127_900, 141_970, 157_590, 174_920, 194_160, 215_520, 239_230, 265_540, 294_750,
  327_180, 363_170, 403_120, 447_460, 496_680, 551_310, 611_960, 679_270, 753_990,
  836_930, 929_000, 1_031_180, 1_144_610, 1_270_520, 1_410_280, 1_565_410, 1_737_610, 1_928_740,
  2_140_900, 2_376_400, 2_637_810, 2_927_970, 3_250_040, 3_607_550, 4_004_380,
  // green — run 3: steps 86-117, 300.000 d -> 7.623.130 d
  300_000, 333_000, 369_630, 410_290, 455_420, 505_520, 561_120, 622_850, 691_360,
  767_410, 851_830, 945_530, 1_049_540, 1_164_980, 1_293_130, 1_435_380, 1_593_270, 1_768_530,
  1_963_070, 2_179_000, 2_418_690, 2_684_750, 2_980_070, 3_307_880, 3_671_750, 4_075_640, 4_523_960,
  5_021_590, 5_573_970, 6_187_110, 6_867_690, 7_623_130,
  // green — run 4: steps 118-141, 500.000 d -> 5.513.130 d
  500_000, 555_000, 616_050, 683_820, 759_040, 842_530, 935_210, 1_038_080, 1_152_270,
  1_279_020, 1_419_710, 1_575_880, 1_749_230, 1_941_640, 2_155_220, 2_392_290, 2_655_450, 2_947_550,
  3_271_780, 3_631_670, 4_031_160, 4_474_580, 4_966_790, 5_513_130,
  // green — run 5: steps 142-164, 1.000.000 d -> 9.933.570 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890, 5_895_090,
  6_543_550, 7_263_340, 8_062_310, 8_949_170, 9_933_570,
  // green — run 6: steps 165-187, 1.000.000 d -> 9.933.570 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890, 5_895_090,
  6_543_550, 7_263_340, 8_062_310, 8_949_170, 9_933_570,
  // green — run 7: steps 188-206, 1.000.000 d -> 6.543.550 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890, 5_895_090,
  6_543_550
];

const USD_STEPS = [
  // red — run 1: steps 1-75, $0.10 -> $115.63
  0.10, 0.11, 0.12, 0.13, 0.15, 0.16, 0.18, 0.19, 0.21,
  0.24, 0.26, 0.29, 0.31, 0.35, 0.38, 0.42, 0.46, 0.51,
  0.56, 0.61, 0.67, 0.74, 0.81, 0.90, 0.98, 1.08, 1.19,
  1.31, 1.44, 1.59, 1.74, 1.92, 2.11, 2.32, 2.55, 2.81,
  3.09, 3.40, 3.74, 4.11, 4.53, 4.98, 5.48, 6.02, 6.63,
  7.29, 8.02, 8.82, 9.70, 10.67, 11.74, 12.91, 14.20, 15.62,
  17.19, 18.91, 20.80, 22.88, 25.16, 27.68, 30.45, 33.49, 36.84,
  40.53, 44.58, 49.04, 53.94, 59.33, 65.27, 71.80, 78.97, 86.87,
  95.56, 105.12, 115.63,
  // amber — run 2: steps 76-96, $30.00 -> $201.82
  30.00, 33.00, 36.30, 39.93, 43.92, 48.32, 53.15, 58.46, 64.31,
  70.74, 77.81, 85.59, 94.15, 103.57, 113.92, 125.32, 137.85, 151.63,
  166.80, 183.48, 201.82,
  // green — run 3: steps 97-116, $50.00 -> $305.80
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80,
  // green — run 4: steps 117-136, $50.00 -> $305.80
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80,
  // green — run 5: steps 137-151, $80.00 -> $303.80
  80.00, 88.00, 96.80, 106.48, 117.13, 128.84, 141.72, 155.90, 171.49,
  188.64, 207.50, 228.25, 251.07, 276.18, 303.80,
  // green — run 6: steps 152-166, $80.00 -> $303.80
  80.00, 88.00, 96.80, 106.48, 117.13, 128.84, 141.72, 155.90, 171.49,
  188.64, 207.50, 228.25, 251.07, 276.18, 303.80,
  // green — run 7: steps 167-189, $50.00 -> $407.01
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80, 336.37, 370.01, 407.01,
  // green — run 8: steps 190-206, $50.00 -> $229.75
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75
];

// Column C — 100 steps at ×1.20, opening on the same 17.900 ₫ as the main VND ladder and pulling
// away fast: by step ten it asks 92.360 ₫ where the main ladder asks 62.970 ₫.
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
    start: 17900, ratio: 1.11, steps: VND_STEPS.length, roundTo: 10
  }),
  usd: (cooldown = USD_LOCK) => ({
    custom: USD_STEPS.slice(), tierEnds: bandEnds(USD_STEPS), cooldown,
    start: 0.10, ratio: 1.10, steps: USD_STEPS.length, roundTo: 0.01
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
