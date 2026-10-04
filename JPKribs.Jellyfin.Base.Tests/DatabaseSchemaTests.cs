using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Jellyfin.Database.Implementations.Entities;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Model.Activity;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for the database schema versioning and the activity log text limit.</summary>
public sealed class DatabaseSchemaTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "jpk-schema-" + Guid.NewGuid().ToString("N"));

    public DatabaseSchemaTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        Directory.Delete(_dir, recursive: true);
    }

    private string DbPath => Path.Combine(_dir, "test.db");

    private SqliteConnection OpenDb()
    {
        var connection = new SqliteConnection("Data Source=" + DbPath);
        connection.Open();
        return connection;
    }

    private static void CreateItems(System.Data.Common.DbConnection c)
    {
        using var command = c.CreateCommand();
        command.CommandText = "CREATE TABLE Items (Id INTEGER PRIMARY KEY)";
        command.ExecuteNonQuery();
    }

    /// <summary>
    /// The decision covers every case: empty, older, same, newer and readable, newer and not.
    /// True: each stored state leads to the safe action.
    /// False: an older build would discard a database it can read, or use one it cannot.
    /// </summary>
    [Theory]
    [InlineData(0, null, 5, SchemaAction.Created)]
    [InlineData(3, null, 5, SchemaAction.Migrated)]
    [InlineData(5, 5, 5, SchemaAction.Current)]
    [InlineData(5, null, 5, SchemaAction.Current)]
    [InlineData(7, 5, 5, SchemaAction.UsedNewer)]
    [InlineData(7, 4, 5, SchemaAction.UsedNewer)]
    [InlineData(7, 6, 5, SchemaAction.TooNew)]
    [InlineData(7, null, 5, SchemaAction.TooNew)]
    public void Decide_PicksTheSafeAction(int stored, int? minReader, int current, SchemaAction expected)
        => Assert.Equal(expected, DatabaseSchema.Decide(stored, minReader, current));

    /// <summary>
    /// An empty database is created and stamped with both the version and the oldest reader.
    /// True: the next open, by this build or an older one, knows what it holds.
    /// False: an older build could not tell whether it can read the file.
    /// </summary>
    [Fact]
    public void Open_CreatesAndStampsAnEmptyDatabase()
    {
        using var connection = OpenDb();
        var action = DatabaseSchema.Open(connection, 5, 4, CreateItems, (_, _) => throw new InvalidOperationException("no migration expected"));

        Assert.Equal(SchemaAction.Created, action);
        Assert.Equal(5, DatabaseSchema.GetVersion(connection));
        Assert.Equal(4, DatabaseSchema.GetMinReaderVersion(connection));
    }

    /// <summary>
    /// An older database is migrated from its own version, and a failed migration writes nothing.
    /// True: a migration runs once from the right place, and a failure leaves the file for the caller to move aside.
    /// False: a half migrated database would be stamped as current.
    /// </summary>
    [Fact]
    public void Open_MigratesFromTheStoredVersion_AndAFailureWritesNothing()
    {
        using (var connection = OpenDb())
        {
            DatabaseSchema.SetVersion(connection, 2);
            Assert.Equal(SchemaAction.MigrationFailed, DatabaseSchema.Open(connection, 5, 5, CreateItems, (_, _) => false));
            Assert.Equal(2, DatabaseSchema.GetVersion(connection));
            Assert.Null(DatabaseSchema.GetMinReaderVersion(connection));

            var from = -1;
            Assert.Equal(SchemaAction.Migrated, DatabaseSchema.Open(connection, 5, 5, CreateItems, (_, v) => { from = v; return true; }));
            Assert.Equal(2, from);
            Assert.Equal(5, DatabaseSchema.GetVersion(connection));
            Assert.Equal(5, DatabaseSchema.GetMinReaderVersion(connection));
        }
    }

    /// <summary>
    /// A newer database this build can read is used untouched. One it cannot read is left for the caller.
    /// True: going back to an older build keeps the database whenever it can, and the newer build finds it as it left it.
    /// False: a downgrade would discard data or stamp the file with an older version.
    /// </summary>
    [Fact]
    public void Open_LeavesANewerDatabaseUntouched()
    {
        using var connection = OpenDb();
        DatabaseSchema.Stamp(connection, 7, 5);

        Assert.Equal(SchemaAction.UsedNewer, DatabaseSchema.Open(connection, 5, 5, CreateItems, (_, _) => true));
        Assert.Equal(7, DatabaseSchema.GetVersion(connection));

        DatabaseSchema.Stamp(connection, 7, 6);
        Assert.Equal(SchemaAction.TooNew, DatabaseSchema.Open(connection, 5, 5, CreateItems, (_, _) => true));
        Assert.Equal(7, DatabaseSchema.GetVersion(connection));
        Assert.Equal(6, DatabaseSchema.GetMinReaderVersion(connection));
    }

    /// <summary>
    /// A current database written before the marker existed gets it on open.
    /// True: every database this build touches names its oldest reader from then on.
    /// False: a later downgrade would set aside a database it could have read.
    /// </summary>
    [Fact]
    public void Open_AddsTheMarkerToACurrentDatabaseWithoutOne()
    {
        using var connection = OpenDb();
        DatabaseSchema.SetVersion(connection, 5);

        Assert.Equal(SchemaAction.Current, DatabaseSchema.Open(connection, 5, 4, CreateItems, (_, _) => true));
        Assert.Equal(4, DatabaseSchema.GetMinReaderVersion(connection));
    }

    /// <summary>
    /// Setting aside moves the file with its journal and keeps only the newest backups.
    /// True: an unreadable database survives as a backup with its uncheckpointed commits, and backups cannot fill the disk.
    /// False: the journal would be lost or old backups would pile up.
    /// </summary>
    [Fact]
    public void SetAside_MovesTheFileWithItsJournal_AndPrunes()
    {
        for (var i = 0; i < 3; i++)
        {
            File.WriteAllText(Path.Combine(_dir, "test.db.newer-2026010" + i + "-000000"), "old");
        }

        File.WriteAllText(DbPath, "db");
        File.WriteAllText(DbPath + "-wal", "wal");

        var backup = DatabaseSchema.SetAside(DbPath, "newer", 2, NullLogger.Instance);

        Assert.NotNull(backup);
        Assert.False(File.Exists(DbPath));
        Assert.False(File.Exists(DbPath + "-wal"));
        Assert.Equal("wal", File.ReadAllText(backup + "-wal"));
        var kept = Directory.GetFiles(_dir, "test.db.newer-*").Where(f => !f.EndsWith("-wal", StringComparison.Ordinal)).ToList();
        Assert.Equal(2, kept.Count);
        Assert.Contains(backup, kept);
        Assert.Null(DatabaseSchema.SetAside(DbPath, "newer", 2, NullLogger.Instance));
    }

    /// <summary>
    /// Activity log text is cut to the length Jellyfin stores, and the awaitable write never throws.
    /// True: a long reason never fails the write that records it.
    /// False: an overlong overview could be rejected by the database and the entry lost.
    /// </summary>
    [Fact]
    public async Task ActivityLogger_TrimsTextAndSwallowsFailures()
    {
        var manager = Substitute.For<IActivityManager>();
        ActivityLog? written = null;
        manager.CreateAsync(Arg.Do<ActivityLog>(e => written = e)).Returns(Task.CompletedTask);
        var logger = new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance);

        await logger.LogAsync(new string('n', 600), "Test.Entry", new string('o', 600));

        Assert.NotNull(written);
        Assert.Equal(ActivityLogger.MaxTextLength, written!.Name.Length);
        Assert.Equal(ActivityLogger.MaxTextLength, written.ShortOverview!.Length);
        Assert.Equal("short", ActivityLogger.Trim("short"));

        manager.CreateAsync(Arg.Any<ActivityLog>()).Returns(Task.FromException(new InvalidOperationException("down")));
        await logger.LogAsync("name", "Test.Entry");
    }
}
