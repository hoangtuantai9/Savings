using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;

namespace Savings;

/// <summary>One compartment of the main menu, as the window needs it drawn.</summary>
/// <param name="Expired">
/// This track's lock exists and its moment has passed — as opposed to there being no lock at all.
/// <paramref name="Left"/> cannot tell the two apart, and the difference is the whole announcement:
/// a countdown that ran out has been survived, while one taken away by an undo never was.
/// </param>
public readonly record struct TileState(
    int Done,
    int Total,
    TimeSpan? Left,
    bool Expired,
    bool Asking,
    bool Bonus,
    double Heat,
    Brush Accent);

/// <summary>One compartment of the main menu. Shows the rung it is standing on — never an amount.</summary>
public partial class MenuCoin : UserControl
{
    private const double Cx = 150, Cy = 120;
    private const double RimW = 108, RimH = 98, RimThickness = 8;
    private const double FaceW = 82, FaceH = 74;
    private const double SatCx = 60, SatCy = 55, SatW = 38, SatH = 34;

    /// <summary>
    /// Ground a closed stone is mixed towards. Cold and blue rather than neutral grey: a gem waiting out
    /// its lock should look like the light has gone out of it, and a red one mixed towards grey only
    /// looks like dust. Enough of the track's own colour survives the mix to say which gem it is.
    /// </summary>
    private static readonly Color Dusk = Color.FromRgb(0x1E, 0x26, 0x37);

    /// <summary>How long the gem takes to open or close. Long enough to read as a light coming up.</summary>
    private const int OpenMs = 520, ShutMs = 380;

    private Brush _accent = Brushes.White;
    private bool _pressed;

    /// <summary>
    /// The face of the stone, kept as one live brush for the life of the card. Rebuilding it on every
    /// change of state would mean cutting from one colour to the next; holding it means the three stops
    /// can be crossfaded instead, which is the whole difference between the gem dimming and it blinking.
    /// </summary>
    private readonly LinearGradientBrush _stone = new()
    {
        StartPoint = new Point(0.5, 0),
        EndPoint = new Point(0.5, 1)
    };

    /// <summary>The currency's own glow, held for the same reason as <see cref="_stone"/>.</summary>
    private readonly DropShadowEffect _shine = new() { ShadowDepth = 0, BlurRadius = 24, Opacity = 0.5 };

    /// <summary>The countdown's ink and the light behind it, both wearing a pale cast of the accent.</summary>
    private readonly SolidColorBrush _ink = new(Colors.White);
    private readonly DropShadowEffect _inkGlow = new() { ShadowDepth = 0, BlurRadius = 18, Opacity = 0.55 };

    /// <summary>Fraction of the ladder cleared, kept so the arc can be re-lit without another tick.</summary>
    private double _fraction;

    /// <summary>
    /// Whether the gem is open: lit, sparkling and one click from the coin's own screen. Null until the
    /// first frame decides, so neither state can be painted twice or skipped on the way in.
    /// </summary>
    private bool? _open;

    /// <summary>The gem is open unless a countdown or the shiver has closed it.</summary>
    private bool Open => _open != false;

    /// <summary>Last drawn state of the bonus stone, so it is only animated when it really comes or goes.</summary>
    private bool? _satLive;

    /// <summary>How wound up the card currently is, 0 at rest and 1 one step from a promotion.</summary>
    private double _heat;

    /// <summary>
    /// The shiver that announces the end of a lock: five flicks and then still. <see cref="ShakeMs"/> is
    /// one flick, so the whole announcement runs for 750 ms.
    /// </summary>
    private const int Shakes = 5, ShakeMs = 150;
    private const double ShakeSwing = 11;

    /// <summary>
    /// Whether this card was counting down last time it was drawn. Nullable so the very first frame
    /// cannot shake: launching the app onto a lock that expired while it was closed is not news.
    /// </summary>
    private bool? _wasWaiting;

    /// <summary>True while the gem is shivering — the window in which the way in is held shut.</summary>
    private bool _shaking;

    /// <summary>Outer glow with the pointer away — the level the hover falls back to.</summary>
    private double _rest = 0.18;

