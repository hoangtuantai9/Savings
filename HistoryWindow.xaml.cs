using System.Globalization;
using System.IO;
using System.Text;
using System.Windows;

namespace Savings;

public partial class HistoryWindow : Window
{
    private readonly AppState _state;

    public sealed record Row(string Label, string When, string Amount);

    public HistoryWindow(AppState state)
    {
        InitializeComponent();
        _state = state;

        VndTotal.Text = Money.Vnd(state.History.Where(e => e.Currency == "VND").Sum(e => e.Amount));
        UsdTotal.Text = Money.Usd(state.History.Where(e => e.Currency == "USD").Sum(e => e.Amount));

        Rows.ItemsSource = state.History
            .OrderByDescending(e => e.At)
            .Select(e => new Row(
                $"{e.Currency} · {(e.Bonus ? "bonus" : "step")} {e.Index + 1}",
                e.At.ToString("dd MMM yyyy  HH:mm", CultureInfo.InvariantCulture),
                Money.Format(e.Currency, e.Amount)))
            .ToList();
    }

    private void Export_Click(object sender, RoutedEventArgs e)
    {
        var dlg = new Microsoft.Win32.SaveFileDialog
        {
            FileName = "savings.csv",
            Filter = "CSV (*.csv)|*.csv"
        };
        if (dlg.ShowDialog(this) != true) return;

        // Ladder, not just step: the bonus keeps its own numbering, so a bare step number would read as
        // a duplicate of a main-ladder row it has nothing to do with.
        var sb = new StringBuilder("Timestamp,Currency,Ladder,Step,Amount\r\n");
        foreach (var entry in _state.History.OrderBy(x => x.At))
            sb.Append(entry.At.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)).Append(',')
              .Append(entry.Currency).Append(',')
              .Append(entry.Bonus ? "bonus" : "main").Append(',')
              .Append(entry.Index + 1).Append(',')
              .Append(entry.Amount.ToString("0.####", CultureInfo.InvariantCulture)).Append("\r\n");

        try
        {
            File.WriteAllText(dlg.FileName, sb.ToString(), new UTF8Encoding(true));
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Could not export the file:\n" + ex.Message,
                "Savings", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}
