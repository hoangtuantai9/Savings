using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Threading;

// System.IO comes in implicitly and brings its own Path with it.
using Path = System.Windows.Shapes.Path;

namespace Savings;

/// <summary>
/// The diamond the whole app is built on. Straight edges kept sharp in the geometry so the
/// perimeter maths stays exact; corners are softened by StrokeLineJoin on the Paths instead.
/// </summary>
public static class Gem
{
    /// <summary>Closed diamond starting at the top vertex and running clockwise.</summary>
    public static PathGeometry Outline(double cx, double cy, double w, double h)
    {
        var figure = new PathFigure
        {
            StartPoint = new Point(cx, cy - h),
            IsClosed = true,
            IsFilled = true
        };
        figure.Segments.Add(new LineSegment(new Point(cx + w, cy), true));
        figure.Segments.Add(new LineSegment(new Point(cx, cy + h), true));
        figure.Segments.Add(new LineSegment(new Point(cx - w, cy), true));

        var geo = new PathGeometry();
        geo.Figures.Add(figure);
        geo.Freeze();
        return geo;
    }

    /// <summary>
    /// The narrow half of the diamond, drawn over the fill as a lighter panel so the stone reads as
    /// cut glass rather than a flat lozenge. Same centre and height as <see cref="Outline"/>.
    /// </summary>
    public static PathGeometry Facet(double cx, double cy, double w, double h)
    {
        var figure = new PathFigure
        {
            StartPoint = new Point(cx, cy - h),
            IsClosed = true,
            IsFilled = true
        };
        figure.Segments.Add(new LineSegment(new Point(cx + w * 0.42, cy), true));
        figure.Segments.Add(new LineSegment(new Point(cx, cy + h), true));
        figure.Segments.Add(new LineSegment(new Point(cx - w * 0.42, cy), true));

        var geo = new PathGeometry();
        geo.Figures.Add(figure);
        geo.Freeze();
        return geo;
    }

    /// <summary>
    /// Cuts and lights an ice stone: the bonus, which is the same stone on the menu card and on the
    /// coin's own screen and so was being built twice. Its halo is padded proportionally rather than by
    /// a fixed few pixels, which is what lets the two sizes share this. The beat is its own, deliberately
    /// — the bonus runs on a clock nothing else in the app can reach.
    /// </summary>
    public static void Ice(Path stone, Path facet, Path halo, ScaleTransform beat,
                           double cx, double cy, double w, double h)
    {
        stone.Data = Outline(cx, cy, w, h);
        facet.Data = Facet(cx, cy, w, h);
        halo.Data = Outline(cx, cy, w * 1.23, h * 1.23);
        stone.Fill = Palette.Cut(Palette.Of((Brush)Application.Current.FindResource("Ice")));

        beat.BeginAnimation(ScaleTransform.ScaleXProperty, Anim.Loop(0.94, 1.12, 2400));
        beat.BeginAnimation(ScaleTransform.ScaleYProperty, Anim.Loop(0.94, 1.12, 2400));
        halo.BeginAnimation(UIElement.OpacityProperty, Anim.Loop(0.18, 0.5, 2400));
    }

    private static double Perimeter(double w, double h) => 4 * Math.Sqrt(w * w + h * h);

    /// <summary>Point <paramref name="fraction"/> of the way clockwise from the top vertex.</summary>
    public static Point PointAt(double cx, double cy, double w, double h, double fraction)
    {
        var f = Math.Clamp(fraction, 0, 0.99999);
        var edge = (int)(f * 4);
        var t = f * 4 - edge;

        Point[] corners =
        {
            new(cx, cy - h), new(cx + w, cy), new(cx, cy + h), new(cx - w, cy)
        };
        var a = corners[edge];
        var b = corners[(edge + 1) % 4];
        return new Point(a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t);
    }

    /// <summary>
    /// Dash pattern that paints only the first <paramref name="fraction"/> of the perimeter.
    /// Dash lengths are multiples of the stroke thickness, hence the division.
    /// </summary>
    public static DoubleCollection Dash(double w, double h, double thickness, double fraction)
    {
        var units = Perimeter(w, h) / thickness;
        return new DoubleCollection { Math.Max(0.0001, units * Math.Clamp(fraction, 0, 1)), units };
    }
}

public static class Palette
{
    private static readonly string[] TierKeys = { "Tier1", "Tier2", "Tier3" };

    private static Brush Res(string key) => (Brush)Application.Current.FindResource(key);

    /// <summary>
    /// Colour a track wears at <paramref name="index"/>. A plan without tiers keeps the currency's
    /// own accent, so a hand-pasted list never comes out looking like it is stuck on tier one.
    /// </summary>
    public static Brush Accent(string currency, PlanConfig plan, int index)
    {
        if (plan.TierEnds.Count == 0) return Res(currency == "VND" ? "Vnd" : "Usd");

        // A finished track sits one past its last step; keep it on that step's colour.
        var step = Math.Clamp(index, 0, Math.Max(0, plan.Count - 1));
        return Res(TierKeys[Math.Clamp(plan.TierAt(step), 0, TierKeys.Length - 1)]);
    }

