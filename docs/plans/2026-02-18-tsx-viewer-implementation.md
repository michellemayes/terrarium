# tsx-viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight macOS desktop app that renders Claude Artifact TSX files locally using Tauri v2 with an esbuild sidecar.

**Architecture:** Tauri v2 app with Rust core (window management, file watching, IPC), a Node.js esbuild sidecar (transpile TSX, bundle deps, auto-install npm packages), and a WebKit webview (render React components with Tailwind CSS).

**Tech Stack:** Rust, Tauri v2, esbuild, Node.js, React, TypeScript, notify crate, tauri-plugin-updater, tauri-plugin-cli

---

### Task 1: Scaffold Tauri v2 Project

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/build.rs`
- Create: `package.json`
- Create: `src/index.html`
- Create: `.gitignore`

**Step 1: Initialize the Tauri project**

Run:
```bash
npm create tauri-app@latest . -- --template vanilla-ts --manager npm --identifier com.tsx-viewer.app --yes
```

If the interactive scaffold doesn't work cleanly (directory not empty), manually create the structure.

**Step 2: Verify scaffold works**

Run:
```bash
cd src-tauri && cargo check
```
Expected: Compiles without errors.

**Step 3: Update `src-tauri/Cargo.toml` with required dependencies**

```toml
[package]
name = "tsx-viewer"
version = "0.1.0"
description = "A lightweight TSX file viewer for Claude Artifacts"
authors = [""]
edition = "2021"

[lib]
name = "tsx_viewer_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
tauri-plugin-opener = "2"
tauri-plugin-cli = "2"
tauri-plugin-dialog = "2"
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
notify = { version = "7", features = ["macos_fsevent"] }
tokio = { version = "1", features = ["rt-multi-thread", "macros", "process"] }
log = "0.4"
dirs = "6"
```

**Step 4: Configure `src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TSX Viewer",
  "version": "0.1.0",
  "identifier": "com.tsx-viewer.app",
  "build": {
    "frontendDist": "../src",
    "devUrl": "http://localhost:1420"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "TSX Viewer",
        "width": 1024,
        "height": 768,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    },
    "macOSPrivateApi": true
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "resources/bundler.mjs"
    ],
    "fileAssociations": [
      {
        "ext": ["tsx"],
        "mimeType": "text/typescript-jsx",
        "description": "TypeScript JSX file",
        "role": "Viewer"
      }
    ],
    "macOS": {
      "dmg": {
        "appPosition": { "x": 180, "y": 170 },
        "applicationFolderPosition": { "x": 480, "y": 170 },
        "windowSize": { "width": 660, "height": 400 }
      }
    },
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "cli": {
      "args": [
        {
          "name": "file",
          "index": 1,
          "takesValue": true,
          "description": "TSX file path to open"
        }
      ]
    },
    "updater": {
      "endpoints": [
        "https://github.com/OWNER/tsx-viewer/releases/latest/download/latest.json"
      ]
    }
  }
}
```

**Step 5: Set up capabilities**

Create `src-tauri/capabilities/default.json`:
```json
{
  "identifier": "default",
  "description": "Default capabilities for tsx-viewer",
  "windows": ["*"],
  "permissions": [
    "core:default",
    "opener:default",
    "cli:default",
    "dialog:default",
    "updater:default",
    "process:default"
  ]
}
```

**Step 6: Verify it compiles**

Run:
```bash
cd src-tauri && cargo check
```
Expected: Compiles without errors.

**Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Tauri v2 project with dependencies and config"
```

---

### Task 2: Create App Icon (SVG)

**Files:**
- Create: `src-tauri/icons/icon.svg`
- Create: `src-tauri/icons/32x32.png`
- Create: `src-tauri/icons/128x128.png`
- Create: `src-tauri/icons/128x128@2x.png`
- Create: `src-tauri/icons/icon.icns`
- Create: `src-tauri/icons/icon.ico`

**Step 1: Create the master SVG icon**