    public event Action? Chosen;

    /// <summary>The bonus stone was tapped — this track's screen, opened straight onto column C.</summary>
    public event Action? BonusChosen;

    public event Action? OptionsRequested;

    public MenuCoin()
    {
        InitializeComponent();

        var rim = Gem.Outline(Cx, Cy, RimW, RimH);
        var face = Gem.Outline(Cx, Cy, FaceW, FaceH);
        Track.Data = rim;
        PlanArc.Data = rim;
        FaceFill.Data = face;
        Facet.Data = Gem.Facet(Cx, Cy, FaceW, FaceH);
        Glint.Data = face;

        for (var i = 0; i < 3; i++) _stone.GradientStops.Add(new GradientStop(Colors.Transparent, i * 0.5));
        FaceFill.Fill = _stone;
        CurrencyText.Effect = _shine;
        ClockText.Foreground = _ink;
        ClockText.Effect = _inkGlow;

        Gem.Ice(SatStone, SatFacet, SatHalo, SatBeat, SatCx, SatCy, SatW, SatH);

        // The twinkles and the glint run for the life of the card and are shown or hidden as a group:
        // four sparks and a sweep starting and stopping every time a lock ends would each land back on
        // frame one together, which is exactly the blink this is meant not to be.
        Twinkle(Spark1Pop, Spark1, 2200, 0);
        Twinkle(Spark2Pop, Spark2, 2600, 520);
        Twinkle(Spark3Pop, Spark3, 2400, 1180);
        Twinkle(Spark4Pop, Spark4, 2900, 1800);
        Gleam.BeginAnimation(TranslateTransform.XProperty, Anim.Sweep(-160, 320, 4400, 0.68));

        // The bloom, the halo's beat and the light travelling the border all start at their resting
        // idle; the first Update takes them over and drives them from there.
        Idle(0);
    }

    public void Setup(string currency) => CurrencyText.Text = currency;

    public void Update(TileState tile)
    {
        Tint(tile.Accent);
        ShowSat(tile.Bonus);
        Charge(tile.Heat);

        // Steps cleared on this ladder, and only this one — the bonus keeps its own count and stays
        // out of this number, the same way it stays out of the arc.
        var steps = tile.Done.ToString();
        if (!Equals(StepText.Text, steps)) StepText.Text = steps;

        _fraction = tile.Total > 0 ? (double)tile.Done / tile.Total : 0;
        PlanArc.StrokeDashArray = Gem.Dash(RimW, RimH, RimThickness, _fraction);

        var waiting = tile.Left is not null;
        var finished = tile.Done >= tile.Total;

        // The one moment worth announcing: the clock has just run out on a track that still has rungs
        // left. Anything else that clears a countdown — the ladder ending, a step being undone — is not
        // the wait being survived, so it gets no shiver.
        if (_wasWaiting == true && !waiting && !finished && tile.Expired) Shiver();
        if (waiting) Settle();
        _wasWaiting = waiting;

        // The clock is cut into the stone rather than written under it. Only while it is running: the
        // text is behind a fade, and rewriting it on the way out would show the wrong number fading.
        if (waiting)
        {
            var clock = Fmt.Clock(tile.Left!.Value);
            if (!Equals(ClockText.Text, clock)) ClockText.Text = clock;
        }

        // A track waiting to be judged is just as open as a ready one — it simply owes an answer before
        // it will show another amount, and its own screen is where that is said. While the gem is still
        // shivering the way in stays shut: it opens when the stone comes to rest, and not a frame before.
        Light(!waiting && !_shaking);
    }

    /// <summary>
    /// Five flicks and then still, with the gem held shut until the last of them. The stone going quiet
    /// is what hands the card back: a lock that has run out should be something you notice from across
    /// the room, and then something you answer, rather than a countdown quietly reaching zero.
    /// </summary>
    private void Shiver()
    {
        _shaking = true;
        Anim.Shake(Quake, ShakeSwing, Shakes, ShakeMs, () =>
        {
            if (!_shaking) return;   // a new lock started mid-shiver; that one owns the card now
            _shaking = false;
            Light(true);
        });
    }