    /// <summary>
    /// The colour behind an accent brush. Every accent in the app comes from the tier resources above
    /// and is therefore solid; the fallback only exists so a stray gradient cannot throw.
    /// </summary>
    public static Color Of(Brush brush) => brush is SolidColorBrush solid ? solid.Color : Colors.White;

    /// <summary>Mixes <paramref name="t"/> of <paramref name="b"/> into <paramref name="a"/>.</summary>
    public static Color Blend(Color a, Color b, double t) => Color.FromRgb(
        (byte)(a.R + (b.R - a.R) * t),
        (byte)(a.G + (b.G - a.G) * t),
        (byte)(a.B + (b.B - a.B) * t));

    /// <summary>Top-lit stone: a pale crown, the colour through the middle, a deep shadow at the point.</summary>
    public static LinearGradientBrush Cut(Color c)
    {
        var brush = new LinearGradientBrush { StartPoint = new Point(0.5, 0), EndPoint = new Point(0.5, 1) };
        brush.GradientStops.Add(new GradientStop(Blend(c, Colors.White, 0.62), 0));
        brush.GradientStops.Add(new GradientStop(c, 0.5));
        brush.GradientStops.Add(new GradientStop(Blend(c, Colors.Black, 0.42), 1));
        brush.Freeze();
        return brush;
    }

    /// <summary>The halo a gem or a headline wears: a drop shadow with no offset, so it lights all round.</summary>
    public static DropShadowEffect Glow(Color colour, double blur, double opacity) => new()
    {
        Color = colour,
        ShadowDepth = 0,
        BlurRadius = blur,
        Opacity = opacity
    };
}

public static class Fmt
{
    /// <summary>mm:ss under an hour, h:mm:ss under a day, then "6d 23:59".</summary>
    public static string Clock(TimeSpan t)
    {
        var total = (long)Math.Ceiling(t.TotalSeconds);
        if (total < 0) total = 0;

        var days = total / 86_400;
        var hours = total / 3_600 % 24;
        var mins = total / 60 % 60;
        var secs = total % 60;

        if (days > 0) return $"{days}d {hours:00}:{mins:00}";
        if (hours > 0) return $"{hours}:{mins:00}:{secs:00}";
        return $"{mins:00}:{secs:00}";
    }
}