Create `src-tauri/icons/icon.svg` — a neon-style icon with:
- Dark purple rounded-square background with subtle gradient
- Bright cyan/magenta neon `</>` bracket motif centered
- Soft glow effect on the brackets using SVG filters (feGaussianBlur, feComposite)
- Lucide-inspired clean geometric strokes (2-3px weight, round caps)
- 1024x1024 viewBox for high-res export

The SVG should use:
- `<defs>` for gradient and glow filter
- `<rect>` with rx/ry for rounded background
- `<path>` or `<polyline>` for the `</>` brackets
- `<filter>` with `feGaussianBlur` for neon glow

**Step 2: Generate PNG and platform icons from SVG**

Use the `tauri icon` command or manual export:
```bash
npx @anthropic/tauri-cli icon src-tauri/icons/icon.svg
```

If that doesn't work, use ImageMagick or `rsvg-convert`:
```bash
rsvg-convert -w 32 -h 32 src-tauri/icons/icon.svg > src-tauri/icons/32x32.png
rsvg-convert -w 128 -h 128 src-tauri/icons/icon.svg > src-tauri/icons/128x128.png
rsvg-convert -w 256 -h 256 src-tauri/icons/icon.svg > src-tauri/icons/128x128@2x.png
```

For `.icns` and `.ico`, use `png2icns` or `iconutil` on macOS.

**Step 3: Verify icons exist at all required paths**

Run:
```bash
ls -la src-tauri/icons/
```
Expected: All icon files present.

**Step 4: Commit**

```bash
git add src-tauri/icons/
git commit -m "Add neon-style app icon with all platform sizes"
```

---

### Task 3: Build the esbuild Bundler Sidecar

**Files:**
- Create: `src-tauri/resources/bundler.mjs`
- Create: `src-tauri/resources/package.json`

**Step 1: Create the bundler package.json**

Create `src-tauri/resources/package.json`:
```json
{
  "name": "tsx-viewer-bundler",
  "private": true,
  "type": "module",
  "dependencies": {
    "esbuild": "^0.24.0"
  }
}
```

**Step 2: Install esbuild locally**

Run:
```bash
cd src-tauri/resources && npm install
```

**Step 3: Write the bundler script**

Create `src-tauri/resources/bundler.mjs`:

```javascript
#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CACHE_DIR = path.join(os.homedir(), '.tsx-viewer');
const NODE_MODULES = path.join(CACHE_DIR, 'node_modules');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  // Initialize package.json if missing
  const pkgPath = path.join(CACHE_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'tsx-viewer-cache', private: true }, null, 2));
  }
}

function installPackages(packages) {
  if (packages.length === 0) return;
  const pkgList = packages.join(' ');
  console.error(`[tsx-viewer] Installing: ${pkgList}`);
  execSync(`npm install --prefix "${CACHE_DIR}" ${pkgList}`, {
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 120000
  });
}

function isInstalled(pkg) {
  try {
    const pkgDir = path.join(NODE_MODULES, pkg.split('/')[0]);
    return fs.existsSync(pkgDir);
  } catch {
    return false;
  }
}

async function bundle(inputFile) {
  ensureCacheDir();

  // Ensure React is installed
  const basePackages = ['react', 'react-dom'];
  const missingBase = basePackages.filter(p => !isInstalled(p));
  if (missingBase.length > 0) {
    installPackages(missingBase);
  }

  // First pass: detect missing packages
  const missing = new Set();

  const detectPlugin = {
    name: 'detect-missing',
    setup(build) {
      // Match bare specifiers (npm packages), not relative/absolute paths
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        const pkg = args.path.startsWith('@')
          ? args.path.split('/').slice(0, 2).join('/')
          : args.path.split('/')[0];

        if (!isInstalled(pkg) && !basePackages.includes(pkg)) {
          missing.add(pkg);
          // Mark as external so the first pass doesn't fail
          return { path: args.path, external: true };
        }
        return undefined;
      });
    }
  };

  await esbuild.build({
    entryPoints: [inputFile],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    jsxImportSource: 'react',
    write: false,
    outfile: 'out.js',
    plugins: [detectPlugin],
    nodePaths: [NODE_MODULES],
    logLevel: 'silent'
  });

  // Install any missing packages found
  if (missing.size > 0) {
    installPackages(Array.from(missing));
  }

  // Second pass: full bundle with everything installed
  const result = await esbuild.build({
    entryPoints: [inputFile],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    jsx: 'automatic',
    jsxImportSource: 'react',
    write: false,
    outfile: 'out.js',
    nodePaths: [NODE_MODULES],
    minify: false,
    sourcemap: false,
    logLevel: 'warning'
  });

  // Output bundled JS to stdout
  process.stdout.write(result.outputFiles[0].text);
}

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: bundler.mjs <file.tsx>');
  process.exit(1);
}

bundle(path.resolve(inputFile)).catch(err => {
  // Output error as JSON so Rust can parse it
  const errorPayload = JSON.stringify({
    error: true,
    message: err.message,
    errors: err.errors || []
  });
  process.stdout.write(errorPayload);
  process.exit(1);
});
```

