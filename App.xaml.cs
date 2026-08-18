using System.Threading;
using System.Windows;

namespace Savings;

/// <summary>
/// One Savings at a time. The window lives in the tray with no close button, so a second launch is
/// almost always someone reaching for the app they already have running — clicking the shortcut again
/// after tucking it away. Rather than opening a second copy that would fight the first one over
/// %AppData%\Savings\data.json, the newcomer taps the running instance on the shoulder and exits.
/// </summary>
public partial class App : Application
{
    // Local\ scopes both handles to this login session, which is the same reach the app itself has.
    private const string MutexName = @"Local\Savings.SingleInstance";
    private const string SummonName = @"Local\Savings.Summon";

    /// <summary>Held for the whole run. Kept in a field so the GC cannot collect it and abandon the lock.</summary>
    private Mutex? _only;

    private EventWaitHandle? _summons;

    protected override void OnStartup(StartupEventArgs e)
    {
        _only = new Mutex(initiallyOwned: true, MutexName, out var weAreTheFirst);

        if (!weAreTheFirst)
        {
            WakeTheRunningCopy();
            _only.Dispose();
            _only = null;
            Shutdown();
            return;
        }

        base.OnStartup(e);

        // MainWindow is built here rather than by StartupUri: the check above has to be able to quit
        // before any window exists, and StartupUri would have already put one on screen.
        var window = new MainWindow();
        MainWindow = window;
        window.Show();

        ListenForLaterLaunches(window);
    }

    /// <summary>The whole job of a second launch: bring the first one forward, then get out of the way.</summary>
    private static void WakeTheRunningCopy()
    {
        try
        {
            if (EventWaitHandle.TryOpenExisting(SummonName, out var running))
                using (running) running.Set();
        }
        catch
        {
            // Nothing worth saying. The first copy is running either way, which is the point.
        }
    }

    /// <summary>
    /// Waits on the shared event for the rest of the session and shows the window whenever another
    /// launch signals it. Background thread, so it cannot keep the process alive past Exit.
    /// </summary>
    private void ListenForLaterLaunches(MainWindow window)
    {
        _summons = new EventWaitHandle(false, EventResetMode.AutoReset, SummonName);
        var handle = _summons;

        var listener = new Thread(() =>
        {
            while (handle.WaitOne())
                window.Dispatcher.BeginInvoke(window.SummonFromAnotherLaunch);
        })
        {
            IsBackground = true,
            Name = "Savings summons"
        };
        listener.Start();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _summons?.Dispose();
        _only?.ReleaseMutex();
        _only?.Dispose();
        base.OnExit(e);
    }
}
