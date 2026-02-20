# Fix Double Window on Cold Start

## Problem

Double-clicking a `.tsx` file in Finder when Terrarium is not running opens two windows showing the same file. macOS delivers the file path through two channels simultaneously:

1. **CLI arguments** — picked up by `.setup()` in `lib.rs` (lines 354-430)
2. **`RunEvent::Opened`** — the macOS file-open event, handled in `.run()` (lines 446-483)

`.setup()` loads the file into "main", then `RunEvent::Opened` fires. Since "main" already has a file, `main_available` is false, and a second window is created.

## Solution

Remove CLI file-argument handling from `.setup()`. Let `RunEvent::Opened` be the sole handler for file-association opens. To prevent a welcome-screen flash during the brief gap between app launch and the `Opened` event, start the main window hidden and show it from the frontend when content is ready.

## Changes

### 1. `src-tauri/tauri.conf.json`

Add `"visible": false` to the main window config so it starts hidden.

### 2. `src-tauri/src/lib.rs` — `.setup()` handler

Remove the CLI arg parsing block (lines 354-395) and the file-loading logic (lines 407-430). Replace with:

- Spawn the updater check (keep as-is)
- Start a delayed task: wait ~200ms, then check if "main" still has no file loaded. If so, emit `no-file` and show the window. This gives `RunEvent::Opened` time to deliver the file before falling back to the welcome screen.

The CLI plugin config in `tauri.conf.json` can be removed since we no longer parse CLI args.

### 3. `src-tauri/src/lib.rs` — `RunEvent::Opened` handler

No logic changes needed. After `spawn_bundle_and_watch` succeeds for the main window, show the window via `window.show()`.

### 4. `src/renderer.js` — frontend

Add a `window.show()` call (via Tauri's `appWindow.show()`) when either:
- `bundle-ready` fires (file loaded successfully)
- `no-file` fires (welcome screen should appear)

This ensures the window only becomes visible once there's meaningful content.

## Behavior After Fix

| Scenario | What happens |
|---|---|
| Double-click .tsx in Finder (cold start) | App launches hidden. `RunEvent::Opened` loads file into main. Window shown. One window. |
| Open Terrarium directly (no file) | App launches hidden. After ~200ms timeout, `no-file` emits. Welcome screen renders. Window shown. |
| Double-click .tsx while app is running | `RunEvent::Opened` fires. Reuses main if available, otherwise new window. Same as today. |
| Drag-drop onto running app | Same as today, no change. |

## Risks

- The 200ms delay adds minor latency to the "open app with no file" path. Acceptable since users opening Terrarium directly expect to interact with the welcome screen, not see instant content.
- If `RunEvent::Opened` takes longer than 200ms on some machines, the welcome screen could flash briefly before the file loads. This is unlikely but could be mitigated by increasing the timeout or by having the frontend suppress the welcome screen if a `bundle-ready` arrives shortly after.