**Step 4: Test the bundler manually**

Create a test TSX file:
```bash
cat > /tmp/test-component.tsx << 'EOF'
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)} className="bg-blue-500 text-white px-4 py-2 rounded">
        Increment
      </button>
    </div>
  );
}
EOF
```

Run:
```bash
node src-tauri/resources/bundler.mjs /tmp/test-component.tsx > /tmp/test-output.js
```
Expected: `/tmp/test-output.js` contains bundled JavaScript with React inlined.

**Step 5: Test with an external dependency**

```bash
cat > /tmp/test-recharts.tsx << 'EOF'
import { LineChart, Line, XAxis, YAxis } from "recharts";

const data = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 3 }];

export default function Chart() {
  return (
    <LineChart width={400} height={300} data={data}>
      <XAxis dataKey="x" />
      <YAxis />
      <Line type="monotone" dataKey="y" stroke="#8884d8" />
    </LineChart>
  );
}
EOF
```

Run:
```bash
node src-tauri/resources/bundler.mjs /tmp/test-recharts.tsx > /tmp/test-recharts-output.js
```
Expected: Recharts gets auto-installed to `~/.tsx-viewer/node_modules/`, bundled JS output is produced.

**Step 6: Commit**

```bash
git add src-tauri/resources/bundler.mjs src-tauri/resources/package.json
git commit -m "Add esbuild bundler sidecar with auto-install"
```

---

### Task 4: Create Webview HTML Shell

**Files:**
- Create: `src/index.html`
- Create: `src/renderer.js`

**Step 1: Write the HTML shell**

Create `src/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TSX Viewer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; min-height: 100vh; }
    #root { min-height: 100vh; }
    #error-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      color: #ff6b6b;
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 14px;
      padding: 24px;
      overflow: auto;
      z-index: 9999;
      white-space: pre-wrap;
    }
    #error-overlay.visible { display: block; }
    #loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: -apple-system, system-ui, sans-serif;
      color: #888;
    }
  </style>
</head>
<body>
  <div id="root">
    <div id="loading">Loading component...</div>
  </div>
  <div id="error-overlay"></div>
  <script type="module" src="renderer.js"></script>
</body>
</html>
```

**Step 2: Write the renderer script**

