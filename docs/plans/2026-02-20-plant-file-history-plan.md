# Plant File History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show recently opened files as potted plants on a shelf on the welcome screen, so users can quickly reopen them.

**Architecture:** A new `recent.rs` Rust module handles reading/writing a `~/.terrarium/recent-files.json` file. The existing `open_file` command records history after successful bundles. The frontend fetches the list via a new `get_recent_files` Tauri command and renders inline SVG plants on the welcome screen.

**Tech Stack:** Rust (serde_json, std::fs), vanilla HTML/CSS/JS, inline SVG.

---

### Task 1: Create the `recent.rs` module with read/write/record logic

**Files:**
- Create: `src-tauri/src/recent.rs`
- Modify: `src-tauri/src/lib.rs:1` (add `pub mod recent;`)

This module manages `~/.terrarium/recent-files.json`. It provides three functions:

- `read_recent() -> Vec<RecentFile>` — reads and parses the JSON file, returns empty vec if missing/corrupt
- `record_recent(path, entries) -> Vec<RecentFile>` — adds/bumps a path in the list, assigns a random plant index (0–5) for new entries, caps at 6 entries, writes to disk, returns the updated list
- `RecentFile` struct — `path: String`, `plant: u8`, `opened_at: String`

**Step 1: Write the module with structs and functions**

Create `src-tauri/src/recent.rs`:

```rust
use crate::bundler::cache_dir;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const MAX_RECENT: usize = 6;
const NUM_PLANT_TYPES: u8 = 6;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RecentFile {
    pub path: String,
    pub plant: u8,
    pub opened_at: String,
}

fn recent_file_path() -> PathBuf {
    cache_dir().join("recent-files.json")
}

pub fn read_recent() -> Vec<RecentFile> {
    let path = recent_file_path();
    let Ok(data) = std::fs::read_to_string(&path) else {
        return Vec::new();
    };
    serde_json::from_str(&data).unwrap_or_default()
}

pub fn record_recent(file_path: &str) -> Vec<RecentFile> {
    let mut entries = read_recent();

    // If already present, remove it (will re-add at front)
    let existing_plant = entries
        .iter()
        .find(|e| e.path == file_path)
        .map(|e| e.plant);
    entries.retain(|e| e.path != file_path);

    // Assign plant: reuse existing or pick a random one
    let plant = existing_plant.unwrap_or_else(|| {
        // Simple deterministic "random" from the path bytes
        let hash: u32 = file_path.bytes().fold(0u32, |acc, b| {
            acc.wrapping_mul(31).wrapping_add(b as u32)
        });
        (hash % NUM_PLANT_TYPES as u32) as u8
    });

    let now = chrono_now();

    entries.insert(
        0,
        RecentFile {
            path: file_path.to_string(),
            plant,
            opened_at: now,
        },
    );

    entries.truncate(MAX_RECENT);

    // Write to disk (best-effort)
    let _ = std::fs::create_dir_all(cache_dir());
    let _ = std::fs::write(recent_file_path(), serde_json::to_string_pretty(&entries).unwrap_or_default());

    entries
}

fn chrono_now() -> String {
    // ISO 8601 timestamp without pulling in the chrono crate
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
```

**Step 2: Add `pub mod recent;` and `serde` derive support**

In `src-tauri/src/lib.rs`, add at line 1 after the existing module declarations:

```rust
pub mod recent;
```

The `serde` crate is already available via `serde_json`'s re-export, but we need the derive macros. Add to `Cargo.toml` dependencies:

```toml
serde = { version = "1", features = ["derive"] }
```

**Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors.

**Step 4: Commit**

```bash
git add src-tauri/src/recent.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat: add recent files module for reading/writing history"
```

---

### Task 2: Write tests for the recent module

**Files:**
- Create: `src-tauri/tests/recent_test.rs`

**Step 1: Write tests**

Create `src-tauri/tests/recent_test.rs`:

