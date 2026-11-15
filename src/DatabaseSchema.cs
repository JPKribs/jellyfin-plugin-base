using System;
using System.Data.Common;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>What opening a plugin's database should do with what is stored in it.</summary>
public enum SchemaAction
{
    /// <summary>The database is empty. Its schema was created.</summary>
    Created,

    /// <summary>An older build wrote it. It was migrated to this build's version.</summary>
    Migrated,

    /// <summary>It is already at this build's version.</summary>
    Current,

    /// <summary>
    /// A newer build wrote it and says this build can still read it. It is used as is, and its version is left
    /// alone so the newer build finds it exactly as it left it.
    /// </summary>
    UsedNewer,

    /// <summary>
    /// A newer build wrote it and this build cannot read it. The caller closes the connection, moves the file
    /// aside with <see cref="DatabaseSchema.SetAside"/>, and opens a fresh database.
    /// </summary>
    TooNew,

    /// <summary>
    /// The migration reported failure. The caller closes the connection, moves the file aside with
    /// <see cref="DatabaseSchema.SetAside"/>, and opens a fresh database.
    /// </summary>
    MigrationFailed
}

/// <summary>
/// Versions a SQLite database a plugin owns.
/// The schema version lives in <c>PRAGMA user_version</c>, and a small <c>SchemaInfo</c> table records the oldest version that can still read the file.
/// </summary>
/// <remarks>
/// A build that only adds tables, columns, or indexes leaves the minimum alone, so going back to an older build keeps the database.
/// Raise the minimum only when a migration changes or removes something older builds rely on.
/// The class takes a <see cref="DbConnection"/>, so a plugin takes on no SQLite dependency, but its SQL is SQLite specific.
/// A <c>user_version</c> of 0 counts as an empty database even when tables exist.
/// </remarks>
public static class DatabaseSchema
{
    /// <summary>The table that records the oldest version that can read the database.</summary>
    public const string InfoTable = "SchemaInfo";

    private const string MinReaderKey = "MinReaderVersion";

    /// <summary>Reads the schema version, where 0 means an empty database.</summary>
    /// <param name="connection">An open connection.</param>
    /// <returns>The version.</returns>
    public static int GetVersion(DbConnection connection)
    {
        ArgumentNullException.ThrowIfNull(connection);
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA user_version";
        return Convert.ToInt32(command.ExecuteScalar(), CultureInfo.InvariantCulture);
    }

