# Fix Double Window on Cold Start — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the duplicate window when opening a .tsx file from Finder on cold start.

**Architecture:** Remove CLI file-arg handling from `.setup()`, let `RunEvent::Opened` be the sole file-open path. Start the main window hidden, show it from the frontend once content is ready. Add a 200ms delayed fallback in `.setup()` to emit `no-file` if no `Opened` event arrives.

**Tech Stack:** Rust (Tauri 2), JavaScript (Tauri JS API)

---

### Task 1: Hide main window on startup

**Files:**
- Modify: `src-tauri/tauri.conf.json:10-18`

**Step 1: Add `visible: false` to main window config**

In `src-tauri/tauri.conf.json`, add `"visible": false` to the main window object:

```json
"windows": [
  {
    "label": "main",
    "title": "Terrarium",
    "width": 800,
    "height": 600,
    "resizable": true,
    "dragDropEnabled": true,
    "visible": false
  }
]
```

**Step 2: Verify the project builds**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "Start main window hidden to prevent flash on cold start"
```

---

### Task 2: Strip CLI file handling from `.setup()`

**Files:**
- Modify: `src-tauri/src/lib.rs:351-433`

**Step 1: Replace the `.setup()` handler**

Replace the entire `.setup(|app| { ... })` block (lines 351-433) with this simplified version that removes CLI arg parsing and file loading, keeping only the updater and a delayed `no-file` fallback:

```rust
        .setup(|app| {
            let app_handle = app.handle().clone();

            let update_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                if let Ok(updater) = update_handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update_handle.emit("update-available", &update.version);
                    }
                }
            });

            // Delay before showing welcome screen — gives RunEvent::Opened
            // time to deliver a file from macOS file associations.
            let delayed_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                let state = delayed_handle.state::<AppState>();
                let has_file = state
                    .windows
                    .lock()
                    .map(|w| w.contains_key("main"))
                    .unwrap_or(false);
                if !has_file {
                    let _ = delayed_handle.emit("no-file", ());
                    if let Some(window) = delayed_handle.get_webview_window("main") {
                        let _ = window.show();
                    }
                }
            });

            Ok(())
        })
```

Key points:
- No more `cli_files` parsing from `tauri_plugin_cli::CliExt` or `std::env::args()`
- The `no-file` emit is delayed 200ms to give `RunEvent::Opened` a chance to fire first
- If no file was loaded after 200ms, we show the window with the welcome screen
- If a file WAS loaded (by `RunEvent::Opened`), we skip the welcome screen entirely

**Step 2: Verify the project builds**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully. There may be an unused-import warning for `tauri_plugin_cli` — that's fine, we'll clean it up in Task 4.

**Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "Remove CLI file handling from setup, use delayed no-file fallback"
```

---

### Task 3: Show window after file loads in `RunEvent::Opened`

**Files:**
- Modify: `src-tauri/src/lib.rs:446-483`

**Step 1: Add `window.show()` after loading a file into main**

In the `RunEvent::Opened` handler, after setting the title and calling `spawn_bundle_and_watch` for the main window, show it:

Replace the `if main_available` block (lines 464-472):

```rust
                if main_available {
                    if let Some(tsx_path) = iter.next() {
                        if let Some(window) = app.get_webview_window("main") {
                            let name = tsx_path.file_name().unwrap_or_default().to_string_lossy();
                            let _ = window.set_title(&format!("{name} — Terrarium"));
                        }
                        spawn_bundle_and_watch(app.clone(), tsx_path, "main".to_string());
                    }
                }
```

With:

```rust
                if main_available {
                    if let Some(tsx_path) = iter.next() {
                        if let Some(window) = app.get_webview_window("main") {
                            let name = tsx_path.file_name().unwrap_or_default().to_string_lossy();
                            let _ = window.set_title(&format!("{name} — Terrarium"));
                            let _ = window.show();
                        }
                        spawn_bundle_and_watch(app.clone(), tsx_path, "main".to_string());
                    }
                }
```

The only addition is `let _ = window.show();` after setting the title.

**Step 2: Verify the project builds**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "Show main window when file opens via RunEvent::Opened"
```

---

### Task 4: Remove CLI plugin (cleanup)

**Files:**
- Modify: `src-tauri/tauri.conf.json:53-64`
- Modify: `src-tauri/src/lib.rs:217`
- Modify: `src-tauri/Cargo.toml` (remove `tauri-plugin-cli` dependency)

**Step 1: Remove CLI plugin config from tauri.conf.json**

Remove the entire `"cli"` block from the `"plugins"` section:

```json
"plugins": {
    "cli": {
      "args": [
        {
          "name": "file",
          "index": 1,
          "takesValue": true,
          "multiple": true,
          "description": "TSX file paths to open"
        }
      ]
    },
```

So it becomes just:

```json
"plugins": {
```

(keeping the `"updater"` block that follows)

**Step 2: Remove CLI plugin init from lib.rs**

Remove the line `.plugin(tauri_plugin_cli::init())` (line 217).

**Step 3: Remove CLI plugin from Cargo.toml**

Remove `tauri-plugin-cli` from the `[dependencies]` section.

**Step 4: Verify the project builds**

Run: `cd src-tauri && cargo check`
Expected: Compiles with no warnings related to CLI plugin.

**Step 5: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "Remove unused CLI plugin"
```

---

### Task 5: Show window from frontend on `no-file` and `bundle-ready`

**Files:**
- Modify: `src/renderer.js:71-80`

**Step 1: Import the Tauri window API**

Add at the top of `renderer.js`, after the existing imports:

```javascript
const { getCurrentWindow } = window.__TAURI__.webviewWindow;
```

**Step 2: Show window on `bundle-ready`**

Update the `bundle-ready` listener (line 71-74) to also show the window:

```javascript
listen('bundle-ready', (event) => {
  fileLoaded = true;
  getCurrentWindow().show();
  renderBundle(event.payload);
});
```

**Step 3: Show window on `no-file`**

Update the `no-file` listener (line 80) to show the window:

```javascript
listen('no-file', () => {
  getCurrentWindow().show();
});
```

**Step 4: Commit**

```bash
git add src/renderer.js
git commit -m "Show window from frontend when content is ready"
```

---

### Task 6: Manual smoke test

No files to modify. Verify the fix works.

**Step 1: Build the app**

Run: `cd src-tauri && cargo build`

**Step 2: Test cold start with no file**

Open Terrarium.app directly (not via a file). Verify:
- Window appears after a brief moment showing the welcome screen
- No flash of content before welcome screen

**Step 3: Test cold start from Finder**

Quit Terrarium. Double-click a .tsx file in Finder. Verify:
- Only ONE window opens
- The file renders correctly
- No welcome screen flash

**Step 4: Test file open while running**

With Terrarium running and showing a file, double-click another .tsx file in Finder. Verify:
- A second window opens with the new file (or reuses main if it was empty)
- Original window is unaffected

**Step 5: Test drag-and-drop**

Drag a .tsx file onto the Terrarium window. Verify it works as before.