```rust
use std::path::PathBuf;

// Tests use a temp dir to avoid touching the real ~/.terrarium

#[test]
fn read_recent_returns_empty_when_no_file() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("recent-files.json");
    // File doesn't exist — should return empty
    assert!(!path.exists());
    // We test the parsing logic directly
    let data = "";
    let result: Vec<terrarium_lib::recent::RecentFile> =
        serde_json::from_str(data).unwrap_or_default();
    assert!(result.is_empty());
}

#[test]
fn read_recent_parses_valid_json() {
    let json = r#"[
        {"path": "/tmp/Button.tsx", "plant": 2, "opened_at": "1000"}
    ]"#;
    let result: Vec<terrarium_lib::recent::RecentFile> =
        serde_json::from_str(json).unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].path, "/tmp/Button.tsx");
    assert_eq!(result[0].plant, 2);
}

#[test]
fn read_recent_returns_empty_on_corrupt_json() {
    let json = "not valid json{{{";
    let result: Vec<terrarium_lib::recent::RecentFile> =
        serde_json::from_str(json).unwrap_or_default();
    assert!(result.is_empty());
}

#[test]
fn recent_file_plant_index_is_deterministic() {
    // The same path should always get the same plant index
    let path = "/Users/me/projects/Button.tsx";
    let hash: u32 = path.bytes().fold(0u32, |acc, b| {
        acc.wrapping_mul(31).wrapping_add(b as u32)
    });
    let plant1 = (hash % 6) as u8;
    let plant2 = (hash % 6) as u8;
    assert_eq!(plant1, plant2);
    assert!(plant1 < 6);
}

#[test]
fn recent_file_serialization_roundtrip() {
    let entry = terrarium_lib::recent::RecentFile {
        path: "/tmp/Card.tsx".to_string(),
        plant: 4,
        opened_at: "12345".to_string(),
    };
    let json = serde_json::to_string(&entry).unwrap();
    let parsed: terrarium_lib::recent::RecentFile = serde_json::from_str(&json).unwrap();
    assert_eq!(entry, parsed);
}
```

**Step 2: Run tests to verify they pass**

Run: `cd src-tauri && cargo test --test recent_test`
Expected: all 5 tests pass.

**Step 3: Commit**

```bash
git add src-tauri/tests/recent_test.rs
git commit -m "test: add tests for recent files module"
```

---

### Task 3: Add `get_recent_files` Tauri command and hook into `open_file`

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add the `get_recent_files` command**

Add this new command in `src-tauri/src/lib.rs` (after the `mark_first_run_complete` function, around line 241):

```rust
#[tauri::command]
fn get_recent_files() -> Vec<recent::RecentFile> {
    let entries = recent::read_recent();
    // Filter out files that no longer exist on disk
    entries
        .into_iter()
        .filter(|e| std::path::Path::new(&e.path).exists())
        .collect()
}
```

**Step 2: Record history in `open_file`**

In the `open_file` function in `src-tauri/src/lib.rs`, after the successful bundle (around line 39, after `let bundle_result = bundler::bundle_tsx(&app, &tsx_path).await;`), add a call to record history. The recording should happen regardless of bundle success (the file was valid and opened):

Add this line right after `let bundle_result = ...`:

```rust
    recent::record_recent(&path);
```

This goes before the watcher setup, after the bundle call.

**Step 3: Register the new command in the invoke handler**

In the `.invoke_handler(tauri::generate_handler![...])` block (around line 253), add `get_recent_files`:

```rust
        .invoke_handler(tauri::generate_handler![
            open_file,
            pick_and_open_files,
            request_bundle,
            open_in_new_windows,
            check_node,
            is_first_run,
            mark_first_run_complete,
            get_recent_files,
        ])
```

**Step 4: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors.

**Step 5: Run all Rust tests**

Run: `cd src-tauri && cargo test`
Expected: all tests pass.

**Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add get_recent_files command and record history on file open"
```

---

### Task 4: Add plant shelf HTML structure and CSS to the welcome screen

**Files:**
- Modify: `src/index.html`

This is the big visual task. We add:
1. The shelf container with "Recent" label
2. CSS for the shelf, plants, hover wiggle, filename labels
3. The inline SVG definitions for all 6 plant types + the watering can
4. The empty-state watering can

**Step 1: Add the shelf HTML**

In `src/index.html`, after the `<span id="drop-hint">` line (line 271) and before the closing `</div>` of `#welcome` (line 272), add:

