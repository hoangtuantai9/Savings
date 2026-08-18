using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

namespace Savings;

/// <summary>
/// The reward for holding out through the lock: one word, struck across a darkened window. It arrives
/// oversized and spread apart, snaps home in the tier's colour, and throws a shower of sparks out of
/// its centre. Sits over the whole window and never takes the mouse.
///
/// Deliberately says nothing else — not the amount, not the currency, not which rung was reached. How
/// far up the ladder you are is not something this app puts on screen.
/// </summary>
public partial class Celebration : UserControl
{
    /// <summary>What the overlay says when nobody asks for anything else.</summary>
    private const string Text = "UNLOCKED";

    /// <summary>The word currently laid out, so it is only rebuilt when a different one is asked for.</summary>
    private string _word = "";

    /// <summary>Layout of the word: glyph size, the gap it lands on, and the wider gap it flies in from.</summary>
    private const double LetterSize = 62, Kerning = 3, Spread = 26;

    /// <summary>How long the finished frame is held before the overlay lets the window back.</summary>
    private const int HoldMs = 1500, HoldTierMs = 1900;

    private sealed class Spark
    {
        public required Ellipse Dot;
        public double X, Y, Vx, Vy, Size, Life, Decay;
    }

    private readonly Random _rng = new();
    private readonly List<Spark> _sparks = new();
    private readonly List<Ellipse> _spare = new();
    private readonly List<TranslateTransform> _letters = new();

    private bool _rendering;

    /// <summary>Guards against a second step being banked while this one is still playing.</summary>
    private bool _busy;

    public Celebration()
    {
        InitializeComponent();

        Wave.Data = Gem.Outline(310, 130, 268, 112);
        BuildWord(Text);
    }

    /// <summary>
    /// Lays the word out one TextBlock per letter — they have to be separate elements for the spread to
    /// be animatable at all. Rebuilt only when a different word is asked for, which in practice means
    /// once at startup and once at the end of a journey.
    /// </summary>
    private void BuildWord(string word)
    {
        if (_word == word) return;
        _word = word;

        Word.Children.Clear();
        _letters.Clear();

        foreach (var ch in word)
        {
            var move = new TranslateTransform();
            Word.Children.Add(new TextBlock
            {
                Text = ch.ToString(),
                FontSize = LetterSize,
                FontWeight = FontWeights.Bold,
                Margin = new Thickness(Kerning, 0, Kerning, 0),
                RenderTransform = move
            });
            _letters.Add(move);
        }
    }

    /// <summary>
    /// Fires once a lock has been ridden out and confirmed. <paramref name="tierUp"/> is the bigger
    /// moment — the ladder has crossed into a new colour band — and buys a longer hold and twice the sparks.
    /// <paramref name="word"/> is what gets struck across the window; the end of a journey borrows this
    /// same overlay to say its own thing.
    /// </summary>
    public void Play(Brush accent, bool tierUp, string word = Text)
    {
        if (_busy) return;
        _busy = true;

        BuildWord(word);

        var colour = Palette.Of(accent);
        Paint(accent, colour);
        Rest();

        Visibility = Visibility.Visible;
        Root.BeginAnimation(OpacityProperty, Anim.D(0, 1, 180, Anim.Out));

        // The strike: the word fades up oversized and spread, then snaps to its final size and spacing.
        Word.BeginAnimation(OpacityProperty, Anim.D(0, 1, 260, Anim.Out, 120));
        Anim.Scale(WordScale, 1.18, 1, 520, Anim.Back, 120);
        for (var i = 0; i < _letters.Count; i++)
            _letters[i].BeginAnimation(TranslateTransform.XProperty,
                Anim.D(Offset(i), 0, 520, Anim.Back, 120));

        Anim.After(280, () =>
        {
            Anim.Ring(Wave, WaveScale, 0.55, 2.1, 900);
            Burst(tierUp ? 92 : 46, colour, tierUp ? 11 : 8.5);
        });

        Anim.After(tierUp ? HoldTierMs : HoldMs, Close);
    }

    /// <summary>How far out letter <paramref name="i"/> starts, measured from the middle of the word.</summary>
    private double Offset(int i) => (i - (_letters.Count - 1) / 2.0) * Spread;

    private void Paint(Brush accent, Color colour)
    {
        Wave.Stroke = accent;
        Word.Effect = Palette.Glow(colour, 34, 0.75);
    }

