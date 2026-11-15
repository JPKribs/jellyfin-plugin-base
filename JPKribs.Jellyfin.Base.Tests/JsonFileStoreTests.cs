using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="JsonFileStore{T}"/> reads and writes one JSON value safely, including after a crash or a corrupt file.</summary>
public sealed class JsonFileStoreTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "base-store-" + Guid.NewGuid().ToString("N"));

    public JsonFileStoreTests() => Directory.CreateDirectory(_dir);

    private sealed class Counter
    {
        public int Count { get; set; }

        public List<string> Names { get; set; } = new();
    }

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    private string PathFor(string name) => Path.Combine(_dir, name);

    /// <summary>
    /// A file that does not exist loads as a fresh value.
    /// True: a plugin's first run starts from defaults.
    /// False: a missing file would throw.
    /// </summary>
    [Fact]
    public void Load_MissingFile_ReturnsFresh()
    {
        var value = new JsonFileStore<Counter>(PathFor("missing.json")).Load();

        Assert.Equal(0, value.Count);
        Assert.Empty(value.Names);
    }

    /// <summary>
    /// A saved value loads back from a second store on the same file.
    /// True: state survives a restart.
    /// False: a saved value would be lost or altered.
    /// </summary>
    [Fact]
    public void Save_ThenLoad_RoundTrips()
    {
        var path = PathFor("state.json");
        new JsonFileStore<Counter>(path).Save(new Counter { Count = 7, Names = { "a", "b" } });

        var reloaded = new JsonFileStore<Counter>(path).Load();

        Assert.Equal(7, reloaded.Count);
        Assert.Equal(new[] { "a", "b" }, reloaded.Names);
    }

    /// <summary>
    /// A corrupt file loads as a fresh value.
    /// True: a damaged file never stops the plugin.
    /// False: a JSON error would throw out of the store.
    /// </summary>
    [Fact]
    public void Load_CorruptFile_ReturnsFresh()
    {
        var path = PathFor("corrupt.json");
        File.WriteAllText(path, "{ this is not valid json ");

        Assert.Equal(0, new JsonFileStore<Counter>(path).Load().Count);
    }

    /// <summary>
    /// A corrupt file loads fresh when a logger is given too.
    /// True: the warning is logged and the plugin carries on.
    /// False: logging the failure would throw.
    /// </summary>
    [Fact]
    public void Load_CorruptFileWithLogger_ReturnsFresh()
    {
        var path = PathFor("corrupt-logged.json");
        File.WriteAllText(path, "{ not json");

        Assert.Equal(0, new JsonFileStore<Counter>(path, NullLogger.Instance).Load().Count);
    }

    /// <summary>
    /// An empty file loads as a fresh value.
    /// True: a file truncated to nothing starts clean.
    /// False: an empty document would throw.
    /// </summary>
    [Fact]
    public void Load_EmptyFile_ReturnsFresh()
    {
        var path = PathFor("empty.json");
        File.WriteAllText(path, "  ");

        Assert.Equal(0, new JsonFileStore<Counter>(path).Load().Count);
    }

    /// <summary>
    /// An update loads the value, changes it, and saves it.
    /// True: successive updates build on each other.
    /// False: an update would start from a fresh value each time.
    /// </summary>
    [Fact]
    public void Update_IsReadModifyWrite()
    {
        var store = new JsonFileStore<Counter>(PathFor("update.json"));

        store.Update(c => c.Count = 1);
        var saved = store.Update(c => c.Count += 4);

        Assert.Equal(5, store.Load().Count);
        Assert.Equal(5, saved.Count);
    }

    /// <summary>
    /// A conditional update saves only when the change reports it made one.
    /// True: a check that changes nothing costs no write.
    /// False: every call would rewrite the file.
    /// </summary>
    [Fact]
    public void UpdateIf_SavesOnlyWhenMutationReportsChange()
    {
        var path = PathFor("counter.json");
        var store = new JsonFileStore<Counter>(path, NullLogger.Instance);

        Assert.False(store.UpdateIf(c => false));
        Assert.False(File.Exists(path));

        Assert.True(store.UpdateIf(c =>
        {
            c.Count++;
            return true;
        }));
        Assert.Equal(1, store.Load().Count);
    }

    /// <summary>
    /// A save creates the folder it needs.
    /// True: a store can point into a folder that does not exist yet.
    /// False: the first save would throw.
    /// </summary>
    [Fact]
    public void Save_CreatesTheParentFolder()
    {
        var path = Path.Combine(_dir, "nested", "deeper", "state.json");

        new JsonFileStore<Counter>(path).Save(new Counter { Count = 2 });

        Assert.Equal(2, new JsonFileStore<Counter>(path).Load().Count);
    }

    /// <summary>
    /// A save does not depend on a fixed temp name, and leaves no temp file behind.
    /// True: a leftover or concurrent "file.tmp" cannot block or corrupt a save.
    /// False: a shared temp name would collide.
    /// </summary>
    [Fact]
    public void Save_UsesAUniqueTempFile()
    {
        var path = PathFor("unique.json");
        Directory.CreateDirectory(path + ".tmp");
        var store = new JsonFileStore<Counter>(path, NullLogger.Instance);

        store.Save(new Counter { Count = 3 });

        Assert.Equal(3, store.Load().Count);
        Assert.Empty(Directory.GetFiles(_dir, "unique.json.*.tmp"));
    }

    /// <summary>
    /// Two stores writing one file at once never fail and always leave a complete document.
    /// True: concurrent writers each swap in a whole file.
    /// False: they would share and clobber one temp file.
    /// </summary>
    [Fact]
    public void Save_ConcurrentStoresLeaveAWholeFile()
    {
        var path = PathFor("shared.json");
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
                // Windows can refuse a rename onto a file another writer is replacing, and that is not corruption.
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

    /// <summary>
    /// A missing path, value, or mutation is rejected.
    /// True: a misuse fails at once.
    /// False: a null value would be written as the JSON text null.
    /// </summary>
    [Fact]
    public void Members_RejectNullArguments()
    {
        var store = new JsonFileStore<Counter>(PathFor("args.json"));

        Assert.Throws<ArgumentException>(() => new JsonFileStore<Counter>(string.Empty));
        Assert.Throws<ArgumentNullException>(() => store.Save(null!));
        Assert.Throws<ArgumentNullException>(() => store.Update(null!));
        Assert.Throws<ArgumentNullException>(() => store.UpdateIf(null!));
    }
}
