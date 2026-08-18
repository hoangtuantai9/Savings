using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;

namespace Savings;

public enum Stage
{
    /// <summary>Diamond closed — currency name only.</summary>
    Sealed,
    /// <summary>Diamond open — this step's amount is on screen.</summary>
    Revealed,
    /// <summary>Just ticked; playing the burst.</summary>
    Celebrating,
    /// <summary>Counting down to the next unlock.</summary>
    Waiting,
    /// <summary>The wait is over and has to be answered before the track moves again.</summary>
    Verdict,
    /// <summary>The bonus stone has been opened; this track's bonus amount is on screen.</summary>
    Bonus,
    /// <summary>Answered no; the step just banked is being taken back.</summary>
    Fell,
    /// <summary>Every step in the plan is saved.</summary>
    Finished
}

/// <summary>
/// One frame of a track, as the focus view needs to draw it. Passed whole rather than as eight loose
/// arguments, which is what it had grown into.
/// </summary>
public readonly record struct TrackState(
    int Done,
    int Total,
    double Amount,
    TimeSpan? Left,
    TimeSpan Cooldown,
    bool Asking,
    bool BonusLive,
    double BonusAmount);

public partial class FocusView : UserControl
{
    private const double Cx = 260, Cy = 235;
    private const double RimW = 246, RimH = 221, RimThickness = 11;
    private const double FaceW = 214, FaceH = 189;
    private const int CheerMs = 1800;

    /// <summary>How long the face is held while the overlay plays over it, and while the step is taken back.</summary>
    private const int PassMs = 2100, FellMs = 1500;

    /// <summary>The ice stone, centred in its own 120x110 box out beyond the rim's top-right edge.</summary>
    private const double SatCx = 60, SatCy = 55, SatW = 46, SatH = 42;

    /// <summary>How long the ice flash owns the face after a bonus step is taken.</summary>
    private const int IceMs = 1100;

    /// <summary>Drives the amount ticking up from zero when the diamond opens.</summary>
    public static readonly DependencyProperty CountProperty =
        DependencyProperty.Register(nameof(Count), typeof(double), typeof(FocusView),
            new PropertyMetadata(0.0, (d, e) => ((FocusView)d).PaintCount((double)e.NewValue)));

    public double Count
    {
        get => (double)GetValue(CountProperty);
        set => SetValue(CountProperty, value);
    }

    private string _currency = "VND";
    private Brush _accent = Brushes.White;
    private Stage _stage = Stage.Sealed;
    private bool _revealed;
    private bool _holding;   // the celebration owns the face until it finishes
    private bool _flipping;

    private readonly Path[] _rings;

    private TrackState _track;
    private double _shown = double.NaN;

    /// <summary>True while the ice stone's own face is the one being shown.</summary>
    private bool _bonusOpen;

    /// <summary>Last drawn state of the ice stone, so it is only animated when it really comes or goes.</summary>
    private bool? _satLive;

    public event Action? Confirmed;
    public event Action? Passed;
    public event Action? Failed;
    public event Action? BonusTaken;
    public event Action? BackRequested;

    public FocusView()
    {
        InitializeComponent();
        _rings = new[] { Burst1, Burst2, Burst3, Burst4, Burst5 };

        var rim = Gem.Outline(Cx, Cy, RimW, RimH);
        Track.Data = rim;
        PlanArc.Data = rim;
        CoolArc.Data = rim;

        var face = Gem.Outline(Cx, Cy, FaceW, FaceH);
        FaceFill.Data = face;
        Flash.Data = face;
        IceFlash.Data = face;
        Wave.Data = face;
        foreach (var ring in _rings) ring.Data = face;

        // The satellite is drawn in its own 120x110 box, so it is centred on that box and not on the gem.
        Gem.Ice(SatStone, SatFacet, SatHalo, SatBeat, SatCx, SatCy, SatW, SatH);

        // Clipping the face also clips its hit area, so only the diamond is clickable.
        // A hair larger than the fill so the 1px outline survives.
        Face.Clip = Gem.Outline(Cx, Cy, FaceW + 2, FaceH + 2);
    }

