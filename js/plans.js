// The three ladders, transcribed from the source spreadsheet, which is now three columns wide and
// has nothing in it that is not read: column A is VND, column B is USD and column C is the box.
// A column ends where the sheet stops filling it in, so the three are different lengths, and each
// says where its own colour bands end by starting over at a round number. All three are independent
// of one another, each on its own clock.
// The sheet keeps VND in thousands ("20,00" = 20.000 ₫), so every VND figure is stored ×1000 —
// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
//
// These tables are generated from the sheet and are not edited by hand. Where the sheet and the
// app disagree, the sheet is right — the sheet is the ladder, and this file is only a transcript
// of it. The re-cut sheet climbs at a flat ×1.10 in VND and ×1.08 in USD, with none of the steps
// that used to go down inside a run; if a step ever goes down again, it is a run boundary and the
// colour bands below will find it on their own.

/** Bumped whenever the tables below change, so a saved file adopts the new ladder. */
export const VERSION = 28;

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
 * number, never past it. It has sat still through every version that moved no ladder's position and
 * moved three times, at 22, 25 and now 28, each time a new journey was asked for by name. Ahead of the
 * reset it would send a set of books that has already been through one back to step 1 a second time,
 * which is a contradiction of the reset rather than a subset of it, and reachable only from a cache
 * nobody can see into.
 */
export const VND_REPEG = { version: 28, done: 0 };

// Minutes each track locks for after a step is banked. Deliberately different per currency, so the
// two ladders never fall into step and hand you both questions at once. USD came down from 25 to 24
// in VERSION 20; because a wait is only ever lengthened where it is read, state.js has to move a
// stored 25 down with it, or the change would never reach a set of books already in use.
const VND_LOCK = 18, USD_LOCK = 24;

// The box's own wait, and the whole of what governs it: it is away for this long after it is
// opened, and it is back when the time is up. Nothing else limits it — there is no allowance, no
// count of what is left today and no ceiling on how many times it may be taken; open it as often as
// its clock comes round. Nothing about it is tied to either track either: a USD lock running out
// neither summons it nor sends it away.
//
// Thirty minutes. The tracks wait 18 and 24, so this is deliberately unlike both — three clocks
// that fall into step would hand you everything at once — and it is the one number here to change
// if the box should come round more or less often.
const BOX_LOCK = 30;

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
  // red — run 1: steps 1-35, 20.000 d -> 510.950 d
  20_000, 22_000, 24_200, 26_620, 29_280, 32_210, 35_430, 38_970, 42_870,
  47_160, 51_870, 57_060, 62_770, 69_050, 75_950, 83_540, 91_900, 101_090,
  111_200, 122_320, 134_550, 148_000, 162_810, 179_090, 196_990, 216_690, 238_360,
  262_200, 288_420, 317_260, 348_990, 383_890, 422_280, 464_500, 510_950,
  // amber — run 2: steps 36-57, 400.000 d -> 2.960.100 d
  400_000, 440_000, 484_000, 532_400, 585_640, 644_200, 708_620, 779_490, 857_440,
  943_180, 1_037_500, 1_141_250, 1_255_370, 1_380_910, 1_519_000, 1_670_900, 1_837_990, 2_021_790,
  2_223_970, 2_446_360, 2_691_000, 2_960_100,
  // green — run 3: steps 58-85, 300.000 d -> 3.933.000 d
  300_000, 330_000, 363_000, 399_300, 439_230, 483_150, 531_470, 584_620, 643_080,
  707_380, 778_120, 855_940, 941_530, 1_035_680, 1_139_250, 1_253_170, 1_378_490, 1_516_340,
  1_667_980, 1_834_770, 2_018_250, 2_220_070, 2_442_080, 2_686_290, 2_954_920, 3_250_410, 3_575_450,
  3_933_000,
  // green — run 4: steps 86-117, 300.000 d -> 5.758.300 d
  300_000, 330_000, 363_000, 399_300, 439_230, 483_150, 531_470, 584_620, 643_080,
  707_380, 778_120, 855_940, 941_530, 1_035_680, 1_139_250, 1_253_170, 1_378_490, 1_516_340,
  1_667_980, 1_834_770, 2_018_250, 2_220_070, 2_442_080, 2_686_290, 2_954_920, 3_250_410, 3_575_450,
  3_933_000, 4_326_300, 4_758_930, 5_234_820, 5_758_300,
  // green — run 5: steps 118-141, 500.000 d -> 4.477.150 d
  500_000, 550_000, 605_000, 665_500, 732_050, 805_260, 885_780, 974_360, 1_071_790,
  1_178_970, 1_296_870, 1_426_560, 1_569_210, 1_726_140, 1_898_750, 2_088_620, 2_297_490, 2_527_240,
  2_779_960, 3_057_950, 3_363_750, 3_700_120, 4_070_140, 4_477_150,
  // green — run 6: steps 142-163, 1.000.000 d -> 7.400.250 d
  1_000_000, 1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510, 1_771_560, 1_948_720, 2_143_590,
  2_357_950, 2_593_740, 2_853_120, 3_138_430, 3_452_270, 3_797_500, 4_177_250, 4_594_970, 5_054_470,
  5_559_920, 6_115_910, 6_727_500, 7_400_250,
  // green — run 7: steps 164-185, 1.000.000 d -> 7.400.250 d
  1_000_000, 1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510, 1_771_560, 1_948_720, 2_143_590,
  2_357_950, 2_593_740, 2_853_120, 3_138_430, 3_452_270, 3_797_500, 4_177_250, 4_594_970, 5_054_470,
  5_559_920, 6_115_910, 6_727_500, 7_400_250,
  // green — run 8: steps 186-207, 1.000.000 d -> 7.400.250 d
  1_000_000, 1_100_000, 1_210_000, 1_331_000, 1_464_100, 1_610_510, 1_771_560, 1_948_720, 2_143_590,
  2_357_950, 2_593_740, 2_853_120, 3_138_430, 3_452_270, 3_797_500, 4_177_250, 4_594_970, 5_054_470,
  5_559_920, 6_115_910, 6_727_500, 7_400_250
];