Create `src/renderer.js`:
```javascript
const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const root = document.getElementById('root');
const errorOverlay = document.getElementById('error-overlay');

function showError(message) {
  errorOverlay.textContent = message;
  errorOverlay.classList.add('visible');
}

function hideError() {
  errorOverlay.classList.remove('visible');
}

async function renderBundle(bundledCode) {
  try {
    hideError();

    // Create a blob URL from the bundled code
    const blob = new Blob([bundledCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    // Import the module
    const mod = await import(url);
    URL.revokeObjectURL(url);

    const Component = mod.default;
    if (!Component) {
      showError('No default export found in TSX file.\nThe file must export a React component as its default export.');
      return;
    }

    // Import React and ReactDOM from the bundle
    // They're bundled into the code, so we need to get them from there
    // Instead, we'll inject a small wrapper that renders the component
    const wrapperCode = `
      ${bundledCode}
      import { createRoot } from 'react-dom/client';
      const rootEl = document.getElementById('root');
      rootEl.innerHTML = '';
      const reactRoot = createRoot(rootEl);
      const Comp = typeof exports !== 'undefined' && exports.default ? exports.default : null;
    `;

    // Simpler approach: inject the bundled code with a render wrapper
    root.innerHTML = '';
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      ${bundledCode}
      ;(async () => {
        const { createRoot } = await import('https://esm.sh/react-dom@18/client');
        const rootEl = document.getElementById('root');
        const mod = { ${bundledCode.includes('export default') ? '' : ''} };
      })();
    `;

  } catch (err) {
    showError(`Render error:\n${err.message}\n\n${err.stack || ''}`);
  }
}

// Listen for bundle updates from Rust
listen('bundle-ready', (event) => {
  renderBundle(event.payload);
});

// Listen for errors from Rust
listen('bundle-error', (event) => {
  showError(event.payload);
});

// Request initial bundle on load
invoke('request_bundle').catch(err => {
  showError(`Failed to request bundle:\n${err}`);
});
```

Note: The renderer approach above is a starting sketch. The actual rendering strategy needs refinement — see Task 7 for the proper implementation that uses a self-contained HTML page generated by Rust with the bundle inlined.

**Step 3: Commit**

```bash
git add src/index.html src/renderer.js
git commit -m "Add webview HTML shell and renderer"
```

---

### Task 5: Implement Rust Core — File Opening & CLI Args

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/bundler.rs`

**Step 1: Write `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tsx_viewer_lib::run();
}
```

**Step 2: Write `src-tauri/src/bundler.rs`**

This module handles invoking the esbuild sidecar:

```rust
use std::path::{Path, PathBuf};
use std::process::Command;
use tokio::process::Command as AsyncCommand;

pub fn cache_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".tsx-viewer")
}

pub fn bundler_script_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .resolve("resources/bundler.mjs", tauri::path::BaseDirectory::Resource)
        .expect("Failed to resolve bundler.mjs resource path")
}

pub async fn bundle_tsx(app_handle: &tauri::AppHandle, tsx_path: &Path) -> Result<String, String> {
    let bundler = bundler_script_path(app_handle);

    let output = AsyncCommand::new("node")
        .arg(&bundler)
        .arg(tsx_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run bundler: {e}"))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        // Check if output is a JSON error
        if stdout.starts_with("{\"error\":true") {
            return Err(stdout);
        }
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Bundler failed:\n{stderr}"))
    }
}
```

**Step 3: Write `src-tauri/src/lib.rs`**