    /// <summary>
    /// Paint the gem in this currency's colour. Called again whenever the track crosses into a new
    /// milestone tier, so the change lands live — including mid-celebration, right as it is earned.
    /// </summary>
    public void Bind(string currency, Brush accent)
    {
        _currency = currency;
        _accent = accent;

        SealCurrency.Text = currency;
        AmountText.Foreground = accent;
        CountdownText.Foreground = accent;
        CheerMark.Stroke = accent;
        DoneMark.Fill = accent;
        PlanArc.Stroke = accent;
        CoolArc.Stroke = accent;
        TickBtn.Background = accent;
        Flash.Fill = accent;
        Wave.Fill = accent;
        HeadDot.Fill = accent;
        HeadDot.Effect = Palette.Glow(Palette.Of(accent), 22, 0.95);
        foreach (var ring in _rings) ring.Stroke = accent;
        ApplyStroke(_stage);
    }

    /// <summary>
    /// Called once when this currency is opened from the menu. <paramref name="onBonus"/> arrives from
    /// the bonus stone on the card having been the thing tapped, and is honoured for exactly as long as
    /// the offer stands: <see cref="Desired"/> drops back to the main track if the bonus is gone.
    /// </summary>
    public void Enter(TrackState track, bool onBonus = false)
    {
        _revealed = false;
        _bonusOpen = onBonus;
        _holding = false;
        _flipping = false;
        _shown = double.NaN;
        FlipScale.ScaleX = 1;

        Feed(track);
        _stage = Desired();
        ApplyFace(_stage);

        Tilt.BeginAnimation(RotateTransform.AngleProperty, Anim.D(-7, 0, 620, Anim.Back));
        Chrome.BeginAnimation(OpacityProperty, Anim.D(0, 1, 340, Anim.Out, 200));
        ChromeRise.BeginAnimation(TranslateTransform.YProperty, Anim.D(22, 0, 420, Anim.Out, 200));

        // Choosing a currency already means "show me the number" — open it once it lands.
        if (_stage == Stage.Sealed)
            Anim.After(520, () =>
            {
                if (_stage != Stage.Sealed || _holding) return;
                _revealed = true;
                SwitchTo(Stage.Revealed);
            });
    }

    /// <summary>Called on every clock tick while this view is on screen.</summary>
    public void Sync(TrackState track)
    {
        Feed(track);
        if (_holding || _flipping) return;

        var target = Desired();
        if (target == _stage) return;

        // The clock running out is still the moment worth announcing, whether it lands on the question
        // or straight back on the closed gem.
        var unlocking = _stage == Stage.Waiting && target is Stage.Verdict or Stage.Sealed;
        SwitchTo(target);
        if (unlocking)
        {
            Anim.Bounce(Pulse, 1.09);
            Flash.BeginAnimation(OpacityProperty, Anim.D(0.16, 0, 620, Anim.Out));
        }
    }

    /// <summary>
    /// Opening the ice stone is a deliberate tap, so it outranks everything — including the lock, which
    /// the bonus is expressly allowed to appear through. Below that, the question outranks the rest: a
    /// track holding an unanswered verdict cannot show an amount, so it has nothing else to be doing.
    /// </summary>
    private Stage Desired() =>
        _bonusOpen && _track.BonusLive ? Stage.Bonus
        : _track.Done >= _track.Total ? Stage.Finished
        : _track.Left is not null ? Stage.Waiting
        : _track.Asking ? Stage.Verdict
        : _revealed ? Stage.Revealed
        : Stage.Sealed;

    private void Feed(TrackState track)
    {
        _track = track;

        CountdownText.Text = track.Left is null ? "00:00" : Fmt.Clock(track.Left.Value);
        BonusText.Text = Money.Format(_currency, track.BonusAmount);

        var planned = track.Total > 0 ? (double)track.Done / track.Total : 0;
        PlanArc.StrokeDashArray = Gem.Dash(RimW, RimH, RimThickness, planned);
        PlanArc.Opacity = planned > 0 ? 0.32 : 0;

        var locked = track.Left is not null && track.Cooldown > TimeSpan.Zero;
        var fraction = locked ? Math.Clamp(track.Left!.Value.TotalSeconds / track.Cooldown.TotalSeconds, 0, 1) : 0;
        CoolArc.StrokeDashArray = Gem.Dash(RimW, RimH, RimThickness, fraction);
        CoolArc.Opacity = locked ? 1 : 0;

        if (locked)
        {
            var head = Gem.PointAt(Cx, Cy, RimW, RimH, fraction);
            HeadPos.X = head.X - HeadDot.Width / 2;
            HeadPos.Y = head.Y - HeadDot.Height / 2;
            HeadDot.Opacity = 1;
        }
        else HeadDot.Opacity = 0;

        ShowSat(track.BonusLive && _stage is Stage.Sealed or Stage.Revealed or Stage.Waiting or Stage.Finished);

        // The amount only ever appears on the revealed face, and only via the count-up.
        if (_stage == Stage.Revealed && Math.Abs(track.Amount - _shown) > 1e-9) CountUp();
    }

