# Hot Reload Integration Test

## Goal

Verify the watcher-to-bundler pipeline works end-to-end: a file change on disk triggers re-bundling and emits the correct Tauri event.

## Production Changes

Two small changes to enable testability:

### 1. Make `watcher` module public (`lib.rs`)

Change `mod watcher` to `pub mod watcher` so integration tests can call `watch_file` directly. Follows the existing pattern (`pub mod bundler`).

### 2. Add env var override to `bundler_script_path` (`bundler.rs`)

Check `TERRARIUM_BUNDLER_PATH` before Tauri's resource resolver. Tauri's `app.path().resolve()` fails in test mocks; the env var lets tests point at the real `resources/bundler.mjs`.

```rust
pub fn bundler_script_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("TERRARIUM_BUNDLER_PATH") {
        return Ok(PathBuf::from(path));
    }
    // existing Tauri resolution...
}
```

## Integration Tests

File: `src-tauri/tests/hot_reload_test.rs`

### Test 1: `bundler_produces_valid_output`

1. Set `TERRARIUM_BUNDLER_PATH` to `resources/bundler.mjs` (via `CARGO_MANIFEST_DIR`)
2. Create mock Tauri app via `tauri::test::mock_builder()`
3. Create temp `.tsx` file: `export default function() { return <div>hello</div>; }`
4. Call `bundle_tsx()` directly
5. Assert output is non-empty and not an error JSON

### Test 2: `watcher_triggers_rebundle_on_file_change`

1. Same setup as Test 1
2. Start `watch_file()` on the temp file
3. Listen for `"bundle-ready"` events on the mock app
4. Wait 500ms for watcher initialization
5. Modify the `.tsx` file content
6. Wait up to 10s for debounce (300ms) + Node.js bundling
7. Assert `"bundle-ready"` event received with non-empty payload

### Test 3: `watcher_emits_error_on_invalid_tsx`

1. Same watcher setup
2. Modify the file to contain invalid syntax (`not valid tsx {{{`)
3. Assert `"bundle-error"` event fires

## Dependencies

Already in `Cargo.toml`: `tempfile = "3"`, `tokio-test = "0.4"`, `tauri` with `test` feature. No new dependencies needed.