    /// <summary>A fresh lock cuts the announcement short — there is nothing left to announce.</summary>
    private void Settle()
    {
        if (!_shaking) return;
        _shaking = false;
        Quake.BeginAnimation(TranslateTransform.XProperty, null);
        Quake.X = 0;
    }

    /// <summary>
    /// The gem opening or closing, and the only state this card has. Open is the whole invitation: full
    /// colour, twinkling, a glint crossing the face and the pointer turning into a hand. Closed is the
    /// same stone with the light taken out of it and a clock in its face — nothing to click, and nothing
    /// pretending otherwise. Everything either way is eased from wherever it currently stands, so the
    /// change reads as a light coming up or going down rather than a frame being swapped.
    /// </summary>
    private void Light(bool open)
    {
        if (_open == open) return;
        var first = _open is null;
        _open = open;

        var ms = first ? 0 : open ? OpenMs : ShutMs;

        Panel.Cursor = open ? Cursors.Hand : Cursors.Arrow;
        Paint(ms);
        Idle(ms);

        // The count and the countdown trade places in the middle of the stone. The one arriving is held
        // back a little so it comes up as the other clears, instead of both being half there at once.
        StepBox.BeginAnimation(OpacityProperty, Fade(open, ms, open));
        LockBox.BeginAnimation(OpacityProperty, Fade(!open, ms, !open));

        Sparks.BeginAnimation(OpacityProperty, Fade(open, ms, open));
        Glint.BeginAnimation(OpacityProperty, Fade(open, ms, open));

        // One soft swell as it wakes, so the gem coming back is a moment rather than a fade. Nothing on
        // the way out: closing is the card going quiet, and a quiet thing does not spring.
        if (open && !first) Anim.Bounce(Wake, 1.05, 760);
    }

    /// <summary>A crossfade leg: in or out, optionally waiting out most of the other one first.</summary>
    private static DoubleAnimation Fade(bool show, int ms, bool late) =>
        Anim.D(show ? 0 : 1, show ? 1 : 0, Math.Max(1, late ? ms : ms / 2), Anim.Out,
            late ? ms / 3 : 0);

    /// <summary>
    /// The card winding itself up as a tier boundary comes into range. Nothing new is drawn for this:
    /// the bloom, the halo's beat and the light travelling the border are already there at a resting
    /// idle, and all <paramref name="heat"/> does is drive them harder and faster — brightest and
    /// quickest on the very last step, where the next tick promotes the whole track.
    ///
    /// Cheap to call on every clock tick because it exits unless the number really moved; restarting
    /// four looping animations five times a second would otherwise leave them permanently at frame one.
    /// </summary>
    private void Charge(double heat)
    {
        if (Math.Abs(heat - _heat) < 0.0001) return;
        _heat = heat;
        Idle(600);
    }

    /// <summary>
    /// Everything on the card that never stops moving, set to the state it should be moving in. A closed
    /// gem keeps the light travelling its border, but slowly, and with the bloom behind it shut down:
    /// the card is waiting, not switched off.
    /// </summary>
    private void Idle(int ms)
    {
        if (Open)
        {
            var beat = (int)(2600 - 1700 * _heat);
            Bloom.BeginAnimation(OpacityProperty, Anim.Loop(0.16 + 0.20 * _heat, 0.34 + 0.42 * _heat, beat));
            HaloBeat.BeginAnimation(ScaleTransform.ScaleXProperty, Anim.Loop(0.92 - 0.08 * _heat, 1.08 + 0.16 * _heat, beat));
            HaloBeat.BeginAnimation(ScaleTransform.ScaleYProperty, Anim.Loop(0.92 - 0.08 * _heat, 1.08 + 0.16 * _heat, beat));
            Spin(7 - 4.6 * _heat);

            // The outer glow is shared with the hover state, so its resting value is remembered rather
            // than written straight to the effect — otherwise the pointer leaving would undo the charge.
            _rest = 0.18 + 0.34 * _heat;
        }
        else
        {
            // Eased down to a standstill rather than stopped where they are: a breathing bloom cut dead
            // mid-breath is the one thing on this card that would actually look broken.
            Bloom.BeginAnimation(OpacityProperty, Anim.To(0.05, ms));
            HaloBeat.BeginAnimation(ScaleTransform.ScaleXProperty, Anim.To(1, ms));
            HaloBeat.BeginAnimation(ScaleTransform.ScaleYProperty, Anim.To(1, ms));
            Spin(22);

            _rest = 0.05;
        }

        if (!IsMouseOver) Glow(_rest, ms);
    }