```rust
mod bundler;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

struct AppState {
    current_file: Mutex<Option<PathBuf>>,
}

#[tauri::command]
async fn open_file(app: tauri::AppHandle, state: State<'_, AppState>, path: String) -> Result<String, String> {
    let tsx_path = PathBuf::from(&path);
    if !tsx_path.exists() {
        return Err(format!("File not found: {path}"));
    }

    // Update current file
    *state.current_file.lock().unwrap() = Some(tsx_path.clone());

    // Set window title
    if let Some(window) = app.get_webview_window("main") {
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{filename} — TSX Viewer"));
    }

    // Bundle the TSX file
    bundler::bundle_tsx(&app, &tsx_path).await
}

#[tauri::command]
async fn request_bundle(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let file = state.current_file.lock().unwrap().clone();
    match file {
        Some(path) => bundler::bundle_tsx(&app, &path).await,
        None => Err("No file loaded".to_string()),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            current_file: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![open_file, request_bundle])
        .setup(|app| {
            // Handle CLI arguments
            if let Ok(matches) = app.cli().matches() {
                if let Some(file_arg) = matches.args.get("file") {
                    if let Some(path) = file_arg.value.as_str() {
                        let resolved = std::fs::canonicalize(path)
                            .unwrap_or_else(|_| PathBuf::from(path));
                        *app.state::<AppState>().current_file.lock().unwrap() = Some(resolved);
                    }
                }
            }

            // If no file provided, show file dialog
            let state = app.state::<AppState>();
            if state.current_file.lock().unwrap().is_none() {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_dialog::DialogExt;
                    let file = app_handle.dialog().file()
                        .add_filter("TSX Files", &["tsx"])
                        .blocking_pick_file();
                    if let Some(path) = file {
                        let state = app_handle.state::<AppState>();
                        *state.current_file.lock().unwrap() = Some(path.path().to_path_buf());
                        let _ = app_handle.emit("file-selected", ());
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 4: Verify it compiles**

Run:
```bash
cd src-tauri && cargo check
```
Expected: Compiles without errors.

**Step 5: Commit**

```bash
git add src-tauri/src/
git commit -m "Implement Rust core with file opening, CLI args, and bundler invocation"
```

---

### Task 6: Implement File Watching & Live Reload

**Files:**
- Create: `src-tauri/src/watcher.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write the file watcher module**

Create `src-tauri/src/watcher.rs`:

```rust
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::Emitter;

pub fn watch_file(app_handle: tauri::AppHandle, path: PathBuf) -> Result<RecommendedWatcher, String> {
    let (tx, rx) = mpsc::channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    watcher
        .watch(&path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch file: {e}"))?;

    let watched_path = path.clone();

    // Spawn a thread to process file change events
    std::thread::spawn(move || {
        let mut last_rebuild = Instant::now();
        let debounce = Duration::from_millis(300);

        for event in rx {
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) => {
                    // Debounce rapid changes
                    if last_rebuild.elapsed() < debounce {
                        continue;
                    }
                    last_rebuild = Instant::now();

                    let app = app_handle.clone();
                    let path = watched_path.clone();
                    tauri::async_runtime::spawn(async move {
                        match crate::bundler::bundle_tsx(&app, &path).await {
                            Ok(bundle) => {
                                let _ = app.emit("bundle-ready", bundle);
                            }
                            Err(err) => {
                                let _ = app.emit("bundle-error", err);
                            }
                        }
                    });
                }
                _ => {}
            }
        }
    });

    Ok(watcher)
}
```

**Step 2: Integrate watcher into lib.rs**

Add to `AppState`:
```rust
use notify::RecommendedWatcher;

struct AppState {
    current_file: Mutex<Option<PathBuf>>,
    watcher: Mutex<Option<RecommendedWatcher>>,
}
```

Add a command to start watching after file is opened:
```rust
#[tauri::command]
async fn watch_current_file(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let file = state.current_file.lock().unwrap().clone();
    if let Some(path) = file {
        let watcher = crate::watcher::watch_file(app, path)?;
        *state.watcher.lock().unwrap() = Some(watcher);
    }
    Ok(())
}
```

Update `manage()`:
```rust
.manage(AppState {
    current_file: Mutex::new(None),
    watcher: Mutex::new(None),
})
```

Add `watch_current_file` to `invoke_handler`.

**Step 3: Verify it compiles**

