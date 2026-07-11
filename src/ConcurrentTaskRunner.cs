using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Runs a worker over a collection with a bounded degree of parallelism and reports 0-100 progress as items
/// finish. Wraps the SemaphoreSlim-plus-Interlocked pattern that plugin scheduled tasks otherwise reimplement,
/// so a task body reduces to "for each item, do the work".
/// </summary>
public static class ConcurrentTaskRunner
{
    /// <summary>
    /// Processes each item with <paramref name="worker"/>, at most <paramref name="maxParallelism"/> at once,
    /// reporting progress on the 0-100 scale Jellyfin scheduled tasks expect. Completes when every item has
    /// finished; the first faulted worker cancels the rest and the exception propagates.
    /// </summary>
    /// <typeparam name="T">The item type.</typeparam>
    /// <param name="items">The items to process. Materialised once up front so progress totals are exact.</param>
    /// <param name="worker">The per-item work.</param>
    /// <param name="maxParallelism">Maximum concurrent workers (values below 1 are treated as 1).</param>
    /// <param name="progress">Optional 0-100 progress sink, advanced after each item completes.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task that completes when all items are processed.</returns>
    public static async Task RunAsync<T>(
        IEnumerable<T> items,
        Func<T, CancellationToken, Task> worker,
        int maxParallelism = 4,
        IProgress<double>? progress = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(items);
        ArgumentNullException.ThrowIfNull(worker);

        var list = items as IReadOnlyList<T> ?? new List<T>(items);
        var total = list.Count;
        if (total == 0)
        {
            progress?.Report(100);
            return;
        }

        var options = new ParallelOptions
        {
            MaxDegreeOfParallelism = Math.Max(1, maxParallelism),
            CancellationToken = cancellationToken
        };

        var completed = 0;
        await Parallel.ForEachAsync(list, options, async (item, ct) =>
        {
            await worker(item, ct).ConfigureAwait(false);
            var done = Interlocked.Increment(ref completed);
            progress?.Report(done * 100.0 / total);
        }).ConfigureAwait(false);
    }
}
