namespace Savings;

/// <summary>
/// The ladders, transcribed from DataSavingFinal.csv. Column A is VND and column B is USD, 206 steps
/// each. Columns C and D are the bonuses: a second, steeper ladder per currency that only shows up now
/// and then. The sheet keeps VND in thousands ("17,90" = 17.900 ₫), so every VND figure is stored ×1000 —
/// the rest of the app deals in plain đồng and never has to know about the sheet's unit.
///
/// Each column is several runs, each starting over at a round number. The first two runs get a colour
/// of their own; everything from the third run on is green, so the top of the ladder reads as one long
/// climb rather than a dozen separate ones.
///
/// One pair of column A arrives transposed in the sheet — 4.614,59 is typed above 4.012,69 at CSV rows
/// 201/202 — which would make the ladder step backwards. The run is a clean ×1.15 either side of it
/// (3.489,29 → 4.012,69 → 4.614,59 → 5.306,78), so the two are swapped back here.
/// </summary>
public static class Plans
{
    /// <summary>Bumped whenever the tables below change, so a saved file adopts the new ladder.</summary>
    public const int Version = 7;

    /// <summary>
    /// Minutes each track locks for after a step is banked, and therefore how long the wait is that has
    /// to be ridden out before the gem will ask whether you held. Deliberately different per currency,
    /// so the two ladders never fall into step and hand you both questions at once.
    /// </summary>
    public const int VndLock = 18, UsdLock = 25;

    /// <summary>
    /// How long each bonus stays away once it has been taken. These are never drawn anywhere: the
    /// whole point of a bonus is that you cannot tell whether it is five minutes or fifty away, so
    /// showing the clock — or even a greyed-out slot where the stone would be — would give it up.
    /// The two are coprime so the stones drift apart instead of surfacing together.
    /// </summary>
    public const int VndBonusLock = 59, UsdBonusLock = 73;

    /// <summary>Step counts where a colour tier ends: red 1-21, amber 22-31, green from 32.</summary>
    private static readonly int[] VndTiers = { 21, 31 };

    /// <summary>Red 1-54, amber 55-75, green from 76.</summary>
    private static readonly int[] UsdTiers = { 54, 75 };

    public static PlanConfig Vnd(int cooldownMinutes = VndLock) => new()
    {
        Custom = new List<double>(VndSteps),
        TierEnds = new List<int>(VndTiers),
        CooldownMinutes = cooldownMinutes,
        // Only a fallback for the options dialog, should the list ever be cleared.
        Start = 17_900,
        Ratio = 1.15,
        Steps = VndSteps.Length,
        RoundTo = 10
    };

    public static PlanConfig Usd(int cooldownMinutes = UsdLock) => new()
    {
        Custom = new List<double>(UsdSteps),
        TierEnds = new List<int>(UsdTiers),
        CooldownMinutes = cooldownMinutes,
        Start = 0.20,
        Ratio = 1.10,
        Steps = UsdSteps.Length,
        RoundTo = 0.01
    };

    /// <summary>
    /// The VND bonus ladder (column C). No tiers: it wears one colour of its own, deliberately outside
    /// the red-amber-green scale, so an ice stone can never be mistaken for having just been promoted.
    /// </summary>
    public static PlanConfig VndBonus() => new()
    {
        Custom = new List<double>(VndBonusSteps),
        CooldownMinutes = VndBonusLock,
        Start = 17_900,
        Ratio = 1.20,
        Steps = VndBonusSteps.Length,
        RoundTo = 10
    };

    /// <summary>
    /// The USD bonus ladder (column D) — the same idea one currency over, and the shallowest start in
    /// the app at five cents. Like column C it carries no tiers.
    /// </summary>
    public static PlanConfig UsdBonus() => new()
    {
        Custom = new List<double>(UsdBonusSteps),
        CooldownMinutes = UsdBonusLock,
        Start = 0.05,
        Ratio = 1.20,
        Steps = UsdBonusSteps.Length,
        RoundTo = 0.01
    };