Run:
```bash
cd src-tauri && cargo check
```
Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add src-tauri/src/watcher.rs src-tauri/src/lib.rs
git commit -m "Add file watching with debounced live reload"
```

---

### Task 7: Refine Webview Renderer

**Files:**
- Modify: `src/index.html`
- Modify: `src/renderer.js`

**Step 1: Rewrite the renderer for proper module loading**

The bundled output from esbuild is a self-contained ESM module. The renderer needs to:
1. Receive the bundled JS string from Rust via IPC
2. Create a blob URL from it
3. Dynamically import the blob URL to get the default export
4. Render the component with React (which is bundled inside the blob)

However, since React and ReactDOM are bundled into the output, we need a different approach. The bundler should output code that self-renders. Update `src-tauri/resources/bundler.mjs` to wrap the output:

Add to the end of `bundler.mjs`'s `bundle()` function, after the second esbuild pass:

```javascript
// Wrap the bundled code to self-render
const bundledCode = result.outputFiles[0].text;
const wrappedCode = `
${bundledCode}
// Auto-render wrapper
import { createRoot } from 'react-dom/client';
const rootEl = document.getElementById('root');
rootEl.innerHTML = '';
const reactRoot = createRoot(rootEl);
// Find the default export - esbuild names it based on the component
const _defaultExport = typeof exports !== 'undefined' ? exports.default : undefined;
`;
```

Actually, a cleaner approach: have the bundler produce TWO outputs — the component bundle and a render wrapper. Or simpler: have the Rust side generate a complete HTML page that includes the bundle inline.

Update the approach: Instead of the webview loading a static HTML file that then receives bundles via IPC, have Rust generate a full HTML string and load it directly into the webview via `webview.eval()` or by setting the HTML content.

Rewrite `src/renderer.js`:

```javascript
const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const errorOverlay = document.getElementById('error-overlay');

function showError(message) {
  errorOverlay.textContent = message;
  errorOverlay.classList.add('visible');
}

function hideError() {
  errorOverlay.classList.remove('visible');
}

