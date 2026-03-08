# Artifact Persistent Storage for Terrarium

## Problem

Claude artifacts now support persistent storage via `window.storage` (up to 20MB per artifact). When users export these artifacts as `.tsx` files and open them in Terrarium, `window.storage` calls fail because the API doesn't exist outside Claude's sandbox.

## Goal

Make Claude artifacts that use `window.storage` work in Terrarium by providing a compatible local implementation backed by SQLite.

## Architecture

```
Component code: window.storage.getItem("key")
        |
Injected JS shim (loaded before component)
        |
window.__TAURI__.invoke("storage_get", { filePath, key })
        |
Rust Tauri command handler (storage.rs)
        |
SQLite: ~/.terrarium/storage.db
```

## Database schema

Single table in `~/.terrarium/storage.db`:

```sql
CREATE TABLE IF NOT EXISTS artifact_storage (
    file_path TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (file_path, key)
);
```

Storage is scoped per file path, matching Claude's model where each artifact has isolated storage.

## Rust commands (storage.rs)

Three Tauri commands:

- `storage_get(file_path: String, key: String) -> Option<String>`
- `storage_set(file_path: String, key: String, value: String)`
- `storage_remove(file_path: String, key: String)`

Uses `rusqlite` crate. Database created lazily on first storage call.

## JavaScript shim

Injected into the webview before the component bundle runs. Defines `window.storage` with:

- `getItem(key)` — async, calls `storage_get` via Tauri IPC
- `setItem(key, value)` — async, calls `storage_set` via Tauri IPC
- `removeItem(key)` — async, calls `storage_remove` via Tauri IPC

The shim receives the current file path from the Rust side (set during `open_file()`).

## Files changed

| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Add `rusqlite` with `bundled` feature |
| `src-tauri/src/storage.rs` | New module: DB init, Tauri commands |
| `src-tauri/src/lib.rs` | Register storage commands, inject init script |
| `src/renderer.js` | Set file path on webview context for the shim |
| `src-tauri/resources/storage-shim.js` | New: `window.storage` polyfill (~50 lines) |

## Constraints

- 20MB soft limit per file path (matching Claude)
- Text-only values (matching Claude)
- Storage survives app restarts (SQLite on disk)
- No shared storage mode (local-only, single user)

## Future extensions

- `window.terrarium.storage` superset API with `listKeys()`, `getAll()`, `clear()`, `getUsage()`
- Raw SQLite access via `window.terrarium.sql()`
- Storage inspector UI
