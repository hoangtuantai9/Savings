using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace Savings;

/// <summary>
/// Magnetic edges. Windows owns the drag — the window is moved by its caption strip, not by any code
/// here — so the only thing worth watching is the moment the drag ends. If an edge of the window has
/// come to rest within a thumb's width of the matching edge of the screen, it is pulled flush against it.
///
/// The two axes are pulled independently, which is what makes corners work without a special case:
/// throw the window at the top right and both the top and the right edge are in range, so it lands in
/// the corner. Slide it against one side only and it sticks to that side, at whatever height you left it.
/// </summary>
public static class Snap
{
    /// <summary>How close an edge has to get before it is taken, in device-independent pixels.</summary>
    private const int Reach = 28;

    private const int WmExitSizeMove = 0x0232;

    public static void Attach(Window window)
    {
        var hwnd = new WindowInteropHelper(window).Handle;
        if (hwnd != IntPtr.Zero) HwndSource.FromHwnd(hwnd)?.AddHook(Hook);
    }

    private static IntPtr Hook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WmExitSizeMove) Park(hwnd);
        return IntPtr.Zero;
    }

    /// <summary>
    /// Everything here is in physical pixels: the window rectangle and the screen both come from Win32
    /// in those units, and moving the window back with SetWindowPos takes them too. Staying out of
    /// device-independent pixels entirely means there is no DPI conversion to get wrong.
    /// </summary>
    private static void Park(IntPtr hwnd)
    {
        if (!GetWindowRect(hwnd, out var window) || !WorkArea(hwnd, out var screen)) return;

        var reach = (int)Math.Round(Reach * GetDpiForWindow(hwnd) / 96.0);
        var left = Pull(window.Left, window.Right, screen.Left, screen.Right, reach);
        var top = Pull(window.Top, window.Bottom, screen.Top, screen.Bottom, reach);

        if (left == window.Left && top == window.Top) return;
        SetWindowPos(hwnd, IntPtr.Zero, left, top, 0, 0, SwpNoSize | SwpNoZOrder | SwpNoActivate);
    }

    /// <summary>
    /// Where one axis ends up. The near edge wins ties, so a window narrower than the pull distance
    /// cannot be claimed by both sides at once.
    /// </summary>
    private static int Pull(int near, int far, int low, int high, int reach)
    {
        if (Math.Abs(near - low) <= reach) return low;
        if (Math.Abs(far - high) <= reach) return high - (far - near);
        return near;
    }

    /// <summary>
    /// The usable area of whichever screen the window is mostly on — not the primary one, and not the
    /// whole screen either, so a docked taskbar is never sat on top of.
    /// </summary>
    private static bool WorkArea(IntPtr hwnd, out Box work)
    {
        work = default;

        var monitor = MonitorFromWindow(hwnd, MonitorNearest);
        if (monitor == IntPtr.Zero) return false;

        var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        if (!GetMonitorInfoW(monitor, ref info)) return false;

        work = info.Work;
        return true;
    }

    // ---- win32 ----

    private const int MonitorNearest = 2;
    private const int SwpNoSize = 0x0001, SwpNoZOrder = 0x0004, SwpNoActivate = 0x0010;

    [StructLayout(LayoutKind.Sequential)]
    private struct Box
    {
        public int Left, Top, Right, Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MonitorInfo
    {
        public int Size;
        public Box Monitor;
        public Box Work;
        public int Flags;
    }

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hwnd, out Box box);

    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, int flags);

    [DllImport("user32.dll")]
    private static extern bool GetMonitorInfoW(IntPtr monitor, ref MonitorInfo info);

    [DllImport("user32.dll")]
    private static extern uint GetDpiForWindow(IntPtr hwnd);
}
