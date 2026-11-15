# Data and Storage

Versioned SQLite files, one value in a JSON file, and paged results for list endpoints.

Use `JsonFileStore` for small runtime state, `DatabaseSchema` for data with many rows, and `PagedResult` to return either one to a page.

## DatabaseSchema

Versions a SQLite database that a plugin owns. The version lives in `PRAGMA user_version`. A small `SchemaInfo` table records the oldest version that can still read the file, the minimum reader. A build that only adds tables, columns, or indexes leaves the minimum alone, so going back to an older build keeps the database. Raise the minimum only when a migration changes or removes something older builds rely on.

The class takes a `DbConnection`, so the plugin chooses the SQLite package.

```csharp
var action = DatabaseSchema.Open(
    connection,
    SchemaVersion,
    MinReaderSchemaVersion,
    create: _ => CreateSchema(),
    migrate: (_, fromVersion) =>
    {
        MigrateSchema(fromVersion);
        return true;
    });

if (action is SchemaAction.TooNew or SchemaAction.MigrationFailed)
{
    connection.Close();
    connection.Dispose();
    DatabaseSchema.SetAside(dbPath, action == SchemaAction.TooNew ? "newer" : "failed", 3, logger);
    // Open a new connection and call DatabaseSchema.Open again.
}
```

**Gotchas**

* The SQL is SQLite specific, since it uses `PRAGMA` and `sqlite_master`.
* "Empty" means `user_version` is 0, not that the file has no tables. A database that was never stamped is passed to `create`, so make `create` safe to run on existing tables with `CREATE TABLE IF NOT EXISTS` when you adopt such files.
* `Open` reads the minimum reader only when the stored version is above the current one.
* `transactional: true` runs the create or migrate step and the stamp in one transaction, and rolls back a throwing step or a migration that returns false. Pass it only when `create` and `migrate` open no transaction of their own and run nothing SQLite refuses inside a transaction, such as `VACUUM` or a `journal_mode` change. The connection must not already be in a transaction.
* `SetAside` moves the file and its `-wal` and `-shm` files to `<path>.<reason>-<yyyyMMdd-HHmmss UTC>` and keeps only the newest `keep` backups for that reason. Close every connection first.
* `SetAside` with `keep` of 0 deletes every backup including the one it just made, and still returns that path. Two set-asides with the same reason in one second pick the same name, so the move fails and the database is deleted instead.
* A failed move deletes the file and its journals and returns null.

## SchemaAction

What opening a plugin's database did, or what the caller must do next. `DatabaseSchema.Open` and `Decide` return it.

```csharp
if (action is SchemaAction.TooNew or SchemaAction.MigrationFailed)
{
    // Close the connection, set the file aside, and open a fresh database.
}
```

**Gotchas**

* `Created`, `Migrated`, and `Current` need nothing from the caller.
* `UsedNewer` means a newer build wrote the file and says this build can still read it. The file is used as is and its version is left alone.
* `TooNew` and `MigrationFailed` both mean the caller must close the connection, call `DatabaseSchema.SetAside`, and open a fresh database.
* `Decide` never returns `MigrationFailed`. Only `Open` does.

## JsonFileStore

A thread-safe JSON file for one value, for runtime state a plugin keeps beside its configuration, such as usage counters, lockouts, cursors, and caches. A missing or damaged file yields a fresh value, and a save is atomic and durable.

Do not use it for data with many rows or for several writer processes. Use a database for that.

`T` must be a class with a public parameterless constructor that round trips through `System.Text.Json` defaults. `Dictionary<Guid, X>` works.

```csharp
private readonly JsonFileStore<TimerFile> _store;

_store = new JsonFileStore<TimerFile>(Path.Combine(appPaths.DataPath, "myplugin", "timers.json"), logger);

var timers = _store.Load();
_store.Update(f => f.Items.Add(newTimer));
var changed = _store.UpdateIf(f => f.Items.RemoveAll(t => t.Expired) > 0);
```

**Gotchas**

* The lock is per instance. Two instances on one path do not share it, though each swap is still whole-file atomic. Use one instance per file.
* `Load` is forgiving. A missing, empty, or `null` file, and an unreadable or invalid one, gives a new `T`, with a warning when a logger was given.
* `Save` lets I/O errors propagate.
* After a corrupt read, `Update` overwrites the damaged file with the mutated fresh value.

## PagedResult

One page of results with the total count and the page metadata. It serializes in the shape `createPaginatedTable` reads, and the shape the `fetch` of `createDataTable` and `createFilteredList` may return.

```csharp
return Ok(new PagedResult<SyncItemDto>(
    items.Select(i => i.ToDto()).ToList(),
    totalCount,
    skip,
    take));
```

**Gotchas**

* `skip` and `take` are not clamped. A negative `skip` can give a page below 1, so clamp in the endpoint, for example with `Math.Clamp(take, 1, 200)` and `Math.Max(0, skip)`.
* A `take` of zero or less means all, and uses `totalCount` as the page size.
* The constructor with only items and a total describes a full result that is not paged.

## PagedQuery

The paging and search values a list endpoint receives. Bind it from the request.

```csharp
[HttpGet("items")]
public ActionResult<PagedResult<ItemDto>> Items([FromQuery] PagedQuery query)
    => Ok(Filter(query.Search).ToPagedResult(query));
```

**Gotchas**

* `Take` defaults to 50, and `ToPagedResult` treats zero or less as 50.
* `Search` and `Filter` are carried but never applied by the package. The endpoint applies them before it pages.

## PagedResultExtensions

Adds `ToPagedResult` to a collection that is already filtered.

```csharp
var page = filtered.ToPagedResult(new PagedQuery { Skip = 20, Take = 10 });
```

**Gotchas**

* It takes `Skip` and `Take` from the collection and returns the full count as the total. A `List<T>` or an array qualifies.
* It does not apply `Search` or `Filter`.