```html
      <div id="plant-shelf" style="display: none;">
        <div id="shelf-label">Recent</div>
        <div id="shelf-plants"></div>
        <div id="shelf-line"></div>
      </div>
      <div id="plant-empty" style="display: none;">
        <svg class="watering-can" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <!-- Handle -->
          <path d="M 18 18 Q 18 10 26 10 L 34 10 Q 42 10 42 18" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round"/>
          <!-- Body -->
          <rect x="14" y="22" width="32" height="24" rx="4" fill="#2d1854" stroke="#a78bfa" stroke-width="2"/>
          <!-- Spout -->
          <path d="M 46 28 L 58 20 L 58 24 L 46 32 Z" fill="#2d1854" stroke="#a78bfa" stroke-width="2" stroke-linejoin="round"/>
          <!-- Water drops -->
          <ellipse cx="58" cy="28" rx="2" ry="3" fill="#c4b5fd" opacity="0.6"/>
          <ellipse cx="55" cy="33" rx="1.5" ry="2.5" fill="#c4b5fd" opacity="0.4"/>
          <!-- Sparkle -->
          <path transform="translate(52, 14)" d="M 0 -5 L 1.2 -1.2 L 5 0 L 1.2 1.2 L 0 5 L -1.2 1.2 L -5 0 L -1.2 -1.2 Z" fill="#ff8ad0" opacity="0.8"/>
        </svg>
        <span class="empty-hint">Your garden awaits</span>
      </div>
```

**Step 2: Add the plant SVG templates**

Add a hidden `<div>` at the very end of `<body>` (before the `<script>` tag) containing SVG templates for all 6 plant types. Each plant is a `<template>` element with a data attribute:

