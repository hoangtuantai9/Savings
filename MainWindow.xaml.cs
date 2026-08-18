using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;

namespace Savings;

/// <summary>Minimal ICommand so a keyboard shortcut can call a plain method.</summary>
public sealed class RelayCommand(Action run) : ICommand
{
    public event EventHandler? CanExecuteChanged { add { } remove { } }
    public bool CanExecute(object? parameter) => true;
    public void Execute(object? parameter) => run();
}

public partial class MainWindow : Window
{
    private readonly AppState _state = Store.Load();
    private readonly DispatcherTimer _clock = new() { Interval = TimeSpan.FromMilliseconds(200) };
    private readonly Tray _tray = new();

    /// <summary>True once Exit has been chosen from the tray — the only thing that really closes this window.</summary>
    private bool _quitting;

    /// <summary>Currency currently open in the focus view, or null while the menu is showing.</summary>
    private string? _open;

    /// <summary>Colour the focus view is currently wearing, so it is only repainted when the tier changes.</summary>
    private Brush? _openAccent;

    /// <summary>Size declared in XAML, kept because Windows may have resized the frame before we see it.</summary>
    private readonly Size _openingSize;

    public MainWindow()
    {
        InitializeComponent();
        _openingSize = new Size(Width, Height);

        VndTile.Setup("VND");
        UsdTile.Setup("USD");
        VndTile.Chosen += () => OpenTrack("VND");
        UsdTile.Chosen += () => OpenTrack("USD");
        VndTile.BonusChosen += () => OpenTrack("VND", onBonus: true);
        UsdTile.BonusChosen += () => OpenTrack("USD", onBonus: true);
        VndTile.OptionsRequested += () => EditOptions("VND");
        UsdTile.OptionsRequested += () => EditOptions("USD");

        // Nothing on screen for these: right-click a compartment for options, Ctrl+H for history,
        // Ctrl+R to start both ladders over.
        InputBindings.Add(new KeyBinding(new RelayCommand(ShowHistory), Key.H, ModifierKeys.Control));
        InputBindings.Add(new KeyBinding(new RelayCommand(ResetAll), Key.R, ModifierKeys.Control));

        _tray.ToggleRequested += Toggle;
        _tray.ShowRequested += Summon;
        _tray.ExitRequested += Quit;

        Detail.Confirmed += Confirm;
        Detail.Passed += Pass;
        Detail.Failed += Fail;
        Detail.BonusTaken += TakeBonus;
        Detail.BackRequested += CloseTrack;

        _clock.Tick += (_, _) => Render();
        _clock.Start();
        Render();

        VndTile.PlayEntry(90);
        UsdTile.PlayEntry(200);

        // Quitting on the very last step and coming back later still lands on the same wrap.
        MaybeRestart();
    }

    /// <summary>Colour of the milestone this track is standing on — red, then amber, then green.</summary>
    private Brush Accent(string currency)
    {
        var (plan, done, _, _) = Track(currency);
        return Palette.Accent(currency, plan, done);
    }

    private (PlanConfig Plan, int Done, DateTime? Unlock, bool Asking) Track(string currency) =>
        currency == "VND"
            ? (_state.Vnd, _state.VndDone, _state.VndUnlockAt, _state.VndAwaitingVerdict)
            : (_state.Usd, _state.UsdDone, _state.UsdUnlockAt, _state.UsdAwaitingVerdict);

    /// <summary>
    /// The bonus ladder standing behind a track — column C for VND, column D for USD. Deliberately a
    /// second lookup rather than more fields on <see cref="Track"/>: the two run on unrelated clocks and
    /// nothing that reads one has any business reading the other.
    /// </summary>
    private (PlanConfig Plan, int Done, DateTime? ReadyAt) BonusTrack(string currency) =>
        currency == "VND"
            ? (_state.VndBonus, _state.VndBonusDone, _state.VndBonusReadyAt)
            : (_state.UsdBonus, _state.UsdBonusDone, _state.UsdBonusReadyAt);

    /// <summary>
    /// Whether this track's ice stone is on offer. Two conditions and no third: the bonus ladder still
    /// has rungs left, and its silence is up. Nothing here consults the track's own lock — a bonus is
    /// expressly allowed to turn up in the middle of one.
    /// </summary>
    private bool BonusLive(string currency)
    {
        var (plan, done, readyAt) = BonusTrack(currency);
        return done < plan.Count && (readyAt is null || DateTime.Now >= readyAt);
    }

