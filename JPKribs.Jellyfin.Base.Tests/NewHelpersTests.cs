using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using JPKribs.Jellyfin.Base;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for the helpers promoted from the consuming plugins (backoff, concurrency, file store, escaping, secrets).</summary>
public class NewHelpersTests
{
    // MARK: StringUtilities.EscapeJsString

    [Fact]
    public void EscapeJsString_NeutralisesQuotesAndScriptBreakout()
    {
        var escaped = StringUtilities.EscapeJsString("</script>\"'\\\r\n");
        Assert.DoesNotContain("</script>", escaped, StringComparison.Ordinal);
        Assert.DoesNotContain("\r", escaped, StringComparison.Ordinal);
        Assert.DoesNotContain("\n", escaped, StringComparison.Ordinal);
        Assert.Contains("\\x3C", escaped, StringComparison.Ordinal); // '<'
        Assert.Contains("\\\"", escaped, StringComparison.Ordinal);
        Assert.Contains("\\'", escaped, StringComparison.Ordinal);
        Assert.Contains("\\r", escaped, StringComparison.Ordinal);
        Assert.Contains("\\n", escaped, StringComparison.Ordinal);
    }

    [Fact]
    public void EscapeJsString_EscapesLineSeparators()
    {
        var escaped = StringUtilities.EscapeJsString("a\u2028b\u2029c");
        Assert.Equal("a\\u2028b\\u2029c", escaped);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void EscapeJsString_EmptyInputReturnsEmpty(string? input)
        => Assert.Equal(string.Empty, StringUtilities.EscapeJsString(input));

    // MARK: BackoffPolicy

    [Fact]
    public void BackoffPolicy_BelowThreshold_CountsButDoesNotPause()
    {
        var policy = new BackoffPolicy(failureThreshold: 3);
        var now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var s1 = policy.RecordFailure(BackoffState.Initial, now);
        var s2 = policy.RecordFailure(s1, now);

        Assert.Equal(2, s2.ConsecutiveFailures);
        Assert.Null(s2.BackoffUntilUtc);
        Assert.False(policy.IsBackingOff(s2, now));
    }

    [Fact]
    public void BackoffPolicy_AtThreshold_PausesForBaseDelay()
    {
        var policy = new BackoffPolicy(failureThreshold: 2, baseDelay: TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromHours(1));
        var now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var s1 = policy.RecordFailure(BackoffState.Initial, now);
        var s2 = policy.RecordFailure(s1, now);

        Assert.Equal(now.AddMinutes(5), s2.BackoffUntilUtc);
        Assert.True(policy.IsBackingOff(s2, now.AddMinutes(4)));
        Assert.False(policy.IsBackingOff(s2, now.AddMinutes(6)));
    }

    [Fact]
    public void BackoffPolicy_EscalatesExponentiallyAndCaps()
    {
        var policy = new BackoffPolicy(failureThreshold: 1, baseDelay: TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromMinutes(30));
        var now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var s1 = policy.RecordFailure(BackoffState.Initial, now); // step 0 -> 5m
        Assert.Equal(now.AddMinutes(5), s1.BackoffUntilUtc);

        var s2 = policy.RecordFailure(s1, now); // step 1 -> 10m
        Assert.Equal(now.AddMinutes(10), s2.BackoffUntilUtc);

        var s3 = policy.RecordFailure(s2, now); // step 2 -> 20m
        Assert.Equal(now.AddMinutes(20), s3.BackoffUntilUtc);

        var s4 = policy.RecordFailure(s3, now); // step 3 -> 40m, capped to 30m
        Assert.Equal(now.AddMinutes(30), s4.BackoffUntilUtc);
    }

    [Fact]
    public void BackoffPolicy_Success_Resets()
    {
        var policy = new BackoffPolicy();
        var reset = policy.RecordSuccess();
        Assert.Equal(0, reset.ConsecutiveFailures);
        Assert.Null(reset.BackoffUntilUtc);
    }

    // MARK: ConcurrentTaskRunner

    [Fact]
    public async Task ConcurrentTaskRunner_RunsEveryItem_AndReportsCompletion()
    {
        var seen = new ConcurrentBag<int>();

        await ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 50),
            (i, ct) => { seen.Add(i); return Task.CompletedTask; },
            maxParallelism: 8);