    /// <summary>Back to frame one, so a replay never inherits the last run's half-faded parts.</summary>
    private void Rest()
    {
        foreach (var part in new UIElement[] { Word, Wave })
        {
            part.BeginAnimation(OpacityProperty, null);
            part.Opacity = 0;
        }

        for (var i = 0; i < _letters.Count; i++)
        {
            _letters[i].BeginAnimation(TranslateTransform.XProperty, null);
            _letters[i].X = Offset(i);
        }
    }

    // ---- sparks ----

    /// <summary>
    /// Throws <paramref name="count"/> dots out of the middle of the word. They are plain ellipses moved
    /// by hand on every frame — cheaper than a storyboard each, and the only way to give them gravity
    /// and drag.
    /// </summary>
    private void Burst(int count, Color colour, double speed)
    {
        // The Viewbox may have shrunk the word, so ask the layout where it actually landed.
        UpdateLayout();
        Point origin;
        try
        {
            origin = Word.TransformToAncestor(this)
                         .Transform(new Point(Word.ActualWidth / 2, Word.ActualHeight / 2));
        }
        catch (InvalidOperationException)
        {
            // Not in the visual tree yet — nothing sensible to aim at, so skip the sparks this once.
            return;
        }

        var pale = Palette.Blend(colour, Colors.White, 0.55);
        Brush[] palette =
        {
            new SolidColorBrush(colour), new SolidColorBrush(pale), Brushes.White, new SolidColorBrush(colour)
        };
        foreach (var brush in palette) brush.Freeze();

        for (var i = 0; i < count; i++)
        {
            var angle = _rng.NextDouble() * Math.PI * 2;
            var push = speed * (0.35 + _rng.NextDouble());
            var size = 2.5 + _rng.NextDouble() * 4.5;

            var dot = Take();
            dot.Width = size;
            dot.Height = size;
            dot.Fill = palette[_rng.Next(palette.Length)];
            dot.Opacity = 1;

            _sparks.Add(new Spark
            {
                Dot = dot,
                X = origin.X,
                Y = origin.Y,
                Vx = Math.Cos(angle) * push,
                Vy = Math.Sin(angle) * push - 1.4,   // biased upward, so it reads as a shower
                Size = size,
                Life = 1,
                Decay = 0.008 + _rng.NextDouble() * 0.012
            });
        }

        if (_rendering) return;
        _rendering = true;
        CompositionTarget.Rendering += Step;
    }

    /// <summary>Ellipses are recycled: a burst of ninety allocates once and then never again.</summary>
    private Ellipse Take()
    {
        Ellipse dot;
        if (_spare.Count > 0)
        {
            dot = _spare[^1];
            _spare.RemoveAt(_spare.Count - 1);
        }
        else
        {
            dot = new Ellipse();
            Sparks.Children.Add(dot);
        }
        dot.Visibility = Visibility.Visible;
        return dot;
    }

    private void Step(object? sender, EventArgs e)
    {
        for (var i = _sparks.Count - 1; i >= 0; i--)
        {
            var p = _sparks[i];
            p.Vy += 0.34;          // gravity
            p.Vx *= 0.985;         // drag
            p.Vy *= 0.985;
            p.X += p.Vx;
            p.Y += p.Vy;
            p.Life -= p.Decay;

            if (p.Life <= 0 || p.Y > ActualHeight + 30)
            {
                p.Dot.Visibility = Visibility.Collapsed;
                _spare.Add(p.Dot);
                _sparks.RemoveAt(i);
                continue;
            }

            Canvas.SetLeft(p.Dot, p.X - p.Size / 2);
            Canvas.SetTop(p.Dot, p.Y - p.Size / 2);
            p.Dot.Opacity = Math.Min(1, p.Life * 1.6);
        }

        if (_sparks.Count > 0) return;
        CompositionTarget.Rendering -= Step;
        _rendering = false;
    }

    // ---- teardown ----

    private void Close()
    {
        var fade = Anim.D(1, 0, 420, Anim.In);
        fade.Completed += (_, _) =>
        {
            Visibility = Visibility.Collapsed;
            Wipe();
            _busy = false;
        };
        Root.BeginAnimation(OpacityProperty, fade);
    }

    private void Wipe()
    {
        foreach (var spark in _sparks)
        {
            spark.Dot.Visibility = Visibility.Collapsed;
            _spare.Add(spark.Dot);
        }
        _sparks.Clear();

        if (!_rendering) return;
        CompositionTarget.Rendering -= Step;
        _rendering = false;
    }
}
