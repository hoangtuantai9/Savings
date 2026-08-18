using System.Globalization;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Savings;

/// <summary>Schedule for one currency: geometric progression, or an explicit list.</summary>
public sealed class PlanConfig
{
    public double Start { get; set; } = 50_000;
    public double Ratio { get; set; } = 1.15;
    public int Steps { get; set; } = 52;
    public double RoundTo { get; set; } = 10;

    /// <summary>Minutes the coin stays locked after a step is ticked. 0 = unlock immediately.</summary>
    public int CooldownMinutes { get; set; } = 20;

    public List<double> Custom { get; set; } = new();

    /// <summary>
    /// Step counts at which each colour tier ends, ascending. [18, 57] paints steps 1-18 with the
    /// first tier colour, 19-57 with the second and everything after with the third.
    /// Empty means the track keeps one colour for its whole length.
    /// </summary>
    public List<int> TierEnds { get; set; } = new();

    [JsonIgnore] public bool UsesCustom => Custom.Count > 0;
    [JsonIgnore] public int Count => UsesCustom ? Custom.Count : Math.Max(1, Steps);

    /// <summary>Zero-based colour tier the given step falls in.</summary>
    public int TierAt(int index)
    {
        var tier = 0;
        foreach (var end in TierEnds)
        {
            if (index < end) break;
            tier++;
        }
        return tier;
    }

    /// <summary>
    /// Steps still to clear before the colour changes. Past the last band there is no next colour, so
    /// the end of the ladder stands in for one — the run-up to finishing should feel like the run-up to
    /// a promotion, not like nothing at all.
    /// </summary>
    public int ToNextTier(int done)
    {
        foreach (var end in TierEnds)
            if (done < end) return end - done;
        return Math.Max(0, Count - done);
    }

    public double AmountAt(int index)
    {
        if (index < 0) index = 0;
        if (UsesCustom) return Custom[Math.Min(index, Custom.Count - 1)];
        var raw = Start * Math.Pow(Ratio, index);
        return RoundTo > 0 ? Math.Round(raw / RoundTo, MidpointRounding.AwayFromZero) * RoundTo : raw;
    }
}

public sealed class Entry
{
    public string Currency { get; set; } = "";
    public int Index { get; set; }
    public double Amount { get; set; }
    public DateTime At { get; set; }

    /// <summary>
    /// True for a step taken off the bonus ladder. Still VND, still real money, still counted in the
    /// totals — but its index belongs to a different ladder, so anything walking back through the
    /// history has to be able to tell the two apart.
    /// </summary>
    public bool Bonus { get; set; }
}

public sealed class AppState
{
    /// <summary>Ladder version this file was written against. 0 for anything predating the milestone tables.</summary>
    public int Version { get; set; }

    public PlanConfig Vnd { get; set; } = Plans.Vnd();
    public PlanConfig Usd { get; set; } = Plans.Usd();

    /// <summary>
    /// Columns C and D: one steeper ladder per currency, each surfacing between its own long silences.
    /// The VND pair predates the USD one and keeps its original three names on disk, so a file written
    /// before column D existed still loads its bonus progress instead of quietly starting over.
    /// </summary>
    [JsonPropertyName("Bonus")]
    public PlanConfig VndBonus { get; set; } = Plans.VndBonus();

    public PlanConfig UsdBonus { get; set; } = Plans.UsdBonus();

    /// <summary>
    /// How many times every ladder in the app has been climbed to the top and sent back to step 1.
    /// Nothing on screen reads this — the journey starting over is the point, not the tally — but the
    /// history is kept across a wrap, so this is what says the money in it came from more than one pass.
    /// </summary>
    public int Journeys { get; set; }

    public int VndDone { get; set; }
    public int UsdDone { get; set; }

    [JsonPropertyName("BonusDone")]
    public int VndBonusDone { get; set; }

    public int UsdBonusDone { get; set; }

    /// <summary>
    /// When each bonus is allowed back, or null for "right now". Set an hour or so out the moment a
    /// bonus step is taken. Never shown: the app draws the stone or it draws nothing, and the gap
    /// between those two is the only thing that gives the clock away.
    /// </summary>
    [JsonPropertyName("BonusReadyAt")]
    public DateTime? VndBonusReadyAt { get; set; }

    public DateTime? UsdBonusReadyAt { get; set; }

    /// <summary>When the lock expires. Persisted so closing the app cannot skip the wait.</summary>
    public DateTime? VndUnlockAt { get; set; }
    public DateTime? UsdUnlockAt { get; set; }

    /// <summary>
    /// Raised when a step is banked and lowered only when the wait that followed it has been judged.
    /// Persisted for the same reason as the unlock time: quitting the app must not be a way to dodge
    /// the question. A track holding this flag is frozen — no next amount until it is answered.
    /// </summary>
    public bool VndAwaitingVerdict { get; set; }
    public bool UsdAwaitingVerdict { get; set; }

    public List<Entry> History { get; set; } = new();
}

public static class Store
{
    private static readonly string Dir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Savings");

    private static readonly string FilePath = Path.Combine(Dir, "data.json");

    private static readonly JsonSerializerOptions Opts = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public static AppState Load()
    {
        try
        {
            if (File.Exists(FilePath))
                return Migrate(JsonSerializer.Deserialize<AppState>(File.ReadAllText(FilePath), Opts) ?? new AppState());
        }
        catch
        {
            // Corrupt file: keep a copy and start fresh instead of crashing on launch.
            try { File.Move(FilePath, FilePath + ".bak", overwrite: true); } catch { }
        }
        return Migrate(new AppState());
    }

    /// <summary>
    /// Brings an older save onto the current ladders. The lock the user chose is kept; the amounts
    /// and their colour tiers come from <see cref="Plans"/>, and progress is clamped to the new length.
    /// </summary>
    private static AppState Migrate(AppState state)
    {
        if (state.Version >= Plans.Version) return state;

        state.Vnd = Plans.Vnd(state.Vnd.CooldownMinutes);
        state.Usd = Plans.Usd(state.Usd.CooldownMinutes);
        state.VndBonus = Plans.VndBonus();
        state.UsdBonus = Plans.UsdBonus();
        state.VndDone = Math.Clamp(state.VndDone, 0, state.Vnd.Count);
        state.UsdDone = Math.Clamp(state.UsdDone, 0, state.Usd.Count);
        state.VndBonusDone = Math.Clamp(state.VndBonusDone, 0, state.VndBonus.Count);
        state.UsdBonusDone = Math.Clamp(state.UsdBonusDone, 0, state.UsdBonus.Count);
        state.Version = Plans.Version;
        return state;
    }

    public static void Save(AppState state)
    {
        Directory.CreateDirectory(Dir);
        var tmp = FilePath + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(state, Opts));
        File.Move(tmp, FilePath, overwrite: true);
    }
}

public static class Money
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    public static string Vnd(double v) => v.ToString(v % 1 == 0 ? "#,##0" : "#,##0.##", Inv) + " ₫";

    public static string Usd(double v) => "$" + v.ToString("#,##0.00", Inv);

    public static string Format(string currency, double v) => currency == "VND" ? Vnd(v) : Usd(v);
}
