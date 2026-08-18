using System.Drawing;
using WinForms = System.Windows.Forms;

namespace Savings;

/// <summary>
/// The app's seat in the notification area. The window carries no close button, so this icon is the
/// only way out: right-click it and choose Exit.
/// </summary>
public sealed class Tray : IDisposable
{
    private readonly WinForms.NotifyIcon _icon;
    private bool _toldThemWhereItWent;

    /// <summary>Left-click: put the window away if it is up, bring it back if it is not.</summary>
    public event Action? ToggleRequested;

    public event Action? ShowRequested;
    public event Action? ExitRequested;

    public Tray()
    {
        var menu = new WinForms.ContextMenuStrip
        {
            Renderer = new WinForms.ToolStripProfessionalRenderer(new DarkMenu()),
            BackColor = DarkMenu.Card,
            ForeColor = DarkMenu.Text,
            ShowImageMargin = false
        };
        menu.Items.Add("Show Savings", null, (_, _) => ShowRequested?.Invoke());
        menu.Items.Add(new WinForms.ToolStripSeparator());
        menu.Items.Add("Exit", null, (_, _) => ExitRequested?.Invoke());

        _icon = new WinForms.NotifyIcon
        {
            Icon = LoadIcon(),
            Text = "Savings",
            Visible = true,
            ContextMenuStrip = menu
        };

        // Left click toggles the window; right click is the menu, handled by WinForms.
        _icon.MouseUp += (_, e) =>
        {
            if (e.Button == WinForms.MouseButtons.Left) ToggleRequested?.Invoke();
        };
    }

    /// <summary>Said once per session, the first time a close request only puts the window away.</summary>
    public void AnnounceOnce()
    {
        if (_toldThemWhereItWent) return;
        _toldThemWhereItWent = true;
        _icon.ShowBalloonTip(4000, "Savings is still running",
            "Click this icon to bring it back. Right-click to exit.", WinForms.ToolTipIcon.None);
    }

    /// <summary>
    /// The .ico frames are PNG-compressed, which GDI+ cannot turn into a Bitmap — but asking for an
    /// icon handle at the tray's own size goes through Win32 instead and reads them fine.
    /// </summary>
    private static Icon LoadIcon()
    {
        try
        {
            var stream = System.Windows.Application
                .GetResourceStream(new Uri("pack://application:,,,/Savings.ico"))?.Stream;
            if (stream is not null) return new Icon(stream, WinForms.SystemInformation.SmallIconSize);
        }
        catch
        {
            // Fall through: an app with no tray icon would have no way to quit.
        }
        return SystemIcons.Application;
    }

    public void Dispose()
    {
        _icon.Visible = false;
        _icon.ContextMenuStrip?.Dispose();
        _icon.Dispose();
    }

    /// <summary>Paints the tray menu in the app's own palette instead of the system light grey.</summary>
    private sealed class DarkMenu : WinForms.ProfessionalColorTable
    {
        public static readonly Color Card = Color.FromArgb(0x17, 0x1B, 0x22);
        public static readonly Color Text = Color.FromArgb(0xE7, 0xED, 0xF5);
        private static readonly Color Line = Color.FromArgb(0x2A, 0x31, 0x3D);
        private static readonly Color Hover = Color.FromArgb(0x1E, 0x24, 0x2E);

        public override Color ToolStripDropDownBackground => Card;
        public override Color MenuBorder => Line;
        public override Color MenuItemBorder => Hover;
        public override Color MenuItemSelected => Hover;
        public override Color MenuItemSelectedGradientBegin => Hover;
        public override Color MenuItemSelectedGradientEnd => Hover;
        public override Color ImageMarginGradientBegin => Card;
        public override Color ImageMarginGradientMiddle => Card;
        public override Color ImageMarginGradientEnd => Card;
        public override Color SeparatorDark => Line;
        public override Color SeparatorLight => Line;
    }
}