    /// <summary>
    /// The stone is either there or it is not — there is no dimmed placeholder for it to cool down in,
    /// because an empty socket would tell you exactly as much as a countdown would.
    /// </summary>
    private void ShowSat(bool live)
    {
        if (_satLive == live) return;
        _satLive = live;

        Anim.Pop(Sat, SatScale, live);
    }

    // Rounded on the way in for VND: the count-up would otherwise spin fractional đồng.
    private void PaintCount(double value) =>
        AmountText.Text = Money.Format(_currency, _currency == "VND" ? Math.Round(value) : value);

    /// <summary>Spin the number up from zero — makes the reveal land instead of just appearing.</summary>
    private void CountUp()
    {
        _shown = _track.Amount;
        BeginAnimation(CountProperty, Anim.D(0, _track.Amount, 820, Anim.Out));
    }

    // ---- face swapping ----

    private void SwitchTo(Stage target)
    {
        _stage = target;
        _flipping = true;
        Anim.Flip(FlipScale, () => ApplyFace(target), () => _flipping = false);
    }

    private void ApplyFace(Stage s)
    {
        SealedPanel.Visibility = s == Stage.Sealed ? Visibility.Visible : Visibility.Collapsed;
        RevealPanel.Visibility = s == Stage.Revealed ? Visibility.Visible : Visibility.Collapsed;
        CheerPanel.Visibility = s == Stage.Celebrating ? Visibility.Visible : Visibility.Collapsed;
        WaitPanel.Visibility = s == Stage.Waiting ? Visibility.Visible : Visibility.Collapsed;
        VerdictPanel.Visibility = s == Stage.Verdict ? Visibility.Visible : Visibility.Collapsed;
        BonusPanel.Visibility = s == Stage.Bonus ? Visibility.Visible : Visibility.Collapsed;
        FellPanel.Visibility = s == Stage.Fell ? Visibility.Visible : Visibility.Collapsed;
        DonePanel.Visibility = s == Stage.Finished ? Visibility.Visible : Visibility.Collapsed;

        ApplyStroke(s);
        ShowSat(_track.BonusLive && s is Stage.Sealed or Stage.Revealed or Stage.Waiting or Stage.Finished);

        if (s == Stage.Revealed) CountUp();
        if (s == Stage.Celebrating) Anim.Scale(CheerScale, 0.35, 1.0, 620, Anim.Back);
        if (s == Stage.Verdict) Anim.Scale(AskScale, 0.4, 1.0, 620, Anim.Back);
        if (s == Stage.Fell) PlayFall();
        if (s == Stage.Finished) PlayBurst();
    }

    /// <summary>
    /// The face is outlined in the accent only once it is showing something worth framing — except on
    /// the bonus face, which wears ice, because nothing about a bonus belongs to the tier colours.
    /// Both currencies' stones share that one ice: the colour means "not a rung on the main climb",
    /// and which ladder it came off is already written on the screen it is sitting in.
    /// </summary>
    private void ApplyStroke(Stage s) =>
        FaceFill.Stroke = s switch
        {
            Stage.Bonus => (Brush)FindResource("Ice"),
            Stage.Revealed or Stage.Celebrating or Stage.Verdict or Stage.Finished => _accent,
            _ => (Brush)FindResource("Edge")
        };