    /// <summary>
    /// Column A — 206 steps at ×1.15 across eleven runs. The first run stops early, at 292.960 ₫, and the
    /// second shorter still at 527.680 ₫; the third drops all the way back to 19.000 ₫ and takes
    /// thirty-six steps to climb out of it. The last four runs are the same eighteen-step climb from
    /// 750.000 ₫ repeated.
    /// </summary>
    private static readonly double[] VndSteps =
    {
        // red — 17.900 ₫ → 292.960 ₫ (21 steps)
        17_900, 20_590, 23_670, 27_220, 31_310, 36_000, 41_400, 47_610, 54_760,
        62_970, 72_420, 83_280, 95_770, 110_130, 126_660, 145_650, 167_500, 192_630,
        221_520, 254_750, 292_960,
        // amber — 150.000 ₫ → 527.680 ₫ (10 steps)
        150_000, 172_500, 198_380, 228_130, 262_350, 301_700, 346_960, 399_000, 458_850,
        527_680,
        // green — nine more runs
        19_000, 21_850, 25_130, 28_900, 33_230, 38_220, 43_950, 50_540, 58_120,
        66_840, 76_870, 88_400, 101_650, 116_900, 134_440, 154_600, 177_790, 204_460,
        235_130, 270_400, 310_960, 357_610, 411_250, 472_940, 543_880, 625_460, 719_280,
        827_170, 951_250, 1_093_930, 1_258_020, 1_446_730, 1_663_740, 1_913_300, 2_200_290, 2_530_330,
        300_000, 345_000, 396_750, 456_260, 524_700, 603_410, 693_920, 798_010, 917_710,
        1_055_360, 1_213_670, 1_395_720, 1_605_080, 1_845_840, 2_122_710, 2_441_120,
        500_000, 575_000, 661_250, 760_440, 874_500, 1_005_680, 1_156_530, 1_330_010, 1_529_510,
        1_758_940, 2_022_780, 2_326_200, 2_675_130, 3_076_390, 3_537_850, 4_068_530, 4_678_810,
        500_000, 575_000, 661_250, 760_440, 874_500, 1_005_680, 1_156_530, 1_330_010, 1_529_510,
        1_758_940, 2_022_780, 2_326_200, 2_675_130, 3_076_390,
        500_000, 575_000, 661_250, 760_440, 874_500, 1_005_680, 1_156_530, 1_330_010, 1_529_510,
        1_758_940, 2_022_780, 2_326_200, 2_675_130, 3_076_390, 3_537_850, 4_068_530, 4_678_810, 5_380_630,
        6_187_730, 7_115_890,
        750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
        2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950,
        750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
        2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950,
        750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
        2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950,
        750_000, 862_500, 991_880, 1_140_660, 1_311_750, 1_508_520, 1_734_800, 1_995_010, 2_294_270,
        2_638_410, 3_034_170, 3_489_290, 4_012_690, 4_614_590, 5_306_780, 6_102_800, 7_018_220, 8_070_950
    };

    /// <summary>
    /// Column B — 206 steps at ×1.10 across eight runs. The long opening run of 54 steps starts at twenty
    /// cents; the sheet's last run is cut short at eighteen steps, so the ladder ends mid-climb on $505.45.
    /// </summary>
    private static readonly double[] UsdSteps =
    {
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
    };

    /// <summary>
    /// Column C — 100 steps at ×1.20, starting on the same 17.900 ₫ as the main ladder and pulling away
    /// fast: by step ten it asks 92.360 ₫ where the main ladder asks 62.970 ₫. The last five runs are
    /// the same fifteen-step climb repeated.
    /// </summary>
    private static readonly double[] VndBonusSteps =
    {
        17_900, 21_480, 25_780, 30_930, 37_120, 44_540, 53_450, 64_140, 76_970,
        92_360, 110_830, 133_000, 159_600, 191_520, 229_820, 275_790, 330_940, 397_130,
        476_560, 571_870, 686_240, 823_490, 988_190, 1_185_830, 1_422_990,
        150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
        773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
        150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
        773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
        150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
        773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
        150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
        773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880,
        150_000, 180_000, 216_000, 259_200, 311_040, 373_250, 447_900, 537_480, 644_970,
        773_970, 928_760, 1_114_510, 1_337_420, 1_604_900, 1_925_880
    };

    /// <summary>
    /// Column D — 104 steps at ×1.20, opening at five cents. The third run is a short one of nine steps;
    /// the last four are the same fourteen-step climb from $7 repeated.
    /// </summary>
    private static readonly double[] UsdBonusSteps =
    {
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
    };
}