const USD_STEPS = [
  // red — run 1: steps 1-52, $0.50 -> $64.56
  0.50, 0.55, 0.61, 0.67, 0.73, 0.81, 0.89, 0.97, 1.07,
  1.18, 1.30, 1.43, 1.57, 1.73, 1.90, 2.09, 2.30, 2.53,
  2.78, 3.06, 3.36, 3.70, 4.07, 4.48, 4.92, 5.42, 5.96,
  6.55, 7.21, 7.93, 8.72, 9.60, 10.56, 11.61, 12.77, 14.05,
  15.46, 17.00, 18.70, 20.57, 22.63, 24.89, 27.38, 30.12, 33.13,
  36.45, 40.09, 44.10, 48.51, 53.36, 58.70, 64.56,
  // amber — run 2: steps 53-81, $15.00 -> $216.31
  15.00, 16.50, 18.15, 19.97, 21.96, 24.16, 26.57, 29.23, 32.15,
  35.37, 38.91, 42.80, 47.08, 51.78, 56.96, 62.66, 68.92, 75.82,
  83.40, 91.74, 100.91, 111.00, 122.10, 134.31, 147.75, 162.52, 178.77,
  196.65, 216.31,
  // green — run 3: steps 82-101, $50.00 -> $305.80
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80,
  // green — run 4: steps 102-121, $50.00 -> $305.80
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80,
  // green — run 5: steps 122-145, $50.00 -> $447.72
  50.00, 55.00, 60.50, 66.55, 73.21, 80.53, 88.58, 97.44, 107.18,
  117.90, 129.69, 142.66, 156.92, 172.61, 189.87, 208.86, 229.75, 252.72,
  278.00, 305.80, 336.37, 370.01, 407.01, 447.72,
  // green — run 6: steps 146-169, $80.00 -> $716.34
  80.00, 88.00, 96.80, 106.48, 117.13, 128.84, 141.72, 155.90, 171.49,
  188.64, 207.50, 228.25, 251.07, 276.18, 303.80, 334.18, 367.60, 404.36,
  444.79, 489.27, 538.20, 592.02, 651.22, 716.34,
  // green — run 7: steps 170-199, $80.00 -> $1269.05
  80.00, 88.00, 96.80, 106.48, 117.13, 128.84, 141.72, 155.90, 171.49,
  188.64, 207.50, 228.25, 251.07, 276.18, 303.80, 334.18, 367.60, 404.36,
  444.79, 489.27, 538.20, 592.02, 651.22, 716.34, 787.98, 866.78, 953.45,
  1048.80, 1153.68, 1269.05
];

