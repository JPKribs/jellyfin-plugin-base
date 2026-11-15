# Security and Secrets

Types that keep credentials out of a configuration file and compare or check untrusted values safely.

These types are defense in depth, not a vault. The key ring is stored as unencrypted XML in `<plugin configurations folder>/<plugin name>.Keys`, beside the configuration it protects. Anyone who can read that folder, or a backup that carries it, can decrypt the secrets.

## SecretProtector

Encrypts and decrypts plugin secrets with ASP.NET Core Data Protection. Stored values carry the prefix `enc:v1:`. A value without the prefix is plaintext, and `Unprotect` returns it unchanged. `Protect` encrypts it on the next save.

Get one per plugin through `AddPluginSecretProtector` or `StableSecretProtection.CreateProtector`. Construct it directly only when you supply your own provider.

```csharp
// In the plugin's save hook, where the page posts back KeptSentinel for a secret it did not change.
protected override void OnConfigurationSaving(PluginConfiguration incoming, PluginConfiguration stored)
{
    foreach (var server in incoming.Servers)
    {
        var incomingKey = SecretProtector.IsProtected(server.ApiKey) ? SecretProtector.KeptSentinel : server.ApiKey;
        server.ApiKey = _secrets.ResolveIncoming(incomingKey, KeptApiKeyFor(server, stored));
    }
}

// When the plugin needs the plain value to call a service:
var apiKey = _secrets.Unprotect(server.ApiKey);
```

**Gotchas**

* `ResolveIncoming` always returns the value to store. The kept sentinel returns the stored value, a new value is encrypted, and an empty value clears the secret.
* A plaintext secret that begins with `enc:v1:` is read as already encrypted. `Protect` leaves it alone and `Unprotect` returns an empty string.
* Without a provider, `Protect` stores plaintext, `Unprotect` returns an empty string for an encrypted value, and `ResolveIncoming` still honors the sentinel. Check `IsAvailable` when a plugin must refuse to store plaintext.
* A value that cannot be decrypted, for example after the key changed, logs a warning and returns an empty string.
* `HasSecret` is true for any non-empty string and does not check that the value is encrypted. Use it to decide whether a page shows its "saved" placeholder.
* The class holds no mutable state, so it is safe to share.
* The browser half is `bindSecretField`, `readSecretField`, and `clearSecretField` in the shared JS bundle.

## StableSecretProtection

Builds the Data Protection provider and the protector so encrypted secrets survive changes in how Jellyfin is launched, such as an update, the desktop app versus a service, or Docker. ASP.NET derives its key location and application name from the host, and both can move, which makes every stored secret fail to decrypt. This class pins both.

Everything derives from one plugin name. The key folder is `<PluginConfigurationsPath>/<pluginName>.Keys`, the application name is `<pluginName>`, and the purpose is `<pluginName>.Secrets.v1`.

```csharp
public const string SecretsName = "Jellyfin.Plugin.MyPlugin";

_secrets = new Lazy<SecretProtector>(
    () => StableSecretProtection.CreateProtector(applicationPaths, SecretsName, logger));
```

**Gotchas**

* Pass the plugin's assembly name and never change it. A new name makes every stored secret unreadable.
* Every call with the same name shares one key ring.
* With no paths, or when the provider cannot be built, the result is a plaintext protector and `IsAvailable` is false.
* `Build` caches by key folder only, so a second call with a different application name for the same folder gets the first provider.
* The key ring is never moved or re-wrapped, because that would make existing secrets unreadable.

## SecretCompare

Compares secrets without a timing signal and makes new random tokens. Use it for an API key, a token, or a signature, and never compare one with `==`.

```csharp
if (!SecretCompare.FixedTimeEquals(storedKey, presentedKey)) { return Unauthorized(); }

var token = SecretCompare.NewTokenBase64Url(32);
```

**Gotchas**

* A null or empty value never matches, not even another empty one, so an unset secret cannot be satisfied by an empty input.
* The comparison is constant time over the UTF-16 code units, so strings that differ only in a lone surrogate are not equal.
* Values of different lengths are refused at once, so the comparison shows the length. That is fine for tokens of a fixed size.
* The overload with a `StringComparison` accepts only `Ordinal` and `OrdinalIgnoreCase`. The ignore case form upper cases both sides with the invariant culture first, which suits a hex token written in either case.
* `NewTokenHex(bytes)` gives lowercase hex of twice as many characters. `NewTokenBase64Url(bytes)` gives unpadded URL safe base 64, 43 characters for 32 bytes. A size below 1 throws.

## UrlUtilities

Checks a URL that a user typed or a peer sent before a plugin uses it. `TryGetHttpUri` accepts only an absolute http or https URL with a host and no user name or password.

```csharp
if (!UrlUtilities.TryGetHttpUri(config.ServerUrl, out var uri)) { return BadRequest("Enter a full http or https address."); }
```

**Gotchas**

* It checks the shape only. Pair it with `SsrfGuard` when the address must not be on a private network.
* The scheme is matched in any case. A relative URL, another scheme such as `file` or `javascript`, user info, and an empty host are refused, and the output is null.
