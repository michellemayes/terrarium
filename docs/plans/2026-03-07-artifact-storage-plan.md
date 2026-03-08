# Artifact Persistent Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Claude artifacts that use `window.storage` work in Terrarium by providing a SQLite-backed local implementation with per-file isolation.

**Architecture:** A Rust storage module (`storage.rs`) manages a SQLite database at `~/.terrarium/storage.db`. Three Tauri IPC commands (`storage_get`, `storage_set`, `storage_remove`) expose CRUD operations. A JavaScript shim injected before each component defines `window.storage` with `getItem`/`setItem`/`removeItem`, routing calls through Tauri IPC. The file path is passed to each webview window so storage is scoped per component file.

**Tech Stack:** Rust + rusqlite (bundled SQLite), Tauri IPC, vanilla JavaScript shim

---

### Task 1: Add rusqlite dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add rusqlite to dependencies**

In `src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
rusqlite = { version = "0.31", features = ["bundled"] }
```

**Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully (may take a minute for bundled SQLite)

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "feat: add rusqlite dependency for artifact storage"
```

---

### Task 2: Create storage module with DB init and unit tests

**Files:**
- Create: `src-tauri/src/storage.rs`
- Modify: `src-tauri/src/lib.rs` (add `pub mod storage;`)

**Step 1: Write failing tests for storage operations**

Create `src-tauri/src/storage.rs` with tests, then add `pub mod storage;` to `src-tauri/src/lib.rs` (after the existing `pub mod watcher;` line).

See design doc for StorageDb struct, test cases (get_missing_key_returns_none, set_then_get_returns_value, different_files_are_isolated, set_overwrites_existing, remove_deletes_key, remove_nonexistent_key_is_ok), and full implementation using rusqlite with a Mutex-wrapped Connection.

Key implementation details:
- `open()` creates the table with `CREATE TABLE IF NOT EXISTS artifact_storage (file_path TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (file_path, key))`
- `get()` uses `SELECT value ... WHERE file_path = ?1 AND key = ?2` with `.optional()`
- `set()` uses `INSERT ... ON CONFLICT DO UPDATE`
- `remove()` uses `DELETE ... WHERE file_path = ?1 AND key = ?2`
- Tests use `tempfile::NamedTempFile` for isolated DB instances

**Step 2: Run tests to verify they fail**

Run: `cd src-tauri && cargo test storage`
Expected: All 6 tests fail with "not yet implemented"

**Step 3: Implement StorageDb methods**

Replace `todo!()` bodies with working implementations.

**Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test storage`
Expected: All 6 tests pass

**Step 5: Commit**

```bash
git add src-tauri/src/storage.rs src-tauri/src/lib.rs
git commit -m "feat: add storage module with SQLite-backed key-value store"
```

---

### Task 3: Add Tauri IPC commands for storage

**Files:**
- Modify: `src-tauri/src/storage.rs` (add Tauri commands)
- Modify: `src-tauri/src/lib.rs` (register commands, manage StorageDb state)

**Step 1: Add Tauri command functions to storage.rs**

Add three `#[tauri::command]` async functions: `storage_get`, `storage_set`, `storage_remove`. Each takes `State<'_, StorageDb>` plus the relevant parameters and delegates to the StorageDb methods.

**Step 2: Register commands and state in lib.rs**

- Add `.manage()` call to create StorageDb at `bundler::cache_dir().join("storage.db")`
- Add the three commands to `invoke_handler`

**Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src-tauri/src/storage.rs src-tauri/src/lib.rs
git commit -m "feat: register storage IPC commands with Tauri"
```

---

### Task 4: Create the window.storage JavaScript shim

**Files:**
- Create: `src-tauri/resources/storage-shim.js`

**Step 1: Write the shim**

A self-executing function that:
- Reads `window.__TERRARIUM_FILE_PATH__` for per-file scoping
- Defines `window.storage.getItem(key)` → calls `invoke('storage_get', ...)`
- Defines `window.storage.setItem(key, value)` → calls `invoke('storage_set', ...)`
- Defines `window.storage.removeItem(key)` → calls `invoke('storage_remove', ...)`
- All methods return Promises (matching Claude's async API)

**Step 2: Commit**

```bash
git add src-tauri/resources/storage-shim.js
git commit -m "feat: add window.storage JavaScript shim"
```

---

### Task 5: Inject the shim and file path into webview windows

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add initialization_script to create_window**

Use `.initialization_script(include_str!("../resources/storage-shim.js"))` in `create_window` so every new window gets the shim.

**Step 2: Inject shim into main window via setup**

In `.setup()`, use Tauri's webview script injection API on the main window.

**Step 3: Set file path before component renders**

In `open_file`, `spawn_bundle_and_watch`, and `RunEvent::Opened`, use Tauri's webview script injection to set `window.__TERRARIUM_FILE_PATH__` to the component's file path (JSON-encoded string) before the bundle is sent.

**Step 4: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: inject storage shim and file path into webview windows"
```

---

### Task 6: Add example artifact and manual test

**Files:**
- Create: `examples/storage-test.tsx`

**Step 1: Create a persistent counter component**

A React component that loads a saved count from `window.storage.getItem('count')` on mount, increments and saves via `window.storage.setItem('count', ...)`, and supports reset via `window.storage.removeItem('count')`.

**Step 2: Build and test manually**

Run: `cd src-tauri && cargo tauri dev`

1. Open `examples/storage-test.tsx`
2. Click "Increment" a few times
3. Close the window, reopen the file
4. Verify the count persisted

**Step 3: Verify the database**

Run: `sqlite3 ~/.terrarium/storage.db "SELECT * FROM artifact_storage;"`
Expected: Row with file path, key "count", and saved value

**Step 4: Commit**

```bash
git add examples/storage-test.tsx
git commit -m "feat: add persistent counter example using window.storage"
```