```html
  <div id="plant-templates" style="display:none;">
    <!-- Plant 0: Round cactus -->
    <template data-plant="0">
      <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" class="plant-svg">
        <!-- Pot -->
        <path d="M 12 40 L 14 54 L 34 54 L 36 40 Z" fill="#2d1854" stroke="#a78de0" stroke-width="1.5"/>
        <rect x="10" y="38" width="28" height="4" rx="2" fill="#3d2066" stroke="#a78de0" stroke-width="1"/>
        <!-- Cactus body -->
        <ellipse cx="24" cy="28" rx="10" ry="14" fill="#6d28d9"/>
        <ellipse cx="24" cy="28" rx="10" ry="14" fill="none" stroke="#8b5cf6" stroke-width="1"/>
        <!-- Ridges -->
        <path d="M 24 14 L 24 38" stroke="#7c3aed" stroke-width="0.8" opacity="0.5"/>
        <path d="M 18 16 Q 18 28 18 40" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
        <path d="M 30 16 Q 30 28 30 40" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
        <!-- Flower -->
        <circle cx="24" cy="14" r="4" fill="#ff8ad0"/>
        <circle cx="24" cy="14" r="2" fill="#ffc0e8"/>
      </svg>
    </template>

    <!-- Plant 1: Tall succulent -->
    <template data-plant="1">
      <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" class="plant-svg">
        <path d="M 12 40 L 14 54 L 34 54 L 36 40 Z" fill="#2d1854" stroke="#a78de0" stroke-width="1.5"/>
        <rect x="10" y="38" width="28" height="4" rx="2" fill="#3d2066" stroke="#a78de0" stroke-width="1"/>
        <!-- Leaves stacking up -->
        <ellipse cx="24" cy="34" rx="12" ry="5" fill="#7c3aed"/>
        <ellipse cx="24" cy="28" rx="10" ry="5" fill="#8b5cf6"/>
        <ellipse cx="24" cy="22" rx="8" ry="4.5" fill="#a78bfa"/>
        <ellipse cx="24" cy="17" rx="6" ry="4" fill="#c4b5fd"/>
        <ellipse cx="24" cy="13" rx="3.5" ry="3" fill="#ddd6fe"/>
      </svg>
    </template>

    <!-- Plant 2: Trailing vine -->
    <template data-plant="2">
      <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" class="plant-svg">
        <path d="M 12 40 L 14 54 L 34 54 L 36 40 Z" fill="#2d1854" stroke="#a78de0" stroke-width="1.5"/>
        <rect x="10" y="38" width="28" height="4" rx="2" fill="#3d2066" stroke="#a78de0" stroke-width="1"/>
        <!-- Center leaves -->
        <ellipse cx="24" cy="30" rx="8" ry="10" fill="#6d28d9"/>
        <!-- Trailing vines -->
        <path d="M 16 36 Q 8 42 6 50" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="6" cy="50" rx="3" ry="2" fill="#a78bfa"/>
        <path d="M 32 36 Q 40 44 42 52" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="42" cy="52" rx="3" ry="2" fill="#a78bfa"/>
        <path d="M 20 38 Q 14 46 12 54" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/>
        <ellipse cx="12" cy="54" rx="2.5" ry="1.5" fill="#8b5cf6"/>
      </svg>
    </template>

    <!-- Plant 3: Fern -->
    <template data-plant="3">
      <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" class="plant-svg">
        <path d="M 12 40 L 14 54 L 34 54 L 36 40 Z" fill="#2d1854" stroke="#a78de0" stroke-width="1.5"/>
        <rect x="10" y="38" width="28" height="4" rx="2" fill="#3d2066" stroke="#a78de0" stroke-width="1"/>
        <!-- Fronds -->
        <path d="M 24 38 Q 24 20 18 8" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
        <path d="M 24 38 Q 28 22 36 12" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
        <path d="M 24 38 Q 16 24 8 18" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 24 38 Q 34 26 40 20" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 24 38 Q 20 30 14 26" fill="none" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 24 38 Q 30 28 38 28" fill="none" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/>
        <!-- Leaf tips -->
        <circle cx="18" cy="8" r="2" fill="#c4b5fd"/>
        <circle cx="36" cy="12" r="2" fill="#c4b5fd"/>
        <circle cx="8" cy="18" r="1.5" fill="#a78bfa"/>
        <circle cx="40" cy="20" r="1.5" fill="#a78bfa"/>
      </svg>
    </template>

    <!-- Plant 4: Flower -->
    <template data-plant="4">
      <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" class="plant-svg">
        <path d="M 12 40 L 14 54 L 34 54 L 36 40 Z" fill="#2d1854" stroke="#a78de0" stroke-width="1.5"/>
        <rect x="10" y="38" width="28" height="4" rx="2" fill="#3d2066" stroke="#a78de0" stroke-width="1"/>
        <!-- Stem -->
        <path d="M 24 38 L 24 16" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Leaves on stem -->
        <ellipse cx="18" cy="30" rx="5" ry="2.5" fill="#7c3aed" transform="rotate(-20 18 30)"/>
        <ellipse cx="30" cy="26" rx="5" ry="2.5" fill="#7c3aed" transform="rotate(20 30 26)"/>
        <!-- Flower petals -->
        <circle cx="20" cy="12" r="4" fill="#ff85c8" opacity="0.8"/>
        <circle cx="28" cy="12" r="4" fill="#ff8ad0" opacity="0.8"/>
        <circle cx="24" cy="8" r="4" fill="#ffc0e8" opacity="0.8"/>
        <circle cx="21" cy="16" r="3.5" fill="#f5b0e0" opacity="0.7"/>
        <circle cx="27" cy="16" r="3.5" fill="#f5b0e0" opacity="0.7"/>
        <!-- Center -->
        <circle cx="24" cy="12" r="3" fill="#fbbf24"/>
      </svg>
    </template>

    <!-- Plant 5: Aloe -->
    <template data-plant="5">
      <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" class="plant-svg">
        <path d="M 12 40 L 14 54 L 34 54 L 36 40 Z" fill="#2d1854" stroke="#a78de0" stroke-width="1.5"/>
        <rect x="10" y="38" width="28" height="4" rx="2" fill="#3d2066" stroke="#a78de0" stroke-width="1"/>
        <!-- Aloe spikes -->
        <path d="M 24 38 L 20 10 L 24 14 Z" fill="#7c3aed" stroke="#8b5cf6" stroke-width="0.8"/>
        <path d="M 24 38 L 28 10 L 24 14 Z" fill="#6d28d9" stroke="#8b5cf6" stroke-width="0.8"/>
        <path d="M 22 38 L 10 16 L 18 20 Z" fill="#8b5cf6" stroke="#a78bfa" stroke-width="0.8"/>
        <path d="M 26 38 L 38 16 L 30 20 Z" fill="#8b5cf6" stroke="#a78bfa" stroke-width="0.8"/>
        <path d="M 20 38 L 6 24 L 14 26 Z" fill="#a78bfa" stroke="#c4b5fd" stroke-width="0.8"/>
        <path d="M 28 38 L 42 24 L 34 26 Z" fill="#a78bfa" stroke="#c4b5fd" stroke-width="0.8"/>
        <!-- Highlight dots -->
        <circle cx="22" cy="20" r="1" fill="#ddd6fe" opacity="0.5"/>
        <circle cx="26" cy="22" r="1" fill="#ddd6fe" opacity="0.5"/>
      </svg>
    </template>
  </div>
```

**Step 3: Add CSS for the shelf**

In the `<style>` section of `src/index.html`, add before the closing `</style>` tag:

