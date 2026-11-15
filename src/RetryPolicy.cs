using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Retries an operation after a transient network fault, waiting longer after each failure.
/// </summary>
/// <remarks>
/// A transient fault is an <see cref="HttpRequestException"/> with no status or a status of 408, 429, 500, 502, 503, or 504,
/// a timeout, a socket error, or an I/O error other than a missing file, folder, drive, or a path that is too long.
/// An exception that wraps one of these as its inner exception counts too.
/// A bare exception of any other type is not retried, and neither is a cancelled token.
/// The wait starts at one second and doubles per attempt up to 30 seconds, then varies by up to a quarter either way.
/// </remarks>
public static class RetryPolicy
{
    private const int BaseDelayMs = 1000;
    private const int MaxDelayMs = 30000;

    /// <summary>
    /// Runs <paramref name="operation"/>, retrying transient failures up to <paramref name="maxRetries"/> times with exponential backoff and jitter.
    /// </summary>
    /// <remarks>
    /// After the last retry fails, the exception is logged as an error and rethrown.
    /// A negative <paramref name="maxRetries"/> never runs the operation and throws <see cref="InvalidOperationException"/>.
    /// </remarks>
    /// <typeparam name="T">The type the operation returns.</typeparam>
    /// <param name="operation">The work to run. It receives the cancellation token.</param>
    /// <param name="maxRetries">How many times to retry after the first attempt. 0 runs the operation once.</param>
    /// <param name="logger">The logger for retry warnings and the final error.</param>
    /// <param name="operationName">The name of the operation, used in log lines.</param>
    /// <param name="cancellationToken">The cancellation token. Cancelling it stops the operation and the waits, and the cancellation propagates.</param>
    /// <returns>The value the operation returned.</returns>
    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        int maxRetries,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        var attempt = 0;

        while (attempt <= maxRetries)
        {
            try
            {
                return await operation(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (IsTransientException(ex))
            {
                attempt++;

                if (attempt > maxRetries)
                {
                    logger.LogError(ex, "{Operation} failed after {Attempts} attempts", operationName, attempt);
                    throw;
                }

                var delay = CalculateDelay(attempt);
                logger.LogWarning(
                    "{Operation} failed (attempt {Attempt}/{MaxRetries}), retrying in {Delay}ms: {Error}",
                    operationName, attempt, maxRetries + 1, delay, ex.Message);

                await Task.Delay(delay, cancellationToken).ConfigureAwait(false);
            }
        }

        throw new InvalidOperationException("Retry failed without exception");
    }

    /// <summary>
    /// Runs an operation that returns no value, retrying as <see cref="ExecuteWithRetryAsync{T}"/> does.
    /// </summary>
    /// <param name="operation">The work to run. It receives the cancellation token.</param>
    /// <param name="maxRetries">How many times to retry after the first attempt. 0 runs the operation once.</param>
    /// <param name="logger">The logger for retry warnings and the final error.</param>
    /// <param name="operationName">The name of the operation, used in log lines.</param>
    /// <param name="cancellationToken">The cancellation token. Cancelling it stops the operation and the waits, and the cancellation propagates.</param>
    /// <returns>A task that completes when the operation succeeds.</returns>
    public static async Task ExecuteWithRetryAsync(
        Func<CancellationToken, Task> operation,
        int maxRetries,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        await ExecuteWithRetryAsync(
            async ct =>
            {
                await operation(ct).ConfigureAwait(false);
                return true;
            },
            maxRetries,
            logger,
            operationName,
            cancellationToken).ConfigureAwait(false);
    }

    private static int CalculateDelay(int attempt)
    {
        // The exponent is clamped so the delay cannot overflow an int.
        var clampedExponent = Math.Min(attempt - 1, 20);
        var exponentialDelay = (int)(BaseDelayMs * Math.Pow(2, clampedExponent));
        var cappedDelay = Math.Min(exponentialDelay, MaxDelayMs);

        // Jitter of up to a quarter of the delay spreads out callers that fail together.
        var jitter = Random.Shared.Next(-(cappedDelay / 4), cappedDelay / 4);
        return cappedDelay + jitter;
    }

    private static bool IsTransientException(Exception ex)
    {
        if (ex is HttpRequestException httpEx)
        {
            if (httpEx.StatusCode.HasValue)
            {
                return IsTransientStatusCode(httpEx.StatusCode.Value);
            }

            return true;
        }

        if (ex is TaskCanceledException taskCanceledEx && taskCanceledEx.InnerException is TimeoutException)
        {
            return true;
        }

        // A plain I/O error is transient, but a missing file or folder or a path that is too long never fixes itself.
        if (ex is System.IO.IOException
            and not System.IO.FileNotFoundException
            and not System.IO.DirectoryNotFoundException
            and not System.IO.PathTooLongException
            and not System.IO.DriveNotFoundException)
        {
            return true;
        }

        if (ex is System.Net.Sockets.SocketException)
        {
            return true;
        }

        if (ex.InnerException != null)
        {
            return IsTransientException(ex.InnerException);
        }

        return false;
    }

    private static bool IsTransientStatusCode(HttpStatusCode statusCode)
    {
        return statusCode switch
        {
            HttpStatusCode.RequestTimeout => true,
            HttpStatusCode.TooManyRequests => true,
            HttpStatusCode.InternalServerError => true,
            HttpStatusCode.BadGateway => true,
            HttpStatusCode.ServiceUnavailable => true,
            HttpStatusCode.GatewayTimeout => true,
            _ => false
        };
    }
}