    /// <summary>How many steps out a promotion starts making itself felt.</summary>
    private const int Runway = 5;

    /// <summary>
    /// How wound up a track is: 0 while a colour change is still out of sight, climbing to 1 on the
    /// step whose tick will trigger it. The last band counts down to the end of the ladder instead,
    /// so finishing gets the same run-up a promotion does.
    /// </summary>
    private static double Heat(PlanConfig plan, int done)
    {
        var left = plan.ToNextTier(done);
        return left is > 0 and <= Runway ? (Runway - left + 1) / (double)Runway : 0;
    }

    private TileState Tile(string currency)
    {
        var (plan, done, unlock, asking) = Track(currency);
        return new TileState(done, plan.Count, TimeLeft(unlock), Expired(unlock), asking,
            BonusLive(currency), Heat(plan, done), Accent(currency));
    }

    /// <summary>Everything the focus view needs to draw one frame of a track.</summary>
    private TrackState View(string currency)
    {
        var (plan, done, unlock, asking) = Track(currency);
        var (bonus, bonusDone, _) = BonusTrack(currency);
        return new TrackState(
            done, plan.Count, plan.AmountAt(done),
            TimeLeft(unlock), TimeSpan.FromMinutes(plan.CooldownMinutes), asking,
            BonusLive(currency), bonus.AmountAt(bonusDone));
    }

    /// <summary>
    /// There was a lock and it has run its course. Undoing a step sets the unlock time back to null
    /// instead, so this stays false for a countdown that was called off rather than survived.
    /// </summary>
    private static bool Expired(DateTime? unlockAt) => unlockAt is not null && DateTime.Now >= unlockAt;

    private static TimeSpan? TimeLeft(DateTime? unlockAt)
    {
        if (unlockAt is null) return null;
        var left = unlockAt.Value - DateTime.Now;
        return left > TimeSpan.Zero ? left : null;
    }

    private void Render()
    {
        var vndAccent = Accent("VND");
        var usdAccent = Accent("USD");

        VndTile.Update(Tile("VND"));
        UsdTile.Update(Tile("USD"));
        Bloom(BloomVnd, vndAccent);
        Bloom(BloomUsd, usdAccent);

        if (_open is null) return;

        // Ticking the last step of a tier promotes the gem to the next colour while it is on screen.
        var accent = Accent(_open);
        if (!ReferenceEquals(accent, _openAccent))
        {
            _openAccent = accent;
            FocusGlow.Fill = accent;
            Detail.Bind(_open, accent);
        }

        Detail.Sync(View(_open));
    }

    /// <summary>
    /// Tints one of the background blooms with a track's tier colour, so the room itself warms from
    /// red to amber to green as the ladder is climbed. Cheap enough to call on every clock tick:
    /// it compares the colour first and only touches the brush when the tier actually moved.
    /// </summary>
    private static void Bloom(RadialGradientBrush fill, Brush accent)
    {
        var colour = Palette.Of(accent);
        var core = Color.FromArgb(0x4E, colour.R, colour.G, colour.B);
        if (fill.GradientStops[0].Color == core) return;

        fill.GradientStops[0].Color = core;
        fill.GradientStops[1].Color = Color.FromArgb(0, colour.R, colour.G, colour.B);
    }

    // ---- window chrome and the tray ----

    private const int GwlExStyle = -20;
    private const long WsExToolWindow = 0x80;
    private const long WsExAppWindow = 0x40000;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr GetWindowLongPtrW(IntPtr hwnd, int index);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtrW(IntPtr hwnd, int index, IntPtr value);

