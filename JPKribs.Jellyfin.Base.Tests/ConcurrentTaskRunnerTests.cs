using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ConcurrentTaskRunner"/> runs every item within the parallelism limit and reports progress.</summary>
public class ConcurrentTaskRunnerTests
{
    private sealed class ImmediateProgress : IProgress<double>
    {
        private readonly List<double> _values = new();

        public double Last { get; private set; } = -1;

        public IReadOnlyList<double> Values => _values;

        public void Report(double value)
        {
            Last = value;
            _values.Add(value);
        }
    }

    /// <summary>
    /// Every item is processed exactly once.
    /// True: a task body sees each item.
    /// False: an item would be skipped or processed twice.
    /// </summary>
    [Fact]
    public async Task RunAsync_RunsEveryItem()
    {
        var seen = new ConcurrentBag<int>();

        await ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 50),
            (i, ct) => { seen.Add(i); return Task.CompletedTask; },
            maxParallelism: 8);

        Assert.Equal(50, seen.Distinct().Count());
        Assert.Equal(50, seen.Count);
    }

    /// <summary>
    /// No more workers run at once than the limit allows.
    /// True: a task that talks to a rate limited service stays within its limit.
    /// False: the limit would be ignored.
    /// </summary>
    [Fact]
    public async Task RunAsync_RespectsMaxParallelism()
    {
        var current = 0;
        var peak = 0;
        var gate = new object();

        await ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 40),
            async (i, ct) =>
            {
                lock (gate) { current++; peak = Math.Max(peak, current); }
                await Task.Delay(5, ct);
                lock (gate) { current--; }
            },
            maxParallelism: 3);

        Assert.True(peak <= 3, $"peak concurrency was {peak}, expected <= 3");
    }

    /// <summary>
    /// The runner really runs workers side by side, up to the limit.
    /// True: three workers are inside the body at once, which each waits for before it finishes.
    /// False: a runner that serializes every item would never reach three and the run would time out.
    /// </summary>
    [Fact]
    public async Task RunAsync_RunsWorkersConcurrently()
    {
        var current = 0;
        var peak = 0;
        var allInside = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        await ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 6),
            async (i, ct) =>
            {
                var now = Interlocked.Increment(ref current);
                InterlockedMax(ref peak, now);
                if (now >= 3)
                {
                    allInside.TrySetResult();
                }

                await allInside.Task.WaitAsync(TimeSpan.FromSeconds(30), ct);
                Interlocked.Decrement(ref current);
            },
            maxParallelism: 3);

        Assert.Equal(3, peak);
    }

    private static void InterlockedMax(ref int target, int value)
    {
        int seen;
        while (value > (seen = Volatile.Read(ref target)))
        {
            if (Interlocked.CompareExchange(ref target, value, seen) == seen)
            {
                return;
            }
        }
    }

    /// <summary>
    /// An empty collection reports 100 and runs nothing.
    /// True: a task with no work still finishes its progress bar.
    /// False: progress would stay at zero.
    /// </summary>
    [Fact]
    public async Task RunAsync_EmptyInput_ReportsHundred()
    {
        var sink = new ImmediateProgress();

        await ConcurrentTaskRunner.RunAsync(Array.Empty<int>(), (i, ct) => Task.CompletedTask, progress: sink);

        Assert.Equal(100, sink.Last);
    }

    /// <summary>
    /// A faulted worker stops the run and its exception propagates.
    /// True: a failure is not hidden.
    /// False: the run would finish as if every item had succeeded.
    /// </summary>
    [Fact]
    public async Task RunAsync_PropagatesWorkerException()
    {
        await Assert.ThrowsAnyAsync<Exception>(() => ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 10),
            (i, ct) => i == 5 ? throw new InvalidOperationException("boom") : Task.CompletedTask,
            maxParallelism: 2));
    }

    /// <summary>
    /// With one worker, progress climbs by an equal step per item and ends at 100.
    /// True: the progress bar moves evenly and finishes.
    /// False: progress would skip, repeat, or stop short.
    /// </summary>
    [Fact]
    public async Task RunAsync_ReportsProgressAfterEachItem()
    {
        var sink = new ImmediateProgress();

        await ConcurrentTaskRunner.RunAsync(new[] { 1, 2, 3, 4 }, (i, ct) => Task.CompletedTask, maxParallelism: 1, progress: sink);

        Assert.Equal(new[] { 25.0, 50.0, 75.0, 100.0 }, sink.Values);
    }

    /// <summary>
    /// A parallelism below one runs the items one at a time.
    /// True: a bad setting still finishes the work.
    /// False: no item would run.
    /// </summary>
    [Fact]
    public async Task RunAsync_ParallelismBelowOne_CountsAsOne()
    {
        var current = 0;
        var peak = 0;
        var done = 0;

        await ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 6),
            async (i, ct) =>
            {
                peak = Math.Max(peak, Interlocked.Increment(ref current));
                await Task.Yield();
                Interlocked.Decrement(ref current);
                Interlocked.Increment(ref done);
            },
            maxParallelism: 0);

        Assert.Equal(6, done);
        Assert.Equal(1, peak);
    }

    /// <summary>
    /// A missing collection or worker is rejected.
    /// True: a misuse fails at once.
    /// False: it would fail inside the run.
    /// </summary>
    [Fact]
    public async Task RunAsync_RejectsNullArguments()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => ConcurrentTaskRunner.RunAsync<int>(null!, (i, ct) => Task.CompletedTask));
        await Assert.ThrowsAsync<ArgumentNullException>(() => ConcurrentTaskRunner.RunAsync(new[] { 1 }, null!));
    }
}
