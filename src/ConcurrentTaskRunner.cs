using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Runs a worker over a collection with a bounded degree of parallelism and reports 0 to 100 progress as items finish.
/// A scheduled task body then reduces to "for each item, do the work".
/// </summary>
public static class ConcurrentTaskRunner
{
    /// <summary>
    /// Processes each item with <paramref name="worker"/>, at most <paramref name="maxParallelism"/> at once,
    /// and reports progress on the 0 to 100 scale Jellyfin scheduled tasks expect.
    /// </summary>
    /// <remarks>
    /// It completes when every item has finished. The first faulted worker cancels the rest and its exception propagates.
    /// An empty collection reports 100. Progress values can reach the sink out of order, since workers report as they finish.
    /// </remarks>
    /// <typeparam name="T">The item type.</typeparam>
    /// <param name="items">The items to process. A collection that is not a list is copied first, so the progress total is exact.</param>
    /// <param name="worker">The per-item work.</param>
    /// <param name="maxParallelism">The most workers that run at once. A value below 1 counts as 1. 4 by default.</param>
    /// <param name="progress">An optional sink for 0 to 100 progress, reported after each item completes.</param>
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
