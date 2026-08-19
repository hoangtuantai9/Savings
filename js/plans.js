// The four ladders, transcribed from the source spreadsheet: column A is VND and column B is USD,
// 206 steps each; columns C and D are the bonuses behind them.
// The sheet keeps VND in thousands ("17,90" = 17.900 ₫), so every VND figure is stored ×1000 —
// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
//
// These tables are generated from the sheet and are not edited by hand. Where the sheet and the
// app disagree, the sheet is right — including at rows 201/202 of column A, where 4.614,59 is
// typed above 4.012,69. The run is a clean ×1.15 either side of that pair, so it reads as a
// transposition; the app nonetheless takes it exactly as written, which is why VND has one step
// that goes down instead of up and one run more than the shape of the column would suggest.

/** Bumped whenever the tables below change, so a saved file adopts the new ladder. */
export const VERSION = 9;

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
  // red — run 1: steps 1-31, 17.900 d -> 409.770 d
  17_900, 19_870, 22_050, 24_480, 27_170, 30_160, 33_480, 37_160, 41_250,
  45_790, 50_830, 56_420, 62_620, 69_510, 77_160, 85_640, 95_070, 105_520,
  117_130, 130_010, 144_320, 160_190, 177_810, 197_370, 219_080, 243_180, 269_930,
  299_620, 332_580, 369_160, 409_770,
  // amber — run 2: steps 32-73, 30.000 d -> 2.164.530 d
  30_000, 33_300, 36_960, 41_030, 45_540, 50_550, 56_110, 62_280, 69_140,
  76_740, 85_180, 94_550, 104_950, 116_500, 129_310, 143_540, 159_330, 176_850,
  196_310, 217_900, 241_870, 268_470, 298_010, 330_790, 367_170, 407_560, 452_400,
  502_160, 557_400, 618_710, 686_770, 762_310, 846_170, 939_250, 1_042_560, 1_157_250,
  1_284_540, 1_425_840, 1_582_680, 1_756_780, 1_950_030, 2_164_530,
  // green — run 3: steps 74-100, 300.000 d -> 4.523.960 d
  300_000, 333_000, 369_630, 410_290, 455_420, 505_520, 561_120, 622_850, 691_360,
  767_410, 851_830, 945_530, 1_049_540, 1_164_980, 1_293_130, 1_435_380, 1_593_270, 1_768_530,
  1_963_070, 2_179_000, 2_418_690, 2_684_750, 2_980_070, 3_307_880, 3_671_750, 4_075_640, 4_523_960,
  // green — run 4: steps 101-124, 500.000 d -> 5.513.130 d
  500_000, 555_000, 616_050, 683_820, 759_040, 842_530, 935_210, 1_038_080, 1_152_270,
  1_279_020, 1_419_710, 1_575_880, 1_749_230, 1_941_640, 2_155_220, 2_392_290, 2_655_450, 2_947_550,
  3_271_780, 3_631_670, 4_031_160, 4_474_580, 4_966_790, 5_513_130,
  // green — run 5: steps 125-141, 1.000.000 d -> 5.310.890 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890,
  // green — run 6: steps 142-164, 1.000.000 d -> 9.933.570 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890, 5_895_090,
  6_543_550, 7_263_340, 8_062_310, 8_949_170, 9_933_570,
  // green — run 7: steps 165-187, 1.000.000 d -> 9.933.570 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890, 5_895_090,
  6_543_550, 7_263_340, 8_062_310, 8_949_170, 9_933_570,
  // green — run 8: steps 188-206, 1.000.000 d -> 6.543.550 d
  1_000_000, 1_110_000, 1_232_100, 1_367_630, 1_518_070, 1_685_060, 1_870_410, 2_076_160, 2_304_540,
  2_558_040, 2_839_420, 3_151_760, 3_498_450, 3_883_280, 4_310_440, 4_784_590, 5_310_890, 5_895_090,
  6_543_550
];

const USD_STEPS = [
  // red — run 1: steps 1-54, $0.20 -> $31.25
  0.20, 0.22, 0.24, 0.27, 0.29, 0.32, 0.35, 0.39, 0.43,
  0.47, 0.52, 0.57, 0.63, 0.69, 0.76, 0.84, 0.92, 1.01,
  1.11, 1.22, 1.35, 1.48, 1.63, 1.79, 1.97, 2.17, 2.38,
  2.62, 2.88, 3.17, 3.49, 3.84, 4.22, 4.65, 5.11, 5.62,
  6.18, 6.80, 7.48, 8.23, 9.05, 9.96, 10.95, 12.05, 13.25,
  14.58, 16.04, 17.64, 19.40, 21.34, 23.48, 25.83, 28.41, 31.25,
  // amber — run 2: steps 55-75, $15.00 -> $100.91
  15.00, 16.50, 18.15, 19.97, 21.96, 24.16, 26.57, 29.23, 32.15,
  35.37, 38.91, 42.80, 47.08, 51.78, 56.96, 62.66, 68.92, 75.82,
  83.40, 91.74, 100.91,
  // green — run 3: steps 76-96, $30.00 -> $201.82
  30.00, 33.00, 36.30, 39.93, 43.92, 48.32, 53.15, 58.46, 64.31,
  70.74, 77.81, 85.59, 94.15, 103.57, 113.92, 125.32, 137.85, 151.63,
  166.80, 183.48, 201.82,
  // green — run 4: steps 97-116, $50.00 -> $305.80
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80,
  // green — run 5: steps 117-136, $50.00 -> $305.80
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80,
  // green — run 6: steps 137-151, $80.00 -> $303.80
  80.00, 88.00, 96.80, 106.48, 117.13, 128.84, 141.72, 155.90, 171.49,
  188.64, 207.50, 228.25, 251.07, 276.18, 303.80,
  // green — run 7: steps 152-166, $80.00 -> $303.80
  80.00, 88.00, 96.80, 106.48, 117.13, 128.84, 141.72, 155.90, 171.49,
  188.64, 207.50, 228.25, 251.07, 276.18, 303.80,
  // green — run 8: steps 167-189, $50.00 -> $407.01
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80, 336.37, 370.01, 407.01,
  // green — run 9: steps 190-206, $50.00 -> $229.75
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
    start: 17900, ratio: 1.15, steps: VND_STEPS.length, roundTo: 10
  }),
  usd: (cooldown = USD_LOCK) => ({
    custom: USD_STEPS.slice(), tierEnds: bandEnds(USD_STEPS), cooldown,
    start: 0.20, ratio: 1.10, steps: USD_STEPS.length, roundTo: 0.01
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
