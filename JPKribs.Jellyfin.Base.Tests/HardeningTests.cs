using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Net;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests for the hardening pass: HTTP cancellation, body cap and credentials; the shared Data Protection
/// provider; transactional schema changes; generic circuit breaker text; the fixed file name set; durable JSON
/// saves; and shared asset resolution.
/// </summary>
public sealed class HardeningTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "jpk-hardening-" + Guid.NewGuid().ToString("N"));

    public HardeningTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    // MARK: JpkHttp

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _send;

        public StubHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) => _send = send;

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return _send(request, cancellationToken);
        }
    }

    // A body that hands over its first bytes and then never finishes, until cancelled.
    private sealed class StallingStream : Stream
    {
        private bool _sent;

        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            if (!_sent)
            {
                _sent = true;
                buffer.Span[0] = (byte)'x';
                return 1;
            }

            await Task.Delay(Timeout.Infinite, cancellationToken).ConfigureAwait(false);
            return 0;
        }

        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
            => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    private static IHttpClientFactory Factory(StubHandler handler, TimeSpan? timeout = null)
    {
        var client = new HttpClient(handler);
        if (timeout is { } t)
        {
            client.Timeout = t;
        }

        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(NamedClient.Default).Returns(client);
        return factory;
    }

    private static Task<HttpResponseMessage> Respond(HttpContent content)
        => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content });

    /// <summary>
    /// Cancelling the caller's token throws instead of reporting a timeout.
    /// True: a shutdown stops the caller's work. False: a cancelled caller carried on as if the server timed out.
    /// </summary>
    [Fact]
    public async Task SendAsync_CallerCancellationThrows()
    {
        var handler = new StubHandler(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct).ConfigureAwait(false);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, "http://example.test/", cts.Token));
    }

    /// <summary>
    /// The client's own timeout, before or after the headers, is still reported as status zero.
    /// True: a slow server never throws out of the helper. False: a stalled body would hang or throw.
    /// </summary>
    [Fact]
    public async Task SendAsync_TimeoutIsReportedNotThrown()
    {
        var slowHeaders = new StubHandler(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct).ConfigureAwait(false);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var result = await JpkHttp.SendAsync(Factory(slowHeaders, TimeSpan.FromMilliseconds(100)), HttpMethod.Get, "http://example.test/", CancellationToken.None);
        Assert.Equal(0, result.Status);
        Assert.Equal("request timed out", result.Body);

        var stalledBody = new StubHandler((_, _) => Respond(new StreamContent(new StallingStream())));
        result = await JpkHttp.SendAsync(Factory(stalledBody, TimeSpan.FromMilliseconds(200)), HttpMethod.Get, "http://example.test/", CancellationToken.None);
        Assert.Equal(0, result.Status);
        Assert.Equal("request timed out", result.Body);
    }

    /// <summary>
    /// A body past the cap is not read, whether or not the server sent a length, and a body within it is.
    /// True: a misbehaving server cannot make the plugin buffer an unbounded body. False: any size was read into memory.
    /// </summary>
    [Fact]
    public async Task SendAsync_CapsTheResponseBody()
    {
        var withLength = new StubHandler((_, _) => Respond(new StringContent(new string('a', 100))));
        var result = await JpkHttp.SendAsync(Factory(withLength), HttpMethod.Get, "http://example.test/", CancellationToken.None, maxResponseBytes: 10);
        Assert.Equal(0, result.Status);
        Assert.Contains("exceeds 10 bytes", result.Body, StringComparison.Ordinal);

        // No Content-Length: the stream is cut off while buffering.
        var chunked = new StubHandler((_, _) => Respond(new StreamContent(new NonSeekableStream(new byte[100]))));
        result = await JpkHttp.SendAsync(Factory(chunked), HttpMethod.Get, "http://example.test/", CancellationToken.None, maxResponseBytes: 10);
        Assert.Equal(0, result.Status);

        var small = new StubHandler((_, _) => Respond(new StringContent("good 1.2.3.4")));
        result = await JpkHttp.SendAsync(Factory(small), HttpMethod.Get, "http://example.test/", CancellationToken.None);
        Assert.Equal(200, result.Status);
        Assert.Equal("good 1.2.3.4", result.Body);
        Assert.Equal(4L * 1024 * 1024, JpkHttp.DefaultMaxResponseBytes);

        // A cap past what a buffer can hold is the same as no cap.
        result = await JpkHttp.SendAsync(Factory(small), HttpMethod.Get, "http://example.test/", CancellationToken.None, maxResponseBytes: long.MaxValue);
        Assert.Equal(200, result.Status);
    }

    private sealed class NonSeekableStream : MemoryStream
    {
        public NonSeekableStream(byte[] data)
            : base(data)
        {
        }

        public override bool CanSeek => false;
    }

    /// <summary>
    /// Basic auth credentials are encoded as UTF-8.
    /// True: a password with non-ASCII characters reaches the server intact. False: each such character became '?'.
    /// </summary>
    [Fact]
    public async Task SendAsync_BasicAuthIsUtf8()
    {
        var handler = new StubHandler((_, _) => Respond(new StringContent("ok")));
        await JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, "http://example.test/", CancellationToken.None, login: "jörg", password: "pässwörd€");

        var auth = handler.LastRequest!.Headers.Authorization!;
        Assert.Equal("Basic", auth.Scheme);
        Assert.Equal("jörg:pässwörd€", Encoding.UTF8.GetString(Convert.FromBase64String(auth.Parameter!)));
    }

    // MARK: StableSecretProtection

    /// <summary>
    /// Callers racing on the first build of a key folder all get the one provider, and its secrets round trip.
    /// True: the plugin class and DI share one key ring. False: a second container would be built and leaked.
    /// </summary>
    [Fact]
    public void Build_ConcurrentCallersShareOneProvider()
    {
        var keys = Path.Combine(_dir, "Race.Keys");
        using var start = new ManualResetEventSlim();
        var results = new ConcurrentBag<object?>();
        var threads = Enumerable.Range(0, 16).Select(_ => new Thread(() =>
        {
            start.Wait();
            results.Add(StableSecretProtection.Build(keys, "Test.Plugin.Race", NullLogger.Instance));
        })).ToList();
        threads.ForEach(t => t.Start());
        start.Set();
        threads.ForEach(t => t.Join());

        var first = results.First();
        Assert.NotNull(first);
        Assert.All(results, r => Assert.Same(first, r));
    }

    /// <summary>
    /// A key ring already on disk keeps decrypting what was stored with it, after the provider is rebuilt.
    /// True: existing encrypted secrets survive the upgrade. False: every stored secret would read back empty.
    /// </summary>
    [Fact]
    public void Build_ExistingKeyRingStillDecrypts()
    {
        var paths = Substitute.For<IApplicationPaths>();
        paths.PluginConfigurationsPath.Returns(_dir);
        var stored = StableSecretProtection.CreateProtector(paths, "Test.Plugin.Existing", NullLogger.Instance).Protect("hunter2");

        // A fresh container over the same folder, as after a restart, reads the key written above.
        var services = new ServiceCollection();
        services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(StableSecretProtection.KeyDirectory(paths, "Test.Plugin.Existing")))
            .SetApplicationName("Test.Plugin.Existing");
        using var container = services.BuildServiceProvider();
        var provider = container.GetRequiredService<IDataProtectionProvider>();

        Assert.Equal("hunter2", new SecretProtector("Test.Plugin.Existing.Secrets.v1", NullLogger.Instance, provider).Unprotect(stored));
    }

    // MARK: DatabaseSchema transactions

    private SqliteConnection OpenDb()
    {
        var connection = new SqliteConnection("Data Source=" + Path.Combine(_dir, "schema.db"));
        connection.Open();
        return connection;
    }

    private static void Exec(DbConnection c, string sql)
    {
        using var command = c.CreateCommand();
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }

    private static bool TableExists(DbConnection c, string name)
    {
        using var command = c.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '" + name + "'";
        return Convert.ToInt32(command.ExecuteScalar(), System.Globalization.CultureInfo.InvariantCulture) > 0;
    }

    /// <summary>
    /// A transactional create that throws part way leaves the database empty and unstamped.
    /// True: the next start creates the schema cleanly. False: half a schema would be left behind.
    /// </summary>
    [Fact]
    public void Open_TransactionalCreateRollsBackOnFailure()
    {
        using var connection = OpenDb();
        Assert.Throws<InvalidOperationException>(() => DatabaseSchema.Open(
            connection,
            5,
            5,
            c =>
            {
                Exec(c, "CREATE TABLE Items (Id INTEGER PRIMARY KEY)");
                throw new InvalidOperationException("crash mid create");
            },
            (_, _) => true,
            transactional: true));

        Assert.False(TableExists(connection, "Items"));
        Assert.Equal(0, DatabaseSchema.GetVersion(connection));

        Assert.Equal(SchemaAction.Created, DatabaseSchema.Open(connection, 5, 5, c => Exec(c, "CREATE TABLE Items (Id INTEGER PRIMARY KEY)"), (_, _) => true, transactional: true));
        Assert.True(TableExists(connection, "Items"));
        Assert.Equal(5, DatabaseSchema.GetVersion(connection));
    }

    /// <summary>
    /// A transactional migration that reports failure has its changes rolled back.
    /// True: MigrationFailed means nothing was written. False: a half migrated file is left for the caller to set aside.
    /// </summary>
    [Fact]
    public void Open_TransactionalMigrationFailureRollsBack()
    {
        using var connection = OpenDb();
        Exec(connection, "CREATE TABLE Items (Id INTEGER PRIMARY KEY)");
        DatabaseSchema.SetVersion(connection, 2);

        var action = DatabaseSchema.Open(
            connection,
            5,
            5,
            _ => { },
            (c, _) =>
            {
                Exec(c, "ALTER TABLE Items ADD COLUMN Name TEXT");
                return false;
            },
            transactional: true);

        Assert.Equal(SchemaAction.MigrationFailed, action);
        Assert.Equal(2, DatabaseSchema.GetVersion(connection));
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Items') WHERE name = 'Name'";
        Assert.Equal(0L, command.ExecuteScalar());
    }

    /// <summary>
    /// Without the flag, callbacks that open their own transactions keep working, as the plugins' migrations do.
    /// True: existing callers are unaffected. False: a nested BEGIN would fail every migration.
    /// </summary>
    [Fact]
    public void Open_DefaultLeavesCallbackTransactionsAlone()
    {
        using var connection = OpenDb();
        DatabaseSchema.SetVersion(connection, 2);

        var action = DatabaseSchema.Open(connection, 5, 5, _ => { }, (c, _) =>
        {
            using var transaction = ((SqliteConnection)c).BeginTransaction();
            using var command = ((SqliteConnection)c).CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "CREATE TABLE Items (Id INTEGER PRIMARY KEY)";
            command.ExecuteNonQuery();
            transaction.Commit();
            return true;
        });

        Assert.Equal(SchemaAction.Migrated, action);
        Assert.True(TableExists(connection, "Items"));
        Assert.Equal(5, DatabaseSchema.GetVersion(connection));
    }

    // MARK: CircuitBreaker

    private sealed class ListLogger : ILogger
    {
        public List<string> Messages { get; } = new();

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Messages.Add(formatter(state, exception));
    }

    /// <summary>
    /// The open circuit message names no particular plugin feature.
    /// True: every plugin's log reads correctly. False: a non-sync plugin logged that "sync operations" paused.
    /// </summary>
    [Fact]
    public void CircuitBreaker_OpenMessageIsGeneric()
    {
        var logger = new ListLogger();
        var breaker = new CircuitBreaker(logger, "provider", failureThreshold: 1);
        breaker.RecordFailure("boom");

        var message = Assert.Single(logger.Messages, m => m.Contains("OPEN", StringComparison.Ordinal));
        Assert.DoesNotContain("Sync", message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("provider", message, StringComparison.Ordinal);
    }

    // MARK: FileNameSanitizer

    /// <summary>
    /// Both path separators and the Windows-reserved characters are replaced on every OS.
    /// True: a name made on Linux stays valid on Windows. False: a backslash survived on Linux and macOS.
    /// </summary>
    [Theory]
    [InlineData("a\\b.mkv", "a_b.mkv")]
    [InlineData("a/b.mkv", "a_b.mkv")]
    [InlineData("C:\\Movies\\Film.mkv", "C_Movies_Film.mkv")]
    [InlineData("<a>|\"b\"?*.txt", "_a_b_.txt")]
    [InlineData("tab\there", "tab_here")]
    [InlineData("plain name.mp3", "plain name.mp3")]
    public void Sanitize_ReplacesTheFixedSetOnEveryOs(string input, string expected)
        => Assert.Equal(expected, FileNameSanitizer.Sanitize(input));

    // MARK: JsonFileStore

    public sealed class Counter
    {
        public int Count { get; set; }
    }

    /// <summary>
    /// A save does not depend on a fixed temp name, and leaves no temp file behind.
    /// True: a leftover or concurrent "file.tmp" cannot block or corrupt a save. False: the shared temp name collided.
    /// </summary>
    [Fact]
    public void Save_UsesAUniqueTempFile()
    {
        var path = Path.Combine(_dir, "state.json");

        // Something already holds the old fixed temp name.
        Directory.CreateDirectory(path + ".tmp");

        var store = new JsonFileStore<Counter>(path, NullLogger.Instance);
        store.Save(new Counter { Count = 3 });

        Assert.Equal(3, store.Load().Count);
        Assert.Empty(Directory.GetFiles(_dir, "state.json.*.tmp"));
    }

    /// <summary>
    /// Two stores writing one file at once never fail and always leave a complete document.
    /// True: concurrent writers each swap in a whole file. False: they shared and clobbered one temp file.
    /// </summary>
    [Fact]
    public void Save_ConcurrentStoresLeaveAWholeFile()
    {
        var path = Path.Combine(_dir, "shared.json");
        var stores = Enumerable.Range(0, 4).Select(_ => new JsonFileStore<Counter>(path, NullLogger.Instance)).ToList();
        var errors = new ConcurrentBag<Exception>();

        Parallel.For(0, 200, i =>
        {
            try
            {
                stores[i % stores.Count].Save(new Counter { Count = i });
            }
            catch (IOException ex)
            {
                // Windows can refuse a rename onto a file another writer is replacing; that is not corruption.
                if (OperatingSystem.IsWindows())
                {
                    return;
                }

                errors.Add(ex);
            }
        });

        Assert.Empty(errors);
        Assert.InRange(new JsonFileStore<Counter>(path).Load().Count, 0, 199);
        Assert.Empty(Directory.GetFiles(_dir, "shared.json.*.tmp"));
    }

    // MARK: PluginBase.GetSharedPages

    private sealed class AssetPlugin : PluginBase<AssetPlugin, SharedHelpersTests.TestConfiguration>
    {
        public AssetPlugin(IApplicationPaths paths, IXmlSerializer xml)
            : base(paths, xml)
        {
        }

        public override Guid Id => Guid.Parse("0f7e4a3b-2c1d-4e5f-8a9b-0c1d2e3f4a5b");

        public override string Name => "Assets";

        public override IEnumerable<PluginPageInfo> GetPages() => Array.Empty<PluginPageInfo>();

        public IEnumerable<PluginPageInfo> Shared(string prefix) => GetSharedPages(prefix);
    }

    /// <summary>
    /// The shared asset pages point at the resources the targets file embedded, even when the plugin class's
    /// namespace differs from the project's root namespace.
    /// True: Jellyfin serves the shared CSS and JS. False: the pages pointed at resources that do not exist.
    /// </summary>
    [Fact]
    public void GetSharedPages_FindsAssetsEmbeddedUnderAnotherRootNamespace()
    {
        var paths = Substitute.For<IApplicationPaths>();
        paths.PluginConfigurationsPath.Returns(_dir);
        var xml = Substitute.For<IXmlSerializer>();
        xml.DeserializeFromFile(Arg.Any<Type>(), Arg.Any<string>()).Returns(new SharedHelpersTests.TestConfiguration());
        var plugin = new AssetPlugin(paths, xml);

        var pages = plugin.Shared("x").ToList();
        Assert.Equal(new[] { "x_jpkribs_shared.css", "x_jpkribs_shared.js" }, pages.Select(p => p.Name));

        var assembly = typeof(AssetPlugin).Assembly;
        foreach (var page in pages)
        {
            Assert.StartsWith("Other.Root.Namespace.Configuration.", page.EmbeddedResourcePath, StringComparison.Ordinal);
            using var stream = assembly.GetManifestResourceStream(page.EmbeddedResourcePath);
            Assert.NotNull(stream);
        }
    }

    /// <summary>
    /// The plugin class's own namespace wins when the asset is embedded there, and nothing found keeps the old name.
    /// True: plugins whose namespace is the root namespace resolve exactly as before.
    /// False: a lookup could pick another assembly resource or return nothing.
    /// </summary>
    [Fact]
    public void ResolveResourceName_PrefersThePluginNamespace()
    {
        var assembly = typeof(AssetPlugin).Assembly;
        Assert.Equal("Other.Root.Namespace.Configuration.jpkribs_shared.css", SharedAssets.ResolveResourceName(assembly, "Other.Root.Namespace", "jpkribs_shared.css"));
        Assert.Equal("Other.Root.Namespace.Configuration.jpkribs_shared.css", SharedAssets.ResolveResourceName(assembly, "Unrelated", "jpkribs_shared.css"));
        Assert.Equal("Unrelated.Configuration.missing.css", SharedAssets.ResolveResourceName(assembly, "Unrelated", "missing.css"));
    }
}