    /// <summary>Writes the schema version.</summary>
    /// <param name="connection">An open connection.</param>
    /// <param name="version">The version.</param>
    [SuppressMessage("Security", "CA2100:Review SQL queries for security vulnerabilities", Justification = "A pragma takes no parameters, and the only value in the text is an integer.")]
    public static void SetVersion(DbConnection connection, int version)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentOutOfRangeException.ThrowIfNegative(version);
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA user_version = " + version.ToString(CultureInfo.InvariantCulture);
        command.ExecuteNonQuery();
    }

    /// <summary>
    /// Reads the oldest version the database says can still read it.
    /// </summary>
    /// <param name="connection">An open connection.</param>
    /// <returns>The version, or <c>null</c> when the build that wrote the database recorded none.</returns>
    public static int? GetMinReaderVersion(DbConnection connection)
    {
        ArgumentNullException.ThrowIfNull(connection);
        using var probe = connection.CreateCommand();
        probe.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '" + InfoTable + "'";
        if (Convert.ToInt32(probe.ExecuteScalar(), CultureInfo.InvariantCulture) == 0)
        {
            return null;
        }

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Value FROM " + InfoTable + " WHERE Key = '" + MinReaderKey + "'";
        var value = command.ExecuteScalar();
        return value is null or DBNull ? null : Convert.ToInt32(value, CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// Marks the database as written by this build, recording the oldest version that can read it and then the version.
    /// </summary>
    /// <param name="connection">An open connection.</param>
    /// <param name="version">This build's schema version.</param>
    /// <param name="minReaderVersion">The oldest version that can still read the database.</param>
    public static void Stamp(DbConnection connection, int version, int minReaderVersion)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(minReaderVersion, version);
        using var command = connection.CreateCommand();
        command.CommandText =
            "CREATE TABLE IF NOT EXISTS " + InfoTable + " (Key TEXT NOT NULL PRIMARY KEY, Value INTEGER NOT NULL);" +
            "INSERT INTO " + InfoTable + " (Key, Value) VALUES ('" + MinReaderKey + "', @min) ON CONFLICT(Key) DO UPDATE SET Value = @min;";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "@min";
        parameter.Value = minReaderVersion;
        command.Parameters.Add(parameter);
        command.ExecuteNonQuery();
        SetVersion(connection, version);
    }

    /// <summary>Decides what opening a database should do, without touching it.</summary>
    /// <param name="storedVersion">The version stored in the database.</param>
    /// <param name="storedMinReader">The oldest reader the database names, or <c>null</c>.</param>
    /// <param name="currentVersion">This build's schema version.</param>
    /// <returns>The action. Never <see cref="SchemaAction.MigrationFailed"/>.</returns>
    public static SchemaAction Decide(int storedVersion, int? storedMinReader, int currentVersion)
    {
        if (storedVersion <= 0)
        {
            return SchemaAction.Created;
        }

        if (storedVersion < currentVersion)
        {
            return SchemaAction.Migrated;
        }

        if (storedVersion == currentVersion)
        {
            return SchemaAction.Current;
        }

        return storedMinReader is { } minReader && minReader <= currentVersion ? SchemaAction.UsedNewer : SchemaAction.TooNew;
    }

    /// <summary>
    /// Brings an open database to this build's schema.
    /// An empty database is created and an older one migrated, and either is stamped.
    /// </summary>
    /// <remarks>
    /// A current database gets the marker when it lacks it, and a newer one this build can read is left untouched.
    /// For <see cref="SchemaAction.TooNew"/> and <see cref="SchemaAction.MigrationFailed"/> this method writes nothing, and the caller moves the file aside and opens a fresh one.
    /// <para>
    /// With <paramref name="transactional"/> the create or migrate and the version stamp run in one transaction,
    /// so a crash or a throwing step leaves the database as it was, and a migration that returns <c>false</c> is rolled back.
    /// Only pass it when <paramref name="create"/> and <paramref name="migrate"/> open no transaction of their own
    /// and run nothing SQLite refuses inside one, such as <c>VACUUM</c> or a <c>journal_mode</c> change.
    /// </para>
    /// </remarks>
    /// <param name="connection">An open connection.</param>
    /// <param name="currentVersion">This build's schema version.</param>
    /// <param name="minReaderVersion">The oldest version that can read what this build writes.</param>
    /// <param name="create">Creates the whole schema in an empty database.</param>
    /// <param name="migrate">Migrates from the given version, and returns <c>false</c> when it could not.</param>
    /// <param name="transactional">Whether to run the schema change and the stamp in one transaction. <c>false</c> by default.</param>
    /// <returns>What was done.</returns>
    public static SchemaAction Open(
        DbConnection connection,
        int currentVersion,
        int minReaderVersion,
        Action<DbConnection> create,
        Func<DbConnection, int, bool> migrate,
        bool transactional = false)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(create);
        ArgumentNullException.ThrowIfNull(migrate);

        var stored = GetVersion(connection);
        var action = Decide(stored, stored > currentVersion ? GetMinReaderVersion(connection) : null, currentVersion);
        switch (action)
        {
            case SchemaAction.Created:
                Apply(connection, transactional, () =>
                {
                    create(connection);
                    Stamp(connection, currentVersion, minReaderVersion);
                    return true;
                });
                break;

            case SchemaAction.Migrated:
                var migrated = Apply(connection, transactional, () =>
                {
                    if (!migrate(connection, stored))
                    {
                        return false;
                    }

                    Stamp(connection, currentVersion, minReaderVersion);
                    return true;
                });
                if (!migrated)
                {
                    return SchemaAction.MigrationFailed;
                }

                break;

            case SchemaAction.Current:
                // A database at this version from a build that recorded no marker gets the marker added.
                if (GetMinReaderVersion(connection) != minReaderVersion)
                {
                    Apply(connection, transactional, () =>
                    {
                        Stamp(connection, currentVersion, minReaderVersion);
                        return true;
                    });
                }

                break;
        }

        return action;
    }

    private static bool Apply(DbConnection connection, bool transactional, Func<bool> change)
    {
        if (!transactional)
        {
            return change();
        }

        // Plain SQL rather than BeginTransaction, so the callbacks' commands need no transaction handed to them.
        Execute(connection, "BEGIN IMMEDIATE");
        bool done;
        try
        {
            done = change();
        }
        catch
        {
            Rollback(connection);
            throw;
        }

        if (done)
        {
            Execute(connection, "COMMIT");
        }
        else
        {
            Rollback(connection);
        }

        return done;
    }

    private static void Rollback(DbConnection connection)
    {
        try
        {
            Execute(connection, "ROLLBACK");
        }
        catch (DbException)
        {
            // SQLite already rolled back after the failure, so no transaction is left to end.
        }
    }

    [SuppressMessage("Security", "CA2100:Review SQL queries for security vulnerabilities", Justification = "Only the fixed transaction statements in this class are passed.")]
    private static void Execute(DbConnection connection, string sql)
    {
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }

    /// <summary>
    /// Moves a database file aside as <c>[name].[reason]-[UTC time]</c>, carrying its <c>-wal</c> and <c>-shm</c> files along.
    /// Only the newest <paramref name="keep"/> backups for the same reason are kept.
    /// </summary>
    /// <remarks>
    /// The journal files travel with the file because the journal may hold commits that were never checkpointed.
    /// When the move fails the file is deleted instead, so a fresh database can still be created. Close every connection first.
    /// A <paramref name="keep"/> of 0 removes the backup just made and still returns its path, and a negative value prunes nothing.
    /// Two calls for the same reason within one second use the same backup name, so the second move fails and the file is deleted instead.
    /// </remarks>
    /// <param name="databasePath">The database file.</param>
    /// <param name="reason">A short word for the backup name, such as <c>newer</c> or <c>corrupt</c>.</param>
    /// <param name="keep">How many backups to keep for this reason.</param>
    /// <param name="logger">The logger that reports the move, a failed move, and a failed prune.</param>
    /// <returns>The backup path, or <c>null</c> when there was no file or it could only be deleted.</returns>
    public static string? SetAside(string databasePath, string reason, int keep, ILogger logger)
    {
        ArgumentException.ThrowIfNullOrEmpty(databasePath);
        ArgumentException.ThrowIfNullOrEmpty(reason);
        ArgumentNullException.ThrowIfNull(logger);

        if (!File.Exists(databasePath))
        {
            DeleteJournal(databasePath, logger);
            return null;
        }

        var backupPath = databasePath + "." + reason + "-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);
        try
        {
            File.Move(databasePath, backupPath);
            MoveIfPresent(databasePath + "-wal", backupPath + "-wal");
            MoveIfPresent(databasePath + "-shm", backupPath + "-shm");
            logger.LogWarning("Moved the database {Path} aside to {Backup}", databasePath, backupPath);
            PruneBackups(databasePath, reason, keep, logger);
            return backupPath;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Could not move the database {Path} aside, so it is deleted instead", databasePath);
            TryDelete(databasePath, logger);
            DeleteJournal(databasePath, logger);
            return null;
        }
    }

    private static void MoveIfPresent(string from, string to)
    {
        if (File.Exists(from))
        {
            File.Move(from, to);
        }
    }

    private static void DeleteJournal(string databasePath, ILogger logger)
    {
        TryDelete(databasePath + "-wal", logger);
        TryDelete(databasePath + "-shm", logger);
    }

    private static void TryDelete(string path, ILogger logger)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Could not delete {Path}", path);
        }
    }

    private static void PruneBackups(string databasePath, string reason, int keep, ILogger logger)
    {
        var directory = Path.GetDirectoryName(databasePath);
        if (string.IsNullOrEmpty(directory) || keep < 0)
        {
            return;
        }

        try
        {
            // A backup's journal files travel with it, so they neither count toward the limit nor outlive it.
            var backups = Directory.GetFiles(directory, Path.GetFileName(databasePath) + "." + reason + "-*")
                .Where(f => !f.EndsWith("-wal", StringComparison.Ordinal) && !f.EndsWith("-shm", StringComparison.Ordinal))
                .OrderByDescending(f => f, StringComparer.Ordinal)
                .Skip(keep);
            foreach (var backup in backups)
            {
                TryDelete(backup, logger);
                DeleteJournal(backup, logger);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Could not prune old backups of {Path}", databasePath);
        }
    }
}
