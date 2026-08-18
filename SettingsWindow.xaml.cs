using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace Savings;

public partial class SettingsWindow : Window
{
    private readonly string _currency;
    private readonly PlanConfig _original;

    public PlanConfig Result { get; private set; } = new();

    /// <summary>True when the dialog was closed by asking to roll this track back one step.</summary>
    public bool UndoRequested { get; private set; }

    public SettingsWindow(PlanConfig plan, string currency, Brush accent, int done)
    {
        InitializeComponent();
        _currency = currency;
        _original = plan;
        UndoBtn.IsEnabled = done > 0;

        Title = $"{currency} options";
        HeadText.Text = $"{currency} options";
        HeadText.Foreground = accent;
        SaveBtn.Background = accent;

        var inv = CultureInfo.InvariantCulture;
        CooldownBox.Text = plan.CooldownMinutes.ToString(inv);
        StartBox.Text = plan.Start.ToString("0.####", inv);
        RatioBox.Text = plan.Ratio.ToString("0.####", inv);
        StepsBox.Text = plan.Steps.ToString(inv);
        RoundBox.Text = plan.RoundTo.ToString("0.####", inv);
        CustomBox.Text = string.Join(Environment.NewLine, plan.Custom.Select(v => v.ToString("0.####", inv)));

        Preview();
    }

    // ---- lenient number input: "50,000", "50.000", "57,50", "1 200.5" ----

    /// <summary>Parses an amount, accepting either separator as thousands or decimal mark.</summary>
    private static bool TryParseAmount(string? s, out double value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(s)) return false;

        var t = new string(s.Where(c => char.IsDigit(c) || c is '.' or ',' or '-').ToArray());
        if (t.Length == 0) return false;

        int dot = t.LastIndexOf('.'), comma = t.LastIndexOf(',');
        string norm;
        if (dot >= 0 && comma >= 0)
        {
            // Whichever mark comes last is the decimal point; the other groups thousands.
            var dec = dot > comma ? '.' : ',';
            var grp = dec == '.' ? "," : ".";
            norm = t.Replace(grp, "").Replace(dec, '.');
        }
        else if (dot >= 0 || comma >= 0)
        {
            var sep = dot >= 0 ? '.' : ',';
            var parts = t.Split(sep);
            norm = parts.Length > 2 || parts[^1].Length == 3
                ? t.Replace(sep.ToString(), "")   // 1,234,567 or 50.000 -> thousands
                : t.Replace(sep, '.');            // 57,50 -> decimal
        }
        else norm = t;

        return double.TryParse(norm, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }

    /// <summary>Multiplier: both '.' and ',' mean a decimal point (1,15 = 1.15).</summary>
    private static bool TryParseRatio(string? s, out double value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(s)) return false;
        var t = new string(s.Where(c => char.IsDigit(c) || c is '.' or ',').ToArray()).Replace(',', '.');
        return double.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }

    private static bool TryParseInt(string? s, out int value) =>
        int.TryParse(new string((s ?? "").Where(char.IsDigit).ToArray()),
            NumberStyles.Integer, CultureInfo.InvariantCulture, out value);

    private static List<double> ParseList(string? text)
    {
        var result = new List<double>();
        if (string.IsNullOrWhiteSpace(text)) return result;
        foreach (var token in text.Split(new[] { '\r', '\n', ';', '\t' }, StringSplitOptions.RemoveEmptyEntries))
            if (TryParseAmount(token, out var v) && v > 0)
                result.Add(v);
        return result;
    }

    // ---- reading the form ----

    private bool Collect(out PlanConfig plan, out string error)
    {
        plan = new PlanConfig { Custom = ParseList(CustomBox.Text) };
        error = "";

        // The colour bands describe the milestones they were written for. Keep them while the list is
        // untouched; rewrite the ladder and the track falls back to its single currency colour.
        if (plan.Custom.SequenceEqual(_original.Custom)) plan.TierEnds = new List<int>(_original.TierEnds);

        if (!TryParseInt(CooldownBox.Text, out var cool))
        { error = "Lock duration must be a whole number of minutes (0 or more)."; return false; }
        if (!TryParseAmount(StartBox.Text, out var start) || start <= 0)
        { error = "First amount must be greater than 0."; return false; }
        if (!TryParseRatio(RatioBox.Text, out var ratio) || ratio <= 0)
        { error = "Multiplier must be greater than 0."; return false; }
        if (!TryParseInt(StepsBox.Text, out var steps) || steps < 1)
        { error = "Total steps must be at least 1."; return false; }
        if (!TryParseAmount(RoundBox.Text, out var round) || round < 0)
        { error = "Rounding value is not valid."; return false; }

        plan.CooldownMinutes = cool;
        plan.Start = start;
        plan.Ratio = ratio;
        plan.Steps = steps;
        plan.RoundTo = round;
        return true;
    }

    private void Preview()
    {
        if (!Collect(out var plan, out var error))
        {
            WarnIcon.Visibility = Visibility.Visible;
            PreviewText.Text = error;
            return;
        }

        WarnIcon.Visibility = Visibility.Collapsed;

        var head = string.Join("  →  ", Enumerable.Range(0, Math.Min(3, plan.Count))
                                                  .Select(i => Money.Format(_currency, plan.AmountAt(i))));
        var source = plan.UsesCustom ? "custom list" : "multiplier formula";
        var colour = plan.TierEnds.Count > 0
            ? $"{plan.TierEnds.Count + 1} colour tiers"
            : "one colour";
        PreviewText.Text =
            $"{plan.Count} steps · {source} · {colour} · {LockLabel(plan.CooldownMinutes)}\n{head}  →  …";
    }

    private static string LockLabel(int minutes) => minutes switch
    {
        0 => "no lock",
        _ when minutes % 10080 == 0 => $"{minutes / 10080} week lock",
        _ when minutes % 1440 == 0 => $"{minutes / 1440} day lock",
        _ when minutes % 60 == 0 => $"{minutes / 60} hour lock",
        _ => $"{minutes} min lock"
    };

    private void Preset_Click(object sender, RoutedEventArgs e)
    {
        CooldownBox.Text = (string)((Button)sender).Tag;
        Preview();
    }

    private void Preview_Click(object sender, RoutedEventArgs e) => Preview();

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        if (!Collect(out var plan, out var error))
        {
            MessageBox.Show(this, error, "Cannot save", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }
        Result = plan;
        DialogResult = true;
    }

    private void Cancel_Click(object sender, RoutedEventArgs e) => DialogResult = false;

    private void Undo_Click(object sender, RoutedEventArgs e)
    {
        var ok = MessageBox.Show(this,
            $"Roll {_currency} back one step and clear its lock?",
            "Undo last step", MessageBoxButton.YesNo, MessageBoxImage.Question, MessageBoxResult.No);
        if (ok != MessageBoxResult.Yes) return;

        UndoRequested = true;
        DialogResult = false;
    }
}
