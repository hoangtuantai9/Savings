// The ladders, transcribed from DataSavingFinal.csv by way of the desktop app's Plans.cs.
// Column A is VND and column B is USD, 206 steps each; columns C and D are the bonuses.
// The sheet keeps VND in thousands ("17,90" = 17.900 ₫), so every VND figure is stored ×1000 —
// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
//
// One pair of column A arrives transposed in the sheet — 4.614,59 typed above 4.012,69 at rows
// 201/202 — which would make the ladder step backwards. The run is a clean ×1.15 either side of
// it, so the two are swapped back here.

/** Bumped whenever the tables below change, so a saved file adopts the new ladder. */
export const VERSION = 7;

// Minutes each track locks for after a step is banked. Deliberately different per currency, so the
// two ladders never fall into step and hand you both questions at once.
export const VND_LOCK = 18, USD_LOCK = 25;

// How long each bonus stays away once taken. These are never drawn anywhere: the whole point of a
// bonus is that you cannot tell whether it is five minutes or fifty away. The two are coprime, so
// the stones drift apart instead of surfacing together.
export const VND_BONUS_LOCK = 59, USD_BONUS_LOCK = 73;

const VND_STEPS = [
  // red — 17.900 ₫ → 292.960 ₫ (21 steps)
  17900, 20590, 23670, 27220, 31310, 36000, 41400, 47610, 54760,
  62970, 72420, 83280, 95770, 110130, 126660, 145650, 167500, 192630,
  221520, 254750, 292960,
  // amber — 150.000 ₫ → 527.680 ₫ (10 steps)
  150000, 172500, 198380, 228130, 262350, 301700, 346960, 399000, 458850,
  527680,
  // green — nine more runs
  19000, 21850, 25130, 28900, 33230, 38220, 43950, 50540, 58120,
  66840, 76870, 88400, 101650, 116900, 134440, 154600, 177790, 204460,
  235130, 270400, 310960, 357610, 411250, 472940, 543880, 625460, 719280,
  827170, 951250, 1093930, 1258020, 1446730, 1663740, 1913300, 2200290, 2530330,
  300000, 345000, 396750, 456260, 524700, 603410, 693920, 798010, 917710,
  1055360, 1213670, 1395720, 1605080, 1845840, 2122710, 2441120,
  500000, 575000, 661250, 760440, 874500, 1005680, 1156530, 1330010, 1529510,
  1758940, 2022780, 2326200, 2675130, 3076390, 3537850, 4068530, 4678810,
  500000, 575000, 661250, 760440, 874500, 1005680, 1156530, 1330010, 1529510,
  1758940, 2022780, 2326200, 2675130, 3076390,
  500000, 575000, 661250, 760440, 874500, 1005680, 1156530, 1330010, 1529510,
  1758940, 2022780, 2326200, 2675130, 3076390, 3537850, 4068530, 4678810, 5380630,
  6187730, 7115890,
  750000, 862500, 991880, 1140660, 1311750, 1508520, 1734800, 1995010, 2294270,
  2638410, 3034170, 3489290, 4012690, 4614590, 5306780, 6102800, 7018220, 8070950,
  750000, 862500, 991880, 1140660, 1311750, 1508520, 1734800, 1995010, 2294270,
  2638410, 3034170, 3489290, 4012690, 4614590, 5306780, 6102800, 7018220, 8070950,
  750000, 862500, 991880, 1140660, 1311750, 1508520, 1734800, 1995010, 2294270,
  2638410, 3034170, 3489290, 4012690, 4614590, 5306780, 6102800, 7018220, 8070950,
  750000, 862500, 991880, 1140660, 1311750, 1508520, 1734800, 1995010, 2294270,
  2638410, 3034170, 3489290, 4012690, 4614590, 5306780, 6102800, 7018220, 8070950
];