    /// <summary>
    /// The light travelling the card's border, at a new speed. Picked up from the angle it has already
    /// turned to rather than restarted, so changing gear does not snap the light back to the corner.
    /// </summary>
    private void Spin(double seconds)
    {
        var from = RimSpin.Angle;
        RimSpin.BeginAnimation(RotateTransform.AngleProperty,
            new DoubleAnimation(from, from + 360, TimeSpan.FromSeconds(seconds))
            {
                RepeatBehavior = RepeatBehavior.Forever
            });
    }

    /// <summary>The outer glow, eased to a level. Never assigned outright — the hover shares it.</summary>
    private void Glow(double to, int ms) =>
        Halo.BeginAnimation(DropShadowEffect.OpacityProperty, Anim.To(to, Math.Max(1, ms)));

    /// <summary>A spark breathing in and out on its own clock, so no two ever peak together.</summary>
    private static void Twinkle(ScaleTransform pop, UIElement spark, int ms, int delayMs)
    {
        spark.BeginAnimation(OpacityProperty, Anim.Loop(0, 1, ms, delayMs));
        pop.BeginAnimation(ScaleTransform.ScaleXProperty, Anim.Loop(0.4, 1, ms, delayMs));
        pop.BeginAnimation(ScaleTransform.ScaleYProperty, Anim.Loop(0.4, 1, ms, delayMs));
    }

    /// <summary>
    /// The bonus stone arriving or leaving. When it is away the card shows nothing at all in its place
    /// — no dimmed socket, since an empty socket would say just as much as a countdown — and it stops
    /// taking clicks with it, since a stone that is not there cannot be tapped.
    /// </summary>
    private void ShowSat(bool live)
    {
        if (_satLive == live) return;
        _satLive = live;

        Sat.IsHitTestVisible = live;
        Anim.Pop(Sat, SatScale, live);
    }

    /// <summary>Repaint when the track crosses into a new milestone tier.</summary>
    private void Tint(Brush accent)
    {
        if (ReferenceEquals(_accent, accent)) return;
        var first = ReferenceEquals(_accent, Brushes.White);
        _accent = accent;
        Paint(first ? 0 : 700);
    }

    /// <summary>
    /// Every surface that wears the track's colour, crossfaded to the strength the gem's current state
    /// earns. A closed stone is not simply faded out — the whole card is mixed towards its own frame
    /// colour, so it goes cold rather than translucent, and the pale clock cut into it stays readable.
    /// </summary>
    private void Paint(int ms)
    {
        var colour = Palette.Of(_accent);
        var stone = Open ? colour : Palette.Blend(colour, Dusk, 0.80);

        PlanArc.Stroke = _accent;
        Bloom.Fill = _accent;

        // The countdown, tinted almost to white but never quite: a hairline of the track's colour in the
        // ink and a wash of it behind, which is what stops a pale clock on a cold stone looking printed.
        _ink.BeginAnimation(SolidColorBrush.ColorProperty,
            Anim.Hue(Palette.Blend(colour, Colors.White, 0.84), ms));
        _inkGlow.BeginAnimation(DropShadowEffect.ColorProperty,
            Anim.Hue(Palette.Blend(colour, Colors.White, 0.30), ms));

        // A top-lit cut: pale crown, the colour through the middle, a deep shadow at the point.
        Hue(_stone.GradientStops[0], Palette.Blend(stone, Colors.White, 0.62), ms);
        Hue(_stone.GradientStops[1], stone, ms);
        Hue(_stone.GradientStops[2], Palette.Blend(stone, Colors.Black, 0.42), ms);

        Halo.BeginAnimation(DropShadowEffect.ColorProperty, Anim.Hue(stone, ms));
        RimCore.BeginAnimation(GradientStop.ColorProperty, Anim.Hue(stone, ms));
        WashTop.BeginAnimation(GradientStop.ColorProperty,
            Anim.Hue(Color.FromArgb((byte)(Open ? 0x33 : 0x14), stone.R, stone.G, stone.B), ms));
        WashOut.BeginAnimation(GradientStop.ColorProperty,
            Anim.Hue(Color.FromArgb(0x00, stone.R, stone.G, stone.B), ms));

        Track.BeginAnimation(OpacityProperty, Anim.To(Open ? 1 : 0.5, ms));
        Facet.BeginAnimation(OpacityProperty, Anim.To(Open ? 1 : 0.35, ms));
        CurrencyText.BeginAnimation(OpacityProperty, Anim.To(Open ? 1 : 0.6, ms));

        _shine.BeginAnimation(DropShadowEffect.ColorProperty, Anim.Hue(colour, ms));
        _shine.BeginAnimation(DropShadowEffect.OpacityProperty, Anim.To(Open ? 0.5 : 0.12, ms));

        Arc(ms);
    }