public static class Anim
{
    public static IEasingFunction Out => new CubicEase { EasingMode = EasingMode.EaseOut };
    public static IEasingFunction In => new CubicEase { EasingMode = EasingMode.EaseIn };
    private static IEasingFunction Soft => new SineEase { EasingMode = EasingMode.EaseInOut };
    public static IEasingFunction Back => new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.7 };

    public static DoubleAnimation D(double from, double to, int ms, IEasingFunction? ease = null, int delayMs = 0) =>
        new(from, to, TimeSpan.FromMilliseconds(ms))
        {
            EasingFunction = ease,
            BeginTime = TimeSpan.FromMilliseconds(delayMs)
        };

    /// <summary>
    /// Eases to a value from wherever the property currently stands, animated or not. Every change of
    /// state on the menu goes through this rather than an assignment: a card that has just locked is
    /// mid-breath when it is told to go quiet, and starting from the value it is actually showing is
    /// what keeps that from snapping.
    /// </summary>
    public static DoubleAnimation To(double to, int ms) =>
        new(to, TimeSpan.FromMilliseconds(ms)) { EasingFunction = Out };

    /// <summary>The same, for a colour: crossfades rather than cuts.</summary>
    public static ColorAnimation Hue(Color to, int ms) =>
        new(to, TimeSpan.FromMilliseconds(ms)) { EasingFunction = Out };

    /// <summary>Ping-pongs between two values forever — used for the idle breathing halo.</summary>
    public static DoubleAnimation Loop(double from, double to, int ms, int delayMs = 0) =>
        new(from, to, TimeSpan.FromMilliseconds(ms))
        {
            EasingFunction = Soft,
            AutoReverse = true,
            RepeatBehavior = RepeatBehavior.Forever,
            BeginTime = TimeSpan.FromMilliseconds(delayMs)
        };

    /// <summary>
    /// A value that waits, crosses, and waits again, forever — the glint travelling a gem's face.
    /// <paramref name="hold"/> is the share of each pass spent parked at <paramref name="from"/>, which
    /// is what makes this a glint rather than a searchlight: the sweep itself is quick, and most of the
    /// cycle is the stone sitting still.
    /// </summary>
    public static DoubleAnimationUsingKeyFrames Sweep(double from, double to, int ms, double hold)
    {
        var frames = new DoubleAnimationUsingKeyFrames
        {
            Duration = TimeSpan.FromMilliseconds(ms),
            RepeatBehavior = RepeatBehavior.Forever
        };
        frames.KeyFrames.Add(new DiscreteDoubleKeyFrame(from, KeyTime.FromPercent(0)));
        frames.KeyFrames.Add(new DiscreteDoubleKeyFrame(from, KeyTime.FromPercent(Math.Clamp(hold, 0, 0.95))));
        frames.KeyFrames.Add(new EasingDoubleKeyFrame(to, KeyTime.FromPercent(1), Soft));
        return frames;
    }

    /// <summary>One-shot delayed callback on the UI thread.</summary>
    public static void After(int ms, Action action)
    {
        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(Math.Max(1, ms)) };
        timer.Tick += (_, _) => { timer.Stop(); action(); };
        timer.Start();
    }

    /// <summary>Scale both axes of a transform with one animation.</summary>
    public static void Scale(ScaleTransform t, double from, double to, int ms,
                             IEasingFunction? ease = null, int delayMs = 0)
    {
        t.BeginAnimation(ScaleTransform.ScaleXProperty, D(from, to, ms, ease, delayMs));
        t.BeginAnimation(ScaleTransform.ScaleYProperty, D(from, to, ms, ease, delayMs));
    }

    /// <summary>
    /// Something small arriving or leaving under its own steam: it springs in past its size and settles,
    /// and drops away quicker than it came. Used for the bonus stone on both screens, which is either
    /// there or not there — there is no dimmed placeholder for it to cool down into.
    /// </summary>
    public static void Pop(UIElement element, ScaleTransform scale, bool live)
    {
        element.BeginAnimation(UIElement.OpacityProperty,
            D(live ? 0 : 1, live ? 1 : 0, live ? 420 : 260, live ? Out : In));
        Scale(scale, live ? 0.4 : 1, live ? 1 : 0.4, live ? 620 : 260, live ? Back : In);
    }

    /// <summary>One shockwave: a ring growing outward as it fades. Every burst in the app is a few of these.</summary>
    public static void Ring(UIElement ring, ScaleTransform scale, double from, double to, int ms, int delayMs = 0)
    {
        ring.BeginAnimation(UIElement.OpacityProperty, D(0.85, 0, ms, Out, delayMs));
        Scale(scale, from, to, ms, Out, delayMs);
    }

    /// <summary>Squash-and-restore flip; <paramref name="swap"/> runs while the face is edge-on.</summary>
    public static void Flip(ScaleTransform t, Action swap, Action? done = null, int outMs = 160, int inMs = 260)
    {
        var shrink = D(1, 0, outMs, In);
        shrink.Completed += (_, _) =>
        {
            swap();
            var grow = D(0, 1, inMs, Out);
            grow.Completed += (_, _) => done?.Invoke();
            t.BeginAnimation(ScaleTransform.ScaleXProperty, grow);
        };
        t.BeginAnimation(ScaleTransform.ScaleXProperty, shrink);
    }

    /// <summary>
    /// A gem shivering on the spot: <paramref name="shakes"/> flicks left-and-right and then still again.
    /// Counted rather than looped on purpose — this is the announcement that a lock has run out, and an
    /// announcement that never stops would just be another idle animation. Each flick is a little smaller
    /// than the one before so the stone settles instead of stopping dead, and the last key frame is a hard
    /// zero, so the gem always ends exactly where it started.
    /// </summary>
    public static void Shake(TranslateTransform t, double amplitude, int shakes, int msEach,
                             Action? done = null)
    {
        var frames = new DoubleAnimationUsingKeyFrames
        {
            Duration = TimeSpan.FromMilliseconds(msEach * shakes)
        };

        for (var i = 0; i < shakes; i++)
        {
            var swing = amplitude * Math.Pow(0.86, i);
            frames.KeyFrames.Add(new EasingDoubleKeyFrame(swing, KeyTime.FromPercent((i + 0.25) / shakes), Soft));
            frames.KeyFrames.Add(new EasingDoubleKeyFrame(-swing, KeyTime.FromPercent((i + 0.75) / shakes), Soft));
        }
        frames.KeyFrames.Add(new EasingDoubleKeyFrame(0, KeyTime.FromPercent(1), Soft));

        if (done is not null) frames.Completed += (_, _) => done();
        t.BeginAnimation(TranslateTransform.XProperty, frames);
    }

    /// <summary>Elastic bounce, used when something unlocks or lands.</summary>
    public static void Bounce(ScaleTransform t, double peak = 1.07, int ms = 620)
    {
        var frames = new DoubleAnimationUsingKeyFrames { Duration = TimeSpan.FromMilliseconds(ms) };
        frames.KeyFrames.Add(new EasingDoubleKeyFrame(peak, KeyTime.FromPercent(0.35),
            new CubicEase { EasingMode = EasingMode.EaseOut }));
        frames.KeyFrames.Add(new EasingDoubleKeyFrame(1.0, KeyTime.FromPercent(1.0),
            new ElasticEase { Oscillations = 2, Springiness = 4.5, EasingMode = EasingMode.EaseOut }));
        t.BeginAnimation(ScaleTransform.ScaleXProperty, frames);
        t.BeginAnimation(ScaleTransform.ScaleYProperty, frames);
    }
}