    /// <summary>
    /// Two things the window cannot state for itself. A tool window is skipped by the taskbar and by
    /// Alt+Tab — this app is reached from its tray icon and nowhere else. WPF's own ShowInTaskbar
    /// would do it by swapping the owner window, which recreates the handle and loses the geometry.
    ///
    /// And Windows hands a brand new window whatever frame it feels like — sometimes a snapped
    /// half-screen, sometimes the frame collapsed to MinWidth/MinHeight — so the declared size is
    /// planted here, centred on the work area, and every launch opens identically.
    /// </summary>
    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);

        KeepOffTheTaskbar();
        Snap.Attach(this);
        WindowState = WindowState.Normal;
        Width = _openingSize.Width;
        Height = _openingSize.Height;

        var area = SystemParameters.WorkArea;
        Left = area.Left + (area.Width - Width) / 2;
        Top = area.Top + (area.Height - Height) / 2;
    }

    /// <summary>
    /// Adds the tool-window flag and takes the app-window flag away. Both matter: WS_EX_APPWINDOW
    /// forces a window onto the taskbar and outranks WS_EX_TOOLWINDOW, and WPF sets it for us.
    /// Re-applied on every show, since WPF restores its own idea of the styles as the window comes up.
    /// </summary>
    private void KeepOffTheTaskbar()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;

        var style = GetWindowLongPtrW(hwnd, GwlExStyle).ToInt64();
        SetWindowLongPtrW(hwnd, GwlExStyle, new IntPtr((style | WsExToolWindow) & ~WsExAppWindow));
    }

    protected override void OnStateChanged(EventArgs e)
    {
        base.OnStateChanged(e);

        // Double-clicking the title bar still maximises, and a maximised borderless window would
        // otherwise spill its edges past the work area.
        Root.Margin = WindowState == WindowState.Maximized
            ? new Thickness(SystemParameters.WindowResizeBorderThickness.Left + 1)
            : default;
    }

    /// <summary>
    /// There is no close button, but Alt+F4 and the system menu still ask. Neither quits: the window
    /// only steps out of the way, and quitting stays with the tray.
    /// </summary>
    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        if (!_quitting)
        {
            e.Cancel = true;
            Dismiss();
            return;
        }

        _clock.Stop();
        _tray.Dispose();
        base.OnClosing(e);
    }

    /// <summary>Clicking the tray icon works both ways: put the window away, or fetch it back.</summary>
    private void Toggle()
    {
        if (IsVisible && WindowState != WindowState.Minimized) Dismiss();
        else Summon();
    }

    /// <summary>Off the screen entirely — the app keeps running, with only the tray icon to show for it.</summary>
    private void Dismiss()
    {
        Hide();
        _tray.AnnounceOnce();
    }

    /// <summary>Bring the window back from the tray, on top of whatever is in front of it.</summary>
    private void Summon()
    {
        Show();
        KeepOffTheTaskbar();
        if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;

        // Re-asserting Topmost pulls it over any window that has since claimed the front.
        Topmost = false;
        Topmost = true;
        Activate();
    }

    /// <summary>Someone launched Savings again. That launch is exiting; this is what it wanted.</summary>
    public void SummonFromAnotherLaunch() => Summon();

    private void Quit()
    {
        _quitting = true;
        Close();
        Application.Current.Shutdown();
    }

    // ---- menu <-> focus transitions ----

    /// <summary>
    /// Opens a currency's own screen. <paramref name="onBonus"/> is the bonus stone having been tapped
    /// on the menu rather than the gem: the two ladders are unrelated, so that tap lands on column C
    /// itself instead of on whatever the main track happens to be doing — a countdown included.
    /// </summary>
    private void OpenTrack(string currency, bool onBonus = false)
    {
        if (_open is not null) return;
        _open = currency;

        var accent = Accent(currency);
        _openAccent = accent;
        FocusGlow.Fill = accent;
        Detail.Bind(currency, accent);

        Detail.Enter(View(currency), onBonus);

        // The menu rushes past the camera while the coin's own screen zooms in behind it.
        FocusLayer.Visibility = Visibility.Visible;
        FocusLayer.BeginAnimation(OpacityProperty, Anim.D(0, 1, 320, Anim.Out));
        Anim.Scale(FocusScale, 0.84, 1, 420, Anim.Out);
        FocusGlow.BeginAnimation(OpacityProperty, Anim.Loop(0.06, 0.14, 3200, 500));

        MenuLayer.BeginAnimation(OpacityProperty, Anim.D(1, 0, 210, Anim.In));
        Anim.Scale(MenuScale, 1, 1.14, 320, Anim.In);
        Anim.After(220, () => MenuLayer.Visibility = Visibility.Collapsed);
    }

    private void CloseTrack()
    {
        if (_open is null) return;
        _open = null;
        _openAccent = null;

        MenuLayer.Visibility = Visibility.Visible;
        MenuLayer.BeginAnimation(OpacityProperty, Anim.D(0, 1, 320, Anim.Out));
        Anim.Scale(MenuScale, 1.12, 1, 420, Anim.Out);
        VndTile.PlayEntry(40);
        UsdTile.PlayEntry(120);

        FocusLayer.BeginAnimation(OpacityProperty, Anim.D(1, 0, 210, Anim.In));
        Anim.Scale(FocusScale, 1, 0.88, 300, Anim.In);
        Anim.After(230, () => FocusLayer.Visibility = Visibility.Collapsed);
    }

    // ---- actions ----

    /// <summary>
    /// Banks the step and starts the lock. Nothing is celebrated here any more: the amount is only
    /// saved on trust until the wait that follows has been ridden out and owned up to.
    /// </summary>
    private void Confirm()
    {
        if (_open is null) return;
        var currency = _open;
        var (plan, done, unlock, asking) = Track(currency);

        if (done >= plan.Count || asking || TimeLeft(unlock) is not null) return;

        _state.History.Add(new Entry
        {
            Currency = currency,
            Index = done,
            Amount = plan.AmountAt(done),
            At = DateTime.Now
        });

        // Lock only while there is still a next step to guard. No lock means no wait to survive, so
        // there is nothing to ask about afterwards either.
        var unlockAt = done + 1 < plan.Count && plan.CooldownMinutes > 0
            ? DateTime.Now.AddMinutes(plan.CooldownMinutes)
            : (DateTime?)null;

        if (currency == "VND")
        {
            _state.VndDone = done + 1;
            _state.VndUnlockAt = unlockAt;
            _state.VndAwaitingVerdict = unlockAt is not null;
        }
        else
        {
            _state.UsdDone = done + 1;
            _state.UsdUnlockAt = unlockAt;
            _state.UsdAwaitingVerdict = unlockAt is not null;
        }
        Persist();
    }

    /// <summary>
    /// Held out for the whole lock. The step stands, the question comes down, and the window gets the
    /// one celebration in the app — moved here from the tick, because this is the part that was hard.
    /// </summary>
    private void Pass()
    {
        if (_open is null) return;
        var currency = _open;
        var (plan, done, _, asking) = Track(currency);
        if (!asking) return;

        if (currency == "VND") _state.VndAwaitingVerdict = false;
        else _state.UsdAwaitingVerdict = false;
        Persist();

        // Done already counts the step being confirmed, so the band it crossed is measured behind it.
        var landed = Math.Clamp(done, 0, Math.Max(0, plan.Count - 1));
        var tierUp = plan.TierAt(landed) > plan.TierAt(Math.Max(0, done - 1));

        Cheer.Play(Accent(currency), tierUp);
    }

    /// <summary>
    /// Takes the step the ice stone was offering. No lock is started on the main ladder and no verdict
    /// is asked for — the bonus had no wait to survive. What it does start is its own silence, and that
    /// silence is the only reason the stone ever feels like a coincidence.
    /// </summary>
    private void TakeBonus()
    {
        if (_open is null || !BonusLive(_open)) return;
        var currency = _open;
        var (plan, done, _) = BonusTrack(currency);

        _state.History.Add(new Entry
        {
            Currency = currency,
            Index = done,
            Amount = plan.AmountAt(done),
            At = DateTime.Now,
            Bonus = true
        });

        if (currency == "VND")
        {
            _state.VndBonusDone = done + 1;
            _state.VndBonusReadyAt = DateTime.Now.AddMinutes(Plans.VndBonusLock);
        }
        else
        {
            _state.UsdBonusDone = done + 1;
            _state.UsdBonusReadyAt = DateTime.Now.AddMinutes(Plans.UsdBonusLock);
        }
        Persist();
    }

    /// <summary>Did not hold out. The step goes back on the ladder and its amount leaves the history.</summary>
    private void Fail()
    {
        if (_open is null) return;
        var (_, _, _, asking) = Track(_open);
        if (asking) Undo(_open);
    }

    private void Undo(string currency)
    {
        var (_, done, _, _) = Track(currency);
        if (done <= 0) return;

        // Skip bonus entries: they belong to a different ladder and rolling one of those back would
        // take an amount off the books that the main ladder never put there.
        var last = _state.History.FindLastIndex(e => e.Currency == currency && !e.Bonus);
        if (last >= 0) _state.History.RemoveAt(last);

        if (currency == "VND")
        {
            _state.VndDone = done - 1;
            _state.VndUnlockAt = null;
            _state.VndAwaitingVerdict = false;
        }
        else
        {
            _state.UsdDone = done - 1;
            _state.UsdUnlockAt = null;
            _state.UsdAwaitingVerdict = false;
        }
        Persist();
    }

    // ---- the journey coming round again ----

    /// <summary>
    /// How long the finished ladders are left standing before they roll over. Long enough for the crown
    /// and its burst to be seen and for the last celebration to clear the screen — the end has to land
    /// as an end before it is allowed to become a beginning.
    /// </summary>
    private const int LapPauseMs = 3200;

    /// <summary>The wrap has been scheduled and is waiting out <see cref="LapPauseMs"/>.</summary>
    private bool _lapping;

    /// <summary>
    /// Everything in the app is climbed out: both main ladders and both bonus ladders, with no verdict
    /// still owed. The bonuses count — they are real money on the same books, and leaving them out would
    /// wrap the journey while a stone was still turning up beside a gem that had started over.
    /// </summary>
    private bool AllDone() =>
        _state.VndDone >= _state.Vnd.Count &&
        _state.UsdDone >= _state.Usd.Count &&
        _state.VndBonusDone >= _state.VndBonus.Count &&
        _state.UsdBonusDone >= _state.UsdBonus.Count &&
        !_state.VndAwaitingVerdict && !_state.UsdAwaitingVerdict;

    private void MaybeRestart()
    {
        if (_lapping || !AllDone()) return;
        _lapping = true;
        Anim.After(LapPauseMs, Restart);
    }

    /// <summary>
    /// Sends every ladder back to its first milestone so the climb can be made again. The history is
    /// deliberately kept: the steps were saved, the money is real, and the totals should carry across a
    /// wrap — only the milestones start over. Ctrl+R is still the way to wipe the books themselves.
    /// </summary>
    private void Restart()
    {
        _lapping = false;
        if (!AllDone()) return;   // a step was undone while the pause was running

        // The colour of the ladder that has just been finished, caught before it is sent back to red.
        var accent = Accent("VND");

        _state.Journeys++;
        _state.VndDone = 0;
        _state.UsdDone = 0;
        _state.VndBonusDone = 0;
        _state.UsdBonusDone = 0;
        _state.VndUnlockAt = null;
        _state.UsdUnlockAt = null;
        _state.VndAwaitingVerdict = false;
        _state.UsdAwaitingVerdict = false;

        // Both stones are free again from the first step, the same as on a fresh install.
        _state.VndBonusReadyAt = null;
        _state.UsdBonusReadyAt = null;

        Persist();
        Cheer.Play(accent, true, "AGAIN");
    }

    private void EditOptions(string currency)
    {
        if (_open is not null) return;
        var (plan, done, _, _) = Track(currency);

        var dlg = new SettingsWindow(plan, currency, Accent(currency), done) { Owner = this };
        var saved = dlg.ShowDialog() == true;

        if (dlg.UndoRequested) { Undo(currency); return; }
        if (!saved) return;

        if (currency == "VND")
        {
            _state.Vnd = dlg.Result;
            _state.VndDone = Math.Min(_state.VndDone, _state.Vnd.Count);
        }
        else
        {
            _state.Usd = dlg.Result;
            _state.UsdDone = Math.Min(_state.UsdDone, _state.Usd.Count);
        }
        Persist();
    }

    private void Persist()
    {
        Render();

        // Checked here rather than on the clock: the ladders can only reach their end on the back of an
        // action, and this is the one place every action passes through.
        MaybeRestart();

        try
        {
            Store.Save(_state);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Could not save data:\n" + ex.Message,
                "Savings", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private void ShowHistory()
    {
        if (_open is not null) return;
        var ok = MessageBox.Show(this,
            "History shows every amount you have saved, plus the grand total.\n" +
            "Opening it means you will know the number — continue?",
            "Reveal amounts", MessageBoxButton.YesNo, MessageBoxImage.Question, MessageBoxResult.No);
        if (ok == MessageBoxResult.Yes)
            new HistoryWindow(_state) { Owner = this }.ShowDialog();
    }

    /// <summary>No button for this any more; Ctrl+R on the menu is the only way in.</summary>
    private void ResetAll()
    {
        if (_open is not null) return;

        var ok = MessageBox.Show(this,
            "Send both tracks back to step 1, clear any lock and delete all history?\nThis cannot be undone.",
            "Reset progress", MessageBoxButton.YesNo, MessageBoxImage.Warning, MessageBoxResult.No);
        if (ok != MessageBoxResult.Yes) return;

        _state.VndDone = 0;
        _state.UsdDone = 0;
        _state.VndUnlockAt = null;
        _state.UsdUnlockAt = null;
        _state.VndAwaitingVerdict = false;
        _state.UsdAwaitingVerdict = false;
        _state.VndBonusDone = 0;
        _state.UsdBonusDone = 0;
        _state.VndBonusReadyAt = null;
        _state.UsdBonusReadyAt = null;
        _state.History.Clear();
        _state.Journeys = 0;
        Persist();
    }
}
