# Fix Finder File Open Rendering

## Problem

Terrarium registers as the default app for `.tsx` files via `fileAssociations` in `tauri.conf.json`. Double-clicking a `.tsx` file in Finder launches Terrarium, but the file does not render. The app shows the empty welcome screen.

CLI opening (`terrarium myfile.tsx`) works correctly.

## Root Cause

macOS does not pass file paths as CLI arguments when opening files via Finder. It sends Apple Events (`kAEOpenDocuments`). Tauri 2 surfaces these as `RunEvent::Opened { urls: Vec<Url> }`.

The app only checks CLI args in `.setup()` and never handles `RunEvent::Opened`.

## Solution

Handle `RunEvent::Opened` by switching from `.run(generate_context!())` to `.build(generate_context!())?.run(callback)`.

### Event Handler

In the `RunEvent::Opened` callback:

1. Filter `urls` for `file://` URLs ending in `.tsx`
2. Convert to `PathBuf` via `url.to_file_path()`
3. Store in `AppState::current_file`
4. Set window title
5. Spawn async task: bundle the file, emit `bundle-ready` or `bundle-error`
6. Set up file watcher for hot-reload

### Timing

Both cold start (app launched by Finder) and warm start (app already running) are handled identically: the `Opened` handler always bundles and emits. The frontend's existing `bundle-ready` listener renders the result.

## Files Changed

- `src-tauri/src/lib.rs` (~25 lines added/modified)

## Files Unchanged

- `src/renderer.js` (already listens for `bundle-ready`)
- `src-tauri/src/bundler.rs`
- `src-tauri/src/watcher.rs`
- `src-tauri/tauri.conf.json`