// Column C — 114 steps at ×1.20, the shallowest opening in the app at fifteen cents and the
// steepest climb of the three.
//
// It reads its bands the same way the other two do now. It used to have no run boundary bandEnds()
// could see, and its colours were worked out from the decades it crossed instead; the sheet has
// since given it four steps that go down, so it says where its own bands end and there is nothing
// left to infer.
const BOX_STEPS = [
  // red — run 1: steps 1-31, $0.15 -> $35.61
  0.15, 0.18, 0.22, 0.26, 0.31, 0.37, 0.45, 0.54, 0.64,
  0.77, 0.93, 1.11, 1.34, 1.60, 1.93, 2.31, 2.77, 3.33,
  3.99, 4.79, 5.75, 6.90, 8.28, 9.94, 11.92, 14.31, 17.17,
  20.61, 24.73, 29.67, 35.61,
  // amber — run 2: steps 32-45, $5.00 -> $53.50
  5.00, 6.00, 7.20, 8.64, 10.37, 12.44, 14.93, 17.92, 21.50,
  25.80, 30.96, 37.15, 44.58, 53.50,
  // green — run 3: steps 46-63, $5.00 -> $110.93
  5.00, 6.00, 7.20, 8.64, 10.37, 12.44, 14.93, 17.92, 21.50,
  25.80, 30.96, 37.15, 44.58, 53.50, 64.20, 77.04, 92.44, 110.93,
  // green — run 4: steps 64-85, $5.00 -> $230.03
  5.00, 6.00, 7.20, 8.64, 10.37, 12.44, 14.93, 17.92, 21.50,
  25.80, 30.96, 37.15, 44.58, 53.50, 64.20, 77.04, 92.44, 110.93,
  133.12, 159.74, 191.69, 230.03,
  // green — run 5: steps 86-114, $5.00 -> $824.22
  5.00, 6.00, 7.20, 8.64, 10.37, 12.44, 14.93, 17.92, 21.50,
  25.80, 30.96, 37.15, 44.58, 53.50, 64.20, 77.04, 92.44, 110.93,
  133.12, 159.74, 191.69, 230.03, 276.03, 331.24, 397.48, 476.98, 572.38,
  686.85, 824.22
];

export const plans = {
  vnd: (cooldown = VND_LOCK) => ({
    custom: VND_STEPS.slice(), tierEnds: bandEnds(VND_STEPS), cooldown,
    // Only a fallback for the options dialog, should the list ever be cleared.
    start: 20000, ratio: 1.10, steps: VND_STEPS.length, roundTo: 10
  }),
  usd: (cooldown = USD_LOCK) => ({
    custom: USD_STEPS.slice(), tierEnds: bandEnds(USD_STEPS), cooldown,
    start: 1.00, ratio: 1.08, steps: USD_STEPS.length, roundTo: 0.01
  }),
  // The box wears the same three colours as the tracks — the frame it is drawn in is gold whatever
  // happens, so the band colour is free to go on saying the one thing colour says in this app.
  box: () => ({
    custom: BOX_STEPS.slice(), tierEnds: bandEnds(BOX_STEPS), cooldown: BOX_LOCK,
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
