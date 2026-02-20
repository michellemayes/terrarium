# Fix Cold-Start Duplicate Window (v2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the double window on cold-start file opens by starting the main window visible and removing the 200ms timer hack.

**Architecture:** Remove the timer-based welcome screen logic. The main window starts visible with the welcome screen as default HTML. `RunEvent::Opened` loads files into the existing main window. The frontend's `bundle-ready` listener replaces the welcome content with the rendered component.

**Tech Stack:** Rust/Tauri 2, vanilla JS frontend

---

### Task 1: Make main window visible in Tauri config

**Files:**
- Modify: `src-tauri/tauri.conf.json:18`

**Step 1: Change visible to true**

In `src-tauri/tauri.conf.json`, change line 18 from:
```json
        "visible": false
```
to:
```json
        "visible": true
```

**Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "fix: start main window visible to prevent duplicate windows"
```

---

### Task 2: Remove the 200ms delayed task and `should_emit_no_file` from Rust backend

**Files:**
- Modify: `src-tauri/src/lib.rs:165-171` (delete `should_emit_no_file`)
- Modify: `src-tauri/src/lib.rs:400-413` (delete delayed task)
- Modify: `src-tauri/src/lib.rs:593-616` (delete two tests for `should_emit_no_file`)

**Step 1: Delete `should_emit_no_file` function**

Remove lines 165-171 (the function and its trailing blank line):
```rust
fn should_emit_no_file(state: &AppState) -> bool {
    !state
        .windows
        .lock()
        .map(|w| w.contains_key("main"))
        .unwrap_or(false)
}
```

**Step 2: Delete the 200ms delayed task in `.setup()`**

Remove lines 400-413 (the comment, the `delayed_handle` variable, and the entire `tauri::async_runtime::spawn` block with the `tokio::time::sleep`):
```rust
            // Delay before showing welcome screen to give RunEvent::Opened
            // time to deliver files from macOS file associations.
            let delayed_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                let state = delayed_handle.state::<AppState>();
                if should_emit_no_file(&state) {
                    let _ = delayed_handle.emit("no-file", ());
                    if let Some(window) = delayed_handle.get_webview_window("main") {
                        let _ = window.show();
                    }
                }
            });
```

After this deletion, the `.setup()` closure should contain only the updater check spawn and `Ok(())`.

**Step 3: Delete the two `should_emit_no_file` tests**

Remove lines 593-616 (both test functions):
```rust
    #[test]
    fn should_emit_no_file_when_main_has_no_file() {
        ...
    }

    #[test]
    fn should_not_emit_no_file_when_main_has_file() {
        ...
    }
```

**Step 4: Verify it compiles**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: compiles with no errors

**Step 5: Run tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: all remaining tests pass

**Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "fix: remove 200ms timer and should_emit_no_file — eliminates race condition"
```

---

### Task 3: Remove `showCurrentWindow` and `no-file` listener from frontend

**Files:**
- Modify: `src/renderer.js:3` (delete `tauriWindowNamespace`)
- Modify: `src/renderer.js:23-32` (delete `showCurrentWindow` function)
- Modify: `src/renderer.js:162-166` (remove `showCurrentWindow()` call from `bundle-ready` listener)
- Modify: `src/renderer.js:168-171` (remove `showCurrentWindow()` call from `bundle-error` listener)
- Modify: `src/renderer.js:173-175` (delete `no-file` listener)
- Modify: `src/renderer.js:218-228` (remove `showCurrentWindow()` call from `request_bundle` handler)

**Step 1: Delete `tauriWindowNamespace` variable**

Remove line 3:
```javascript
const tauriWindowNamespace = window.__TAURI__.webviewWindow || window.__TAURI__.window || {};
```

**Step 2: Delete `showCurrentWindow` function**

Remove lines 23-32:
```javascript
function showCurrentWindow() {
  try {
    const getter = tauriWindowNamespace.getCurrentWindow;
    if (typeof getter !== 'function') return;
    const current = getter();
    if (current && typeof current.show === 'function') {
      current.show();
    }
  } catch {}
}
```

**Step 3: Remove `showCurrentWindow()` from `bundle-ready` listener**

Change lines 162-166 from:
```javascript
listen('bundle-ready', (event) => {
  fileLoaded = true;
  showCurrentWindow();
  renderBundle(event.payload);
});
```
to:
```javascript
listen('bundle-ready', (event) => {
  fileLoaded = true;
  renderBundle(event.payload);
});
```

**Step 4: Remove `showCurrentWindow()` from `bundle-error` listener**

Change lines 168-171 from:
```javascript
listen('bundle-error', (event) => {
  showCurrentWindow();
  showError(event.payload);
});
```
to:
```javascript
listen('bundle-error', (event) => {
  showError(event.payload);
});
```

**Step 5: Delete `no-file` listener**

Remove lines 173-175:
```javascript
listen('no-file', () => {
  showCurrentWindow();
});
```

**Step 6: Remove `showCurrentWindow()` from `request_bundle` handler**

Change lines 218-228 from:
```javascript
invoke('request_bundle')
  .then(bundledCode => {
    fileLoaded = true;
    showCurrentWindow();
    renderBundle(bundledCode);
  })
  .catch(err => {
    if (err !== 'No file loaded') {
      showError(`Failed to load:\n${err}`);
    }
  });
```
to:
```javascript
invoke('request_bundle')
  .then(bundledCode => {
    fileLoaded = true;
    renderBundle(bundledCode);
  })
  .catch(err => {
    if (err !== 'No file loaded') {
      showError(`Failed to load:\n${err}`);
    }
  });
```

**Step 7: Commit**

```bash
git add src/renderer.js
git commit -m "fix: remove showCurrentWindow and no-file listener — window starts visible"
```

---

### Task 4: Manual verification

**Step 1: Build the app**

Run: `cargo tauri build --bundles app`
Expected: builds successfully

**Step 2: Test cold-start file open**

1. Quit Terrarium completely
2. In Finder, double-click a `.tsx` file
3. Verify: exactly ONE window opens, component renders

**Step 3: Test direct launch**

1. Quit Terrarium completely
2. Open Terrarium from Applications or `cargo tauri dev`
3. Verify: ONE window with welcome screen

**Step 4: Test warm-start file open**

1. With Terrarium running (welcome screen showing)
2. Double-click a `.tsx` file in Finder
3. Verify: file loads in the existing window, no second window
