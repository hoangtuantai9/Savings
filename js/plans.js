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
export const VERSION = 8;

// Minutes each track locks for after a step is banked. Deliberately different per currency, so the
// two ladders never fall into step and hand you both questions at once.
const VND_LOCK = 18, USD_LOCK = 25;

// How long each bonus stays away once taken, and how many times a day it may be taken at all.
// Neither is ever drawn anywhere: the whole point of a bonus is that you cannot tell whether it is
// five minutes or fifty away, and a counter of what is left today would give the second one up as
// surely as a clock gives the first.
const VND_BONUS_LOCK = 60, USD_BONUS_LOCK = 60;

/** Twice a day, per currency. The third take of the day does not come round until tomorrow. */
export const BONUS_PER_DAY = 2;

const VND_STEPS = [
  // red — run 1: steps 1-21, 17.900 d -> 292.960 d
  17_900, 20_590, 23_670, 27_220, 31_310, 36_000, 41_400, 47_610, 54_760,
  62_970, 72_420, 83_280, 95_770, 110_130, 126_660, 145_650, 167_500, 192_630,
  221_520, 254_750, 292_960,
  // amber — run 2: steps 22-31, 150.000 d -> 527.680 d
  150_000, 172_500, 198_380, 228_130, 262_350, 301_700, 346_960, 399_000, 458_850,
  527_680,
  // green — run 3: steps 32-67, 19.000 d -> 2.530.330 d
  19_000, 21_850, 25_130, 28_900, 33_230, 38_220, 43_950, 50_540, 58_120,
  66_840, 76_870, 88_400, 101_650, 116_900, 134_440, 154_600, 177_790, 204_460,
  235_130, 270_400, 310_960, 357_610, 411_250, 472_940, 543_880, 625_460, 719_280,
  827_170, 951_250, 1_093_930, 1_258_020, 1_446_730, 1_663_740, 1_913_300, 2_200_290, 2_530_330,
  // green — run 4: steps 68-83, 300.000 d -> 2.441.120 d
  300_000, 345_000, 396_750, 456_260, 524_700, 603_410, 693_920, 798_010, 917_710,
  1_055_360, 1_213_670, 1_395_720, 1_605_080, 1_845_840, 2_122_710, 2_441_120,
  // green — run 5: steps 84-100, 500.000 d -> 4.678.810 d
  500_000, 575_000, 661_250, 760_440, 874_500, 1_005_680, 1_156_530, 1_330_010, 1_529_510,
  1_758_940, 2_022_780, 2_326_200, 2_675_130, 3_076_390, 3_537_850, 4_068_530, 4_678_810,
  // green — run 6: steps 101-114, 500.000 d -> 3.076.390 d
  500_000, 575_000, 661_250, 760_440, 874_500, 1_005_680, 1_156_530, 1_330_010, 1_529_510,
  1_758_940, 2_022_780, 2_326_200, 2_675_130, 3_076_390,
  // green — run 7: steps 115-134, 500.000 d -> 7.115.890 d
  500_000, 575_000, 661_250, 760_440, 874_500, 1_005_680, 1_156_530, 1_330_010, 1_529_510,
  1_758_940, 2_022_780, 2_326_200, 2_675_130, 3_076_390, 3_537_850, 4_068_530, 4_678_810, 5_380_630,
  6_187_730, 7_115_890,
  // green — run 8: steps 135-152, 750.000 d -> 8.070.950 d
  750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
  2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950,
  // green — run 9: steps 153-170, 750.000 d -> 8.070.950 d
  750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
  2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950,
  // green — run 10: steps 171-188, 750.000 d -> 8.070.950 d
  750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
  2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950,
  // green — run 11: steps 189-201, 750.000 d -> 4.614.590 d
  750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
  2_638_410, 3_034_170, 3_489_290, 4_614_590,
  // green — run 12: steps 202-206, 4.012.690 d -> 8.070.950 d
  4_012_690, 5_306_780, 6_102_800, 7_018_220, 8_070_950
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
  // Step counts where a colour tier ends: VND red 1-21, amber 22-31, green from 32.
  vnd: (cooldown = VND_LOCK) => ({
    custom: VND_STEPS.slice(), tierEnds: [21, 31], cooldown,
    // Only a fallback for the options dialog, should the list ever be cleared.
    start: 17900, ratio: 1.15, steps: VND_STEPS.length, roundTo: 10
  }),
  // USD red 1-54, amber 55-75, green from 76.
  usd: (cooldown = USD_LOCK) => ({
    custom: USD_STEPS.slice(), tierEnds: [54, 75], cooldown,
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