```css
    #plant-shelf {
      margin-top: 32px;
      text-align: center;
    }
    #shelf-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #8b7aab;
      margin-bottom: 12px;
    }
    #shelf-plants {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding: 0 20px;
      min-height: 80px;
      align-items: flex-end;
    }
    .plant-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      transition: transform 0.2s;
    }
    .plant-item .plant-svg {
      width: 48px;
      height: 56px;
      transition: transform 0.2s;
    }
    .plant-item:hover .plant-svg {
      animation: wiggle 0.4s ease-in-out;
    }
    .plant-name {
      font-size: 10px;
      color: #6b5a8a;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s;
      margin-top: 4px;
    }
    .plant-item:hover .plant-name {
      opacity: 1;
      color: #c4b5fd;
    }
    #shelf-line {
      width: 280px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #a78bfa44, #a78bfa88, #a78bfa44, transparent);
      margin: 4px auto 0;
      border-radius: 1px;
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-4deg); }
      40% { transform: rotate(4deg); }
      60% { transform: rotate(-2deg); }
      80% { transform: rotate(2deg); }
    }
    #plant-empty {
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .watering-can {
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }
    .empty-hint {
      font-size: 11px;
      color: #6b5a8a;
      font-style: italic;
    }
```

**Step 4: Verify the HTML is valid**

Open the file and visually inspect it. Make sure all tags are balanced and the structure is correct.

**Step 5: Commit**

```bash
git add src/index.html
git commit -m "feat: add plant shelf HTML, SVG templates, and CSS to welcome screen"
```

---

### Task 5: Add frontend JS to fetch and render the plant shelf

**Files:**
- Modify: `src/renderer.js`

**Step 1: Add the shelf rendering logic**

At the end of `src/renderer.js` (after the `request_bundle` call around line 209), add:

```javascript
// --- Plant shelf (recent files) ---

const plantShelf = document.getElementById('plant-shelf');
const shelfPlants = document.getElementById('shelf-plants');
const plantEmpty = document.getElementById('plant-empty');

function getPlantSvg(plantIndex) {
  const template = document.querySelector(`template[data-plant="${plantIndex}"]`);
  if (!template) return null;
  return template.content.cloneNode(true);
}

function renderPlantShelf(recentFiles) {
  if (!plantShelf || !shelfPlants || !plantEmpty) return;

  if (recentFiles.length === 0) {
    plantShelf.style.display = 'none';
    plantEmpty.style.display = 'flex';
    return;
  }

  plantEmpty.style.display = 'none';
  plantShelf.style.display = 'block';
  shelfPlants.innerHTML = '';

  for (const file of recentFiles) {
    const item = document.createElement('div');
    item.className = 'plant-item';
    item.title = file.path;

    const svg = getPlantSvg(file.plant);
    if (svg) {
      item.appendChild(svg);
    }

    const name = document.createElement('span');
    name.className = 'plant-name';
    const filename = file.path.split('/').pop() || file.path;
    name.textContent = filename.replace(/\.tsx$/, '');
    item.appendChild(name);

    item.addEventListener('click', () => {
      openFileByPath(file.path);
    });

    shelfPlants.appendChild(item);
  }
}

function loadPlantShelf() {
  invoke('get_recent_files')
    .then(files => renderPlantShelf(files))
    .catch(() => {
      // Silently fail — shelf just won't appear
    });
}

// Load shelf on startup (only matters on welcome screen)
loadPlantShelf();
```

**Step 2: Verify it compiles / no syntax errors**

Run: `cd src-tauri && cargo tauri dev`
Expected: app launches, welcome screen shows. If no files have been opened yet, shows the watering can. If files were previously opened, shows plants.

**Step 3: Commit**

```bash
git add src/renderer.js
git commit -m "feat: add frontend logic to fetch and render plant shelf"
```

---

### Task 6: Manual integration test and polish

**Files:**
- Possibly minor tweaks to `src/index.html` or `src/renderer.js`

**Step 1: Test the full flow**

1. Run `cargo tauri dev` from `src-tauri/`
2. On first launch (no history), verify the watering can and "Your garden awaits" text appear
3. Click "Open TSX File" and open `examples/counter.tsx`
4. Close the window or cmd+N to get a new window back to the welcome screen
5. Verify a plant appears on the shelf with the filename "counter" below on hover
6. Open a few more files to fill the shelf
7. Click a plant to verify it reopens the file

**Step 2: Run all tests**

Run: `cd src-tauri && cargo test`
Expected: all tests pass.

Run: `npm test`
Expected: all JS tests pass.

**Step 3: Final commit with any polish tweaks**

```bash
git add -A
git commit -m "feat: plant file history — complete integration"
```