    /// <summary>Shockwave, five diamonds flying outward and an accent flash across the face.</summary>
    private void PlayBurst()
    {
        Wave.BeginAnimation(OpacityProperty, Anim.D(0.5, 0, 800, Anim.Out));
        Anim.Scale(WaveScale, 0.6, 2.3, 800, Anim.Out);

        Anim.Ring(Burst1, B1, 0.92, 2.30, 950);
        Anim.Ring(Burst2, B2, 0.92, 2.05, 950, 110);
        Anim.Ring(Burst3, B3, 0.92, 1.80, 950, 220);
        Anim.Ring(Burst4, B4, 0.92, 1.58, 950, 330);
        Anim.Ring(Burst5, B5, 0.92, 1.38, 950, 440);

        Flash.BeginAnimation(OpacityProperty, Anim.D(0.26, 0, 760, Anim.Out));
        Anim.Bounce(Pulse, 1.06, 700);
    }

    /// <summary>
    /// What the bonus gets instead of the UNLOCKED overlay. Short and cold on purpose: the overlay is
    /// the reward for surviving a lock, and the bonus never had one to survive.
    /// </summary>
    private void PlayIce()
    {
        IceFlash.BeginAnimation(OpacityProperty, Anim.D(0.34, 0, 900, Anim.Out));
        Anim.Bounce(Pulse, 1.05, 620);
    }

    /// <summary>
    /// The burst played backwards. The shockwave falls inward instead of outward and the gem sags on
    /// its spring rather than jumping — a step is being taken off the ladder, and it should look like it.
    /// </summary>
    private void PlayFall()
    {
        Wave.BeginAnimation(OpacityProperty, Anim.D(0.34, 0, 760, Anim.Out));
        Anim.Scale(WaveScale, 1.8, 0.5, 760, Anim.Out);
        Anim.Scale(FellScale, 1.3, 1.0, 620, Anim.Back);
        Anim.Bounce(Pulse, 0.94, 700);
    }

    // ---- interaction ----

    private void Face_Click(object sender, MouseButtonEventArgs e)
    {
        if (_flipping || _holding) return;
        if (_stage == Stage.Sealed) { _revealed = true; SwitchTo(Stage.Revealed); }
        else if (_stage == Stage.Revealed) { _revealed = false; SwitchTo(Stage.Sealed); }
        else if (_stage == Stage.Bonus) { _bonusOpen = false; SwitchTo(Desired()); }
    }

    /// <summary>Tapping the ice stone swaps the face for the bonus amount. Tapping the face goes back.</summary>
    private void Sat_Click(object sender, MouseButtonEventArgs e)
    {
        e.Handled = true;
        if (_flipping || _holding || !_track.BonusLive) return;

        _bonusOpen = true;
        SwitchTo(Stage.Bonus);
    }

    private void Bonus_Click(object sender, RoutedEventArgs e)
    {
        if (_holding) return;

        _bonusOpen = false;
        _holding = true;
        CheerMark.Stroke = (Brush)FindResource("Ice");   // the same tick, in the bonus's own colour
        SwitchTo(Stage.Celebrating);
        PlayIce();

        BonusTaken?.Invoke();
        Hold(IceMs);
    }

    private void Tick_Click(object sender, RoutedEventArgs e)
    {
        if (_holding) return;

        _revealed = false;
        _holding = true;              // set before Confirmed so Sync cannot cut the celebration short
        CheerMark.Stroke = _accent;   // the bonus borrows this same tick, so claim it back here
        SwitchTo(Stage.Celebrating);
        PlayBurst();

        Confirmed?.Invoke();
        Hold(CheerMs);
    }

    /// <summary>
    /// Held it. The window-wide overlay owns the screen for the next couple of seconds, so the face
    /// underneath is left exactly where it is and only settles once the overlay has cleared.
    /// </summary>
    private void Yes_Click(object sender, RoutedEventArgs e)
    {
        if (_holding) return;
        _holding = true;

        Passed?.Invoke();
        Hold(PassMs);
    }

    private void No_Click(object sender, RoutedEventArgs e)
    {
        if (_holding) return;

        _revealed = false;
        _holding = true;
        SwitchTo(Stage.Fell);

        Failed?.Invoke();
        Hold(FellMs);
    }

    /// <summary>
    /// Keeps the current face for <paramref name="ms"/> while its animation plays out, then hands the
    /// decision back to <see cref="Desired"/> — by which time the track's state has moved on.
    /// </summary>
    private void Hold(int ms) => Anim.After(ms, () =>
    {
        _holding = false;
        var target = Desired();
        if (target != _stage) SwitchTo(target);
    });

    private void Back_Click(object sender, RoutedEventArgs e) => BackRequested?.Invoke();
}