async function renderBundle(bundledCode) {
  try {
    hideError();
    const root = document.getElementById('root');
    root.innerHTML = '';

    // Create a blob URL for the bundled ESM module
    const blob = new Blob([bundledCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    // Dynamically import the module (React/ReactDOM are bundled inside)
    const mod = await import(/* @vite-ignore */ url);
    URL.revokeObjectURL(url);

    if (mod.default) {
      // The bundle includes React, so import it from the bundle too
      // We need react-dom/client. Since it's bundled, we use the global approach.
      // Better: have the bundler emit a self-executing render.
    }
  } catch (err) {
    showError(`Render error:\n${err.message}\n\n${err.stack || ''}`);
  }
}

// Listen for bundle updates from Rust
listen('bundle-ready', (event) => {
  renderBundle(event.payload);
});

listen('bundle-error', (event) => {
  showError(event.payload);
});

// Tell Rust the webview is ready
invoke('request_bundle').catch(err => {
  showError(`Failed to load:\n${err}`);
});
```

The cleanest solution: modify the **bundler to produce a self-rendering bundle**. Update `bundler.mjs` to append a render call that imports `react-dom/client` (which is bundled) and calls `createRoot`. This is done by creating a virtual entry point that imports the user's file and renders it.

**Step 2: Update bundler.mjs to produce self-rendering output**

Replace the second esbuild pass in `bundler.mjs` with:

```javascript
// Create a virtual entry that imports the component and renders it
const entryCode = `
  import Component from ${JSON.stringify(path.resolve(inputFile))};
  import { createRoot } from 'react-dom/client';

  const root = document.getElementById('root');
  root.innerHTML = '';
  createRoot(root).render(
    typeof Component === 'function'
      ? Component.prototype?.isReactComponent
        ? new Component()
        : Component()
      : Component
  );
`;

const result = await esbuild.build({
  stdin: {
    contents: entryCode,
    resolveDir: path.dirname(path.resolve(inputFile)),
    loader: 'tsx',
  },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  jsx: 'automatic',
  jsxImportSource: 'react',
  write: false,
  outfile: 'out.js',
  nodePaths: [NODE_MODULES],
  minify: false,
});
```

This way the output is a single JS file that, when loaded as a `<script type="module">`, renders the component into `#root`.

The renderer.js then simplifies to just injecting a `<script>` tag:

```javascript
async function renderBundle(bundledCode) {
  try {
    hideError();
    const root = document.getElementById('root');
    root.innerHTML = '';

    // Remove any previous script
    const prev = document.getElementById('tsx-bundle');
    if (prev) prev.remove();

    // Create blob URL and load as module script
    const blob = new Blob([bundledCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    const script = document.createElement('script');
    script.id = 'tsx-bundle';
    script.type = 'module';
    script.src = url;
    script.onerror = () => showError('Failed to execute bundle');
    document.body.appendChild(script);
  } catch (err) {
    showError(`Render error:\n${err.message}`);
  }
}
```

**Step 3: Verify end-to-end manually**

Run:
```bash
node src-tauri/resources/bundler.mjs /tmp/test-component.tsx > /tmp/bundle.js
cat /tmp/bundle.js | head -5
```
Expected: Output should contain self-rendering code that imports `createRoot` and mounts the component.

**Step 4: Commit**

```bash
git add src/index.html src/renderer.js src-tauri/resources/bundler.mjs
git commit -m "Refine renderer to use self-executing bundles"
```

---

### Task 8: End-to-End Integration & First Run

**Files:**
- Modify: `src-tauri/src/lib.rs` (wire everything together)
- Modify: `src-tauri/tauri.conf.json` (dev server config)

**Step 1: Update lib.rs to emit bundle on startup**

In the `setup()` closure, after determining the file to open, trigger the initial bundle and emit it to the webview:

```rust
.setup(|app| {
    let app_handle = app.handle().clone();

    // Handle CLI arguments
    if let Ok(matches) = app.cli().matches() {
        if let Some(file_arg) = matches.args.get("file") {
            if let Some(path) = file_arg.value.as_str() {
                let resolved = std::fs::canonicalize(path)
                    .unwrap_or_else(|_| PathBuf::from(path));
                *app.state::<AppState>().current_file.lock().unwrap() = Some(resolved);
            }
        }
    }

    // Check if we have a file; if not, show dialog
    let has_file = app.state::<AppState>().current_file.lock().unwrap().is_some();

    if !has_file {
        let handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            use tauri_plugin_dialog::DialogExt;
            let file = handle.dialog().file()
                .add_filter("TSX Files", &["tsx"])
                .blocking_pick_file();
            if let Some(picked) = file {
                let path = picked.path().to_path_buf();
                let state = handle.state::<AppState>();
                *state.current_file.lock().unwrap() = Some(path.clone());

                // Bundle and emit
                match bundler::bundle_tsx(&handle, &path).await {
                    Ok(bundle) => { let _ = handle.emit("bundle-ready", bundle); }
                    Err(err) => { let _ = handle.emit("bundle-error", err); }
                }

                // Start watching
                if let Ok(w) = watcher::watch_file(handle.clone(), path) {
                    *state.watcher.lock().unwrap() = Some(w);
                }
            }
        });
    } else {
        // File provided via CLI — bundle it
        let handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let state = handle.state::<AppState>();
            let path = state.current_file.lock().unwrap().clone().unwrap();

            // Set window title
            if let Some(window) = handle.get_webview_window("main") {
                let name = path.file_name().unwrap_or_default().to_string_lossy();
                let _ = window.set_title(&format!("{name} — TSX Viewer"));
            }

            match bundler::bundle_tsx(&handle, &path).await {
                Ok(bundle) => { let _ = handle.emit("bundle-ready", bundle); }
                Err(err) => { let _ = handle.emit("bundle-error", err); }
            }

            if let Ok(w) = watcher::watch_file(handle.clone(), path) {
                *state.watcher.lock().unwrap() = Some(w);
            }
        });
    }

    Ok(())
})
```

**Step 2: Test the full app in dev mode**

Run:
```bash
npm run tauri dev -- /tmp/test-component.tsx
```
Expected: A window opens showing the rendered Counter component with a working increment button.

**Step 3: Test live reload**

With the app running, edit `/tmp/test-component.tsx` in another editor. Change the title text.
Expected: The app auto-reloads and shows the updated text within ~300ms.

**Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "Wire up end-to-end: CLI open, bundle, render, and live reload"
```

---

### Task 9: GitHub Actions Publish Workflow

**Files:**
- Create: `.github/workflows/publish.yml`

**Step 1: Write the publish workflow**

Create `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: "--target aarch64-apple-darwin"
          - platform: macos-latest
            args: "--target x86_64-apple-darwin"
    runs-on: ${{ matrix.platform }}
    env:
      RELEASE_TAG: ${{ github.ref_name }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ env.RELEASE_TAG }}

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - uses: swatinem/rust-cache@v2
        with:
          workspaces: "./src-tauri -> target"

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install frontend dependencies
        run: npm install

      - name: Install bundler dependencies
        run: cd src-tauri/resources && npm install

      - name: Validate release tag
        run: |
          if [[ ! "$RELEASE_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Invalid RELEASE_TAG: $RELEASE_TAG"
            exit 1
          fi

      - name: Validate version consistency
        run: |
          TAG_VERSION="${RELEASE_TAG#v}"
          TAURI_VERSION=$(node -p 'require("./src-tauri/tauri.conf.json").version')
          CARGO_VERSION=$(awk -F'"' '/^version =/ { print $2; exit }' ./src-tauri/Cargo.toml)
          PKG_VERSION=$(node -p 'require("./package.json").version')

          for name_ver in "tauri.conf.json:$TAURI_VERSION" "Cargo.toml:$CARGO_VERSION" "package.json:$PKG_VERSION"; do
            name="${name_ver%%:*}"
            ver="${name_ver##*:}"
            if [[ "$ver" != "$TAG_VERSION" ]]; then
              echo "$name version ($ver) != tag version ($TAG_VERSION)"
              exit 1
            fi
          done

      - name: Import Apple Developer Certificate
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          echo "$APPLE_CERTIFICATE" | base64 --decode > certificate.p12
          security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security set-keychain-settings -t 3600 -u build.keychain
          security import certificate.p12 -k build.keychain \
            -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: \
            -s -k "$KEYCHAIN_PASSWORD" build.keychain
          rm certificate.p12

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        with:
          tagName: ${{ env.RELEASE_TAG }}
          releaseName: ${{ env.RELEASE_TAG }}
          releaseDraft: false
          prerelease: false
          includeUpdaterJson: true
          args: ${{ matrix.args }}

      - name: Verify updater assets
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ASSETS=$(gh release view "$RELEASE_TAG" --json assets --jq '.assets[].name')
          echo "$ASSETS" | grep -q 'latest.json' || { echo "Missing latest.json"; exit 1; }
          echo "$ASSETS" | grep -qE '\.sig$' || { echo "Missing .sig files"; exit 1; }
```

**Step 2: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "Add GitHub Actions publish workflow for macOS builds"
```

---

### Task 10: Final Polish & README

**Files:**
- Create: `README.md`

**Step 1: Write a minimal README**

```markdown
# TSX Viewer

View Claude Artifact TSX files locally. A lightweight macOS app that renders TSX components with auto-installed dependencies and live reload.

## Install

Download the latest `.dmg` from [Releases](https://github.com/OWNER/tsx-viewer/releases).

## Usage

- **Double-click** a `.tsx` file in Finder (after setting TSX Viewer as default)
- **Drag and drop** a `.tsx` file onto the app icon
- **CLI:** `tsx-viewer myfile.tsx`

Files auto-reload when edited externally.

## Requirements

- macOS 12+
- Node.js 18+ (for transpiling TSX files)

## Development

```bash
npm install
cd src-tauri/resources && npm install && cd ../..
npm run tauri dev
```
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with install and usage instructions"
```

---

## Required GitHub Secrets (for CI/CD)

Before the first release, configure these repository secrets:

| Secret | Purpose |
|--------|---------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 Developer ID certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `APPLE_SIGNING_IDENTITY` | e.g., "Developer ID Application: Your Name (TEAMID)" |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `KEYCHAIN_PASSWORD` | Arbitrary password for CI keychain |
| `TAURI_SIGNING_PRIVATE_KEY` | Generated by `tauri signer generate` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key |

Generate the Tauri signing key pair:
```bash
npx @tauri-apps/cli signer generate
```
