using System;
using System.Globalization;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Counts consecutive failures and opens after a threshold, suppressing operations until a cooldown elapses.
/// It keeps its state in memory, for one named service.
/// </summary>
/// <remarks>
/// There is no half-open state. After the cooldown the failure count is kept, so the first failure after it opens the breaker again.
/// Each failure at or above the threshold restarts the cooldown. The constructor arguments are not validated.
/// </remarks>
public class CircuitBreaker
{
    private readonly ILogger _logger;
    private readonly string _serviceName;
    private readonly int _failureThreshold;
    private readonly TimeSpan _cooldownPeriod;
    private readonly TimeProvider _timeProvider;

    private int _consecutiveFailures;
    private DateTimeOffset? _circuitOpenedAt;
    private readonly object _lock = new();

    /// <summary>
    /// Gets a value indicating whether the breaker is open and operations should be suppressed.
    /// </summary>
    public bool IsOpen
    {
        get
        {
            lock (_lock)
            {
                if (_circuitOpenedAt == null)
                {
                    return false;
                }

                if (_timeProvider.GetUtcNow() - _circuitOpenedAt.Value >= _cooldownPeriod)
                {
                    return false;
                }

                return true;
            }
        }
    }

    /// <summary>
    /// Gets the failures in a row.
    /// </summary>
    public int ConsecutiveFailures
    {
        get
        {
            lock (_lock)
            {
                return _consecutiveFailures;
            }
        }
    }

    /// <summary>
    /// Gets the time left in the cooldown, or <c>null</c> when the breaker is closed or the cooldown has elapsed.
    /// </summary>
    public TimeSpan? CooldownRemaining
    {
        get
        {
            lock (_lock)
            {
                if (_circuitOpenedAt == null)
                {
                    return null;
                }

                var elapsed = _timeProvider.GetUtcNow() - _circuitOpenedAt.Value;
                if (elapsed >= _cooldownPeriod)
                {
                    return null;
                }

                return _cooldownPeriod - elapsed;
            }
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="CircuitBreaker"/> class.
    /// </summary>
    /// <param name="logger">The logger that reports each state change.</param>
    /// <param name="serviceName">The name of the guarded service, used in log lines and refusal reasons.</param>
    /// <param name="failureThreshold">The failures in a row that open the breaker. 5 by default.</param>
    /// <param name="cooldownPeriod">How long the breaker stays open. 5 minutes by default.</param>
    /// <param name="timeProvider">The clock that times the cooldown. The system clock by default, and a fake one lets a test pass time without waiting.</param>
    public CircuitBreaker(
        ILogger logger,
        string serviceName,
        int failureThreshold = 5,
        TimeSpan? cooldownPeriod = null,
        TimeProvider? timeProvider = null)
    {
        _timeProvider = timeProvider ?? TimeProvider.System;
        _logger = logger;
        _serviceName = serviceName;
        _failureThreshold = failureThreshold;
        _cooldownPeriod = cooldownPeriod ?? TimeSpan.FromMinutes(5);
    }

    /// <summary>
    /// Clears the failure count and closes the breaker after a successful operation.
    /// </summary>
    public void RecordSuccess()
    {
        lock (_lock)
        {
            if (_consecutiveFailures > 0 || _circuitOpenedAt != null)
            {
                _logger.LogInformation(
                    "Circuit breaker for {Service} reset after successful operation",
                    _serviceName);
            }

            _consecutiveFailures = 0;
            _circuitOpenedAt = null;
        }
    }

    /// <summary>
    /// Adds a failure and opens the breaker when the threshold is reached.
    /// </summary>
    /// <param name="errorMessage">The error to log, or <c>null</c> to log "Unknown".</param>
    public void RecordFailure(string? errorMessage = null)
    {
        lock (_lock)
        {
            _consecutiveFailures++;

            if (_consecutiveFailures >= _failureThreshold)
            {
                _circuitOpenedAt = _timeProvider.GetUtcNow();
                _logger.LogWarning(
                    "Circuit breaker OPEN for {Service}: {Failures} consecutive failures. " +
                    "Calls will pause for {Cooldown} minutes. Last error: {Error}",
                    _serviceName,
                    _consecutiveFailures,
                    _cooldownPeriod.TotalMinutes,
                    errorMessage ?? "Unknown");
            }
            else if (_circuitOpenedAt == null)
            {
                _logger.LogDebug(
                    "Circuit breaker for {Service}: failure {Current}/{Threshold}. Error: {Error}",
                    _serviceName,
                    _consecutiveFailures,
                    _failureThreshold,
                    errorMessage ?? "Unknown");
            }
        }
    }

    /// <summary>
    /// Checks whether an operation may proceed.
    /// </summary>
    /// <param name="reason"><c>null</c> when the operation may proceed, otherwise why it is suppressed and how long to wait.</param>
    /// <returns><c>true</c> when the operation should proceed, otherwise <c>false</c>.</returns>
    public bool AllowOperation(out string? reason)
    {
        lock (_lock)
        {
            if (_circuitOpenedAt == null || _timeProvider.GetUtcNow() - _circuitOpenedAt.Value >= _cooldownPeriod)
            {
                reason = null;
                return true;
            }

            var remaining = _cooldownPeriod - (_timeProvider.GetUtcNow() - _circuitOpenedAt.Value);
            reason = $"Circuit breaker open for {_serviceName}: " +
                     $"{_consecutiveFailures} consecutive failures. " +
                     $"Retry in {remaining.TotalSeconds.ToString("F0", CultureInfo.InvariantCulture)} seconds.";
            return false;
        }
    }

    /// <summary>
    /// Closes the breaker and clears the failure count.
    /// </summary>
    public void Reset()
    {
        lock (_lock)
        {
            _consecutiveFailures = 0;
            _circuitOpenedAt = null;
            _logger.LogInformation("Circuit breaker for {Service} manually reset", _serviceName);
        }
    }
}