    private static void Hue(GradientStop stop, Color to, int ms) =>
        stop.BeginAnimation(GradientStop.ColorProperty, Anim.Hue(to, ms));

    /// <summary>How loudly the cleared part of the ladder is drawn round the rim.</summary>
    private void Arc(int ms) =>
        PlanArc.BeginAnimation(OpacityProperty, Anim.To(_fraction > 0 ? (Open ? 0.85 : 0.3) : 0, ms));

    /// <summary>Fade and rise into view. Nothing moves once it has landed.</summary>
    public void PlayEntry(int delayMs)
    {
        Panel.BeginAnimation(OpacityProperty, Anim.D(0, 1, 460, Anim.Out, delayMs));
        Rise.BeginAnimation(TranslateTransform.YProperty, Anim.D(30, 0, 520, Anim.Out, delayMs));
    }

    private void Panel_MouseEnter(object sender, MouseEventArgs e)
    {
        if (!Open) return;
        Anim.Scale(Hover, Hover.ScaleX, 1.035, 260, Anim.Out);
        Glow(Math.Max(0.55, _rest + 0.2), 260);
    }

    private void Panel_MouseLeave(object sender, MouseEventArgs e)
    {
        _pressed = false;
        Anim.Scale(Hover, Hover.ScaleX, 1.0, 300, Anim.Out);
        Glow(_rest, 300);
    }

    private void Panel_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (!Open) return;
        _pressed = true;
        Anim.Scale(Hover, Hover.ScaleX, 0.98, 120, Anim.Out);
    }

    private void Panel_MouseUp(object sender, MouseButtonEventArgs e)
    {
        if (!_pressed) return;
        _pressed = false;

        Anim.Scale(Hover, Hover.ScaleX, 1.035, 150, Anim.Out);

        // A gem that closed under the pointer keeps the press — the card still springs back, it simply
        // does not open anything.
        if (!Open) return;

        Chosen?.Invoke();
    }

    /// <summary>
    /// The bonus stone answers for itself. A lock on the main ladder is not its lock — the two run on
    /// unrelated clocks — so this goes through whatever the gem behind it is doing, and lands on column
    /// C directly rather than on a countdown the tap was never about.
    /// </summary>
    private void Sat_Click(object sender, MouseButtonEventArgs e)
    {
        e.Handled = true;
        _pressed = false;   // the press that opened the stone is not also a press on the card
        BonusChosen?.Invoke();
    }

    private void Sat_MouseEnter(object sender, MouseEventArgs e) =>
        Anim.Scale(SatHover, SatHover.ScaleX, 1.12, 200, Anim.Out);

    private void Sat_MouseLeave(object sender, MouseEventArgs e) =>
        Anim.Scale(SatHover, SatHover.ScaleX, 1.0, 240, Anim.Out);

    /// <summary>Right-click opens this track's settings, locked or not — kept off the screen to leave
    /// the card uncluttered, and the one thing a countdown does not take away.</summary>
    private void Panel_RightClick(object sender, MouseButtonEventArgs e) => OptionsRequested?.Invoke();
}