const USD_STEPS = [
  // red — $0.20 → $31.25 (54 steps)
  0.20, 0.22, 0.24, 0.27, 0.29, 0.32, 0.35, 0.39, 0.43,
  0.47, 0.52, 0.57, 0.63, 0.69, 0.76, 0.84, 0.92, 1.01,
  1.11, 1.22, 1.35, 1.48, 1.63, 1.79, 1.97, 2.17, 2.38,
  2.62, 2.88, 3.17, 3.49, 3.84, 4.22, 4.65, 5.11, 5.62,
  6.18, 6.80, 7.48, 8.23, 9.05, 9.96, 10.95, 12.05, 13.25,
  14.58, 16.04, 17.64, 19.40, 21.34, 23.48, 25.83, 28.41, 31.25,
  // amber — $15.00 → $100.91 (21 steps)
  15.00, 16.50, 18.15, 19.97, 21.96, 24.16, 26.57, 29.23, 32.15,
  35.37, 38.91, 42.80, 47.08, 51.78, 56.96, 62.66, 68.92, 75.82,
  83.40, 91.74, 100.91,
  // green — six more runs
  30.00, 33.00, 36.30, 39.93, 43.92, 48.32, 53.15, 58.46, 64.31,
  70.74, 77.81, 85.59, 94.15, 103.57, 113.92, 125.32, 137.85, 151.63,
  166.80, 183.48, 201.82,
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80, 336.37, 370.01, 407.01, 447.72, 492.49,
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80, 336.37, 370.01, 407.01,
  75.00, 82.50, 90.75, 99.83, 109.81, 120.79, 132.87, 146.15, 160.77,
  176.85, 194.53, 213.98, 235.38, 258.92, 284.81, 313.29, 344.62, 379.09,
  416.99, 458.69, 504.56,
  100.00, 110.00, 121.00, 133.10, 146.41, 161.05, 177.16, 194.87, 214.36,
  235.79, 259.37, 285.31, 313.84, 345.23, 379.75, 417.72, 459.50, 505.45,
  555.99, 611.59, 672.75, 740.02, 814.03,
  100.00, 110.00, 121.00, 133.10, 146.41, 161.05, 177.16, 194.87, 214.36,
  235.79, 259.37, 285.31, 313.84, 345.23, 379.75, 417.72, 459.50, 505.45
];

// Column C — 100 steps at ×1.20, opening on the same 17.900 ₫ as the main VND ladder and pulling
// away fast: by step ten it asks 92.360 ₫ where the main ladder asks 62.970 ₫.
const VND_BONUS_STEPS = [
  17900, 21480, 25780, 30930, 37120, 44540, 53450, 64140, 76970,
  92360, 110830, 133000, 159600, 191520, 229820, 275790, 330940, 397130,
  476560, 571870, 686240, 823490, 988190, 1185830, 1422990,
  150000, 180000, 216000, 259200, 311040, 373250, 447900, 537480, 644970,
  773970, 928760, 1114510, 1337420, 1604900, 1925880,
  150000, 180000, 216000, 259200, 311040, 373250, 447900, 537480, 644970,
  773970, 928760, 1114510, 1337420, 1604900, 1925880,
  150000, 180000, 216000, 259200, 311040, 373250, 447900, 537480, 644970,
  773970, 928760, 1114510, 1337420, 1604900, 1925880,
  150000, 180000, 216000, 259200, 311040, 373250, 447900, 537480, 644970,
  773970, 928760, 1114510, 1337420, 1604900, 1925880,
  150000, 180000, 216000, 259200, 311040, 373250, 447900, 537480, 644970,
  773970, 928760, 1114510, 1337420, 1604900, 1925880
];

// Column D — 104 steps at ×1.20, the shallowest start in the app at five cents.
const USD_BONUS_STEPS = [
  0.05, 0.06, 0.07, 0.09, 0.10, 0.12, 0.15, 0.18, 0.21,
  0.26, 0.31, 0.37, 0.45, 0.53, 0.64, 0.77, 0.92, 1.11,
  1.33, 1.60, 1.92,
  0.80, 0.96, 1.15, 1.38, 1.66, 1.99, 2.39, 2.87, 3.44,
  4.13, 4.95, 5.94, 7.13, 8.56, 10.27, 12.33, 14.79, 17.75,
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90,
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90,
  7.00, 8.40, 10.08, 12.10, 14.52, 17.42, 20.90, 25.08, 30.10,
  36.12, 43.34, 52.01, 62.41, 74.90,
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

export const usesCustom = p => p.custom.length > 0;
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
