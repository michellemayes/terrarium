# Fix Cold-Start Duplicate Window (v2)

## Problem

Double-clicking a `.tsx` file in Finder from cold start opens two windows: one with the rendered component and one with the welcome/lander screen. Three prior fixes attempted to solve this with timing heuristics (200ms delay, atomic state checks, API fallbacks). All failed because the underlying architecture has a race condition between `RunEvent::Opened`, the delayed welcome-screen task, and the frontend boot sequence.

## Root Cause

The current approach starts the main window hidden and uses a 200ms timer to decide whether to show the welcome screen. This races against `RunEvent::Opened` (macOS file-open event). When the timer fires before or concurrently with the Opened event, both paths can trigger window creation or visibility changes that result in two visible windows.

## Solution

Stop fighting the race. Start the main window visible. Remove the timer entirely.

The welcome screen is the default HTML content and appears instantly. When `RunEvent::Opened` fires, it loads the file into the existing main window. The `bundle-ready` event replaces the welcome screen with the rendered component. No second window is ever created.

## Changes

### 1. `src-tauri/tauri.conf.json`

Change `"visible": false` to `"visible": true`.

### 2. `src-tauri/src/lib.rs`

Delete:
- `should_emit_no_file()` function
- The 200ms delayed task in `.setup()` (the block that sleeps, checks state, emits `no-file`, and shows the window)

Keep unchanged:
- `RunEvent::Opened` handler (already reuses main when available)
- `spawn_bundle_and_watch` (emits `bundle-ready`)
- Everything else

### 3. `src/renderer.js`

Delete:
- `tauriWindowNamespace` variable (line 3)
- `showCurrentWindow()` function and all four call sites
- `no-file` event listener

Keep unchanged:
- `invoke('request_bundle')` on boot (handles pre-loaded files)
- `bundle-ready` and `bundle-error` listeners

## Behavior After Fix

| Scenario | Result |
|---|---|
| Double-click .tsx in Finder (cold start) | Window shows welcome screen briefly, then component renders. One window. |
| Open Terrarium directly (no file) | Window shows welcome screen. Stays. One window. |
| Double-click .tsx while app running | `RunEvent::Opened` reuses main or creates new window. Same as before. |
| Drag-drop onto running app | Same as before. |