        Assert.Equal(50, seen.Distinct().Count());
    }

    [Fact]
    public async Task ConcurrentTaskRunner_RespectsMaxParallelism()
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

    [Fact]
    public async Task ConcurrentTaskRunner_EmptyInput_ReportsHundred()
    {
        // Progress<T> posts asynchronously; report through a synchronous sink instead for determinism.
        var sink = new ImmediateProgress();
        await ConcurrentTaskRunner.RunAsync(Array.Empty<int>(), (i, ct) => Task.CompletedTask, progress: sink);
        Assert.Equal(100, sink.Last);
    }

    [Fact]
    public async Task ConcurrentTaskRunner_PropagatesWorkerException()
    {
        await Assert.ThrowsAnyAsync<Exception>(() => ConcurrentTaskRunner.RunAsync(
            Enumerable.Range(0, 10),
            (i, ct) => i == 5 ? throw new InvalidOperationException("boom") : Task.CompletedTask,
            maxParallelism: 2));
    }

    private sealed class ImmediateProgress : IProgress<double>
    {
        public double Last { get; private set; } = -1;

        public void Report(double value) => Last = value;
    }

    // MARK: JsonFileStore

    private sealed class Counter
    {
        public int Value { get; set; }

        public List<string> Names { get; set; } = new();
    }

    [Fact]
    public void JsonFileStore_MissingFile_ReturnsFresh()
    {
        var path = Path.Combine(Path.GetTempPath(), "jpk-store-" + Guid.NewGuid().ToString("N") + ".json");
        var store = new JsonFileStore<Counter>(path);
        var value = store.Load();
        Assert.Equal(0, value.Value);
        Assert.Empty(value.Names);
    }

    [Fact]
    public void JsonFileStore_SaveThenLoad_RoundTrips()
    {
        var path = Path.Combine(Path.GetTempPath(), "jpk-store-" + Guid.NewGuid().ToString("N") + ".json");
        try
        {
            var store = new JsonFileStore<Counter>(path);
            store.Save(new Counter { Value = 7, Names = { "a", "b" } });

            var reloaded = new JsonFileStore<Counter>(path).Load();
            Assert.Equal(7, reloaded.Value);
            Assert.Equal(new[] { "a", "b" }, reloaded.Names);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void JsonFileStore_CorruptFile_ReturnsFresh()
    {
        var path = Path.Combine(Path.GetTempPath(), "jpk-store-" + Guid.NewGuid().ToString("N") + ".json");
        try
        {
            File.WriteAllText(path, "{ this is not valid json ");
            var value = new JsonFileStore<Counter>(path).Load();
            Assert.Equal(0, value.Value);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void JsonFileStore_Update_IsReadModifyWrite()
    {
        var path = Path.Combine(Path.GetTempPath(), "jpk-store-" + Guid.NewGuid().ToString("N") + ".json");
        try
        {
            var store = new JsonFileStore<Counter>(path);
            store.Update(c => c.Value = 1);
            store.Update(c => c.Value += 4);
            Assert.Equal(5, store.Load().Value);
        }
        finally
        {
            File.Delete(path);
        }
    }

    // MARK: SecretProtector round-trip (no data-protection provider => Protect is a plaintext no-op)

    [Fact]
    public void SecretProtector_ResolveIncoming_KeepsStoredOnSentinel()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);
        var kept = protector.ResolveIncoming(SecretProtector.KeptSentinel, "enc:v1:existing");
        Assert.Equal("enc:v1:existing", kept);
    }

    [Fact]
    public void SecretProtector_ResolveIncoming_ReplacesWithNewValue()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);
        var replaced = protector.ResolveIncoming("brand-new", "enc:v1:existing");
        Assert.Equal("brand-new", replaced); // no provider => stored as plaintext
    }

    [Fact]
    public void SecretProtector_ResolveIncoming_EmptyClears()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);
        Assert.Equal(string.Empty, protector.ResolveIncoming(string.Empty, "enc:v1:existing"));
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("enc:v1:x", true)]
    public void SecretProtector_HasSecret(string? stored, bool expected)
        => Assert.Equal(expected, SecretProtector.HasSecret(stored));
}
