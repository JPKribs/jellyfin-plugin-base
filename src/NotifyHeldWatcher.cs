using System;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Session;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Shows the Jellyfin messages <see cref="BaseNotifier"/> held for someone as soon as one of their devices that can show messages comes
/// online. A device says what it can do just after it connects, so both are watched. <see cref="ServiceCollectionExtensions.AddBaseNotifier"/>
/// registers it.
/// </summary>
public sealed class NotifyHeldWatcher : IHostedService, IDisposable
{
    private readonly CancellationTokenSource _stopping = new();
    private readonly ISessionManager _sessionManager;
    private readonly BaseNotifier _notifier;
    private readonly ILogger<NotifyHeldWatcher> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotifyHeldWatcher"/> class.
    /// </summary>
    /// <param name="sessionManager">The session manager, whose sessions are watched.</param>
    /// <param name="notifier">The notifier, which shows the held messages.</param>
    /// <param name="logger">The logger.</param>
    public NotifyHeldWatcher(ISessionManager sessionManager, BaseNotifier notifier, ILogger<NotifyHeldWatcher> logger)
    {
        ArgumentNullException.ThrowIfNull(sessionManager);
        ArgumentNullException.ThrowIfNull(notifier);
        ArgumentNullException.ThrowIfNull(logger);
        _sessionManager = sessionManager;
        _notifier = notifier;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _sessionManager.SessionStarted += OnSessionChanged;
        _sessionManager.CapabilitiesChanged += OnSessionChanged;
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _sessionManager.SessionStarted -= OnSessionChanged;
        _sessionManager.CapabilitiesChanged -= OnSessionChanged;
        await _stopping.CancelAsync().ConfigureAwait(false);
    }

    /// <inheritdoc />
    public void Dispose() => _stopping.Dispose();

    private void OnSessionChanged(object? sender, SessionEventArgs e)
    {
        if (e?.SessionInfo is not { } session || session.UserId == Guid.Empty || !BaseNotifier.CanShowMessages(session) || _stopping.IsCancellationRequested)
        {
            return;
        }

        _ = ReleaseAsync(session.UserId, session.Id);
    }

    // The device that came online is named, so a message meant for one device shows on it.
    private async Task ReleaseAsync(Guid userId, string sessionId)
    {
        try
        {
            await _notifier.ReleaseHeldAsync(userId, sessionId, _stopping.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not show the messages held for {User}", userId);
        }
    }
}
