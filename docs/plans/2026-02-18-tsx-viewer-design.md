# tsx-viewer Design

A lightweight macOS desktop app for viewing Claude Artifact TSX files locally.

## Architecture

Tauri v2 desktop app with three layers:

- **Rust core** — window management, file I/O, file watching (`notify` crate), IPC with webview and sidecar
- **esbuild sidecar** — Node.js script that transpiles TSX, bundles dependencies, auto-installs missing npm packages
- **Webview (WebKit)** — renders the bundled component in a minimal HTML shell with React and Tailwind

```
+----------------------------------+
|  macOS .app (Tauri v2)           |
|  +------------+  +-------------+ |
|  | Rust Core  |--| Webview     | |
|  | - file io  |  | (WebKit)    | |
|  | - watcher  |  | - render    | |
|  | - IPC      |  | - errors    | |
|  +-----+------+  +-------------+ |
|        |                          |
|  +-----v-------------------+     |
|  | esbuild sidecar         |     |
|  | - transpile TSX         |     |
|  | - bundle deps           |     |
|  | - auto-install npm pkgs |     |
|  +-------------------------+     |
+----------------------------------+
```

## esbuild Sidecar & Dependency Management

A small `bundler.mjs` script (~50-100 lines) bundled as a Tauri resource.

When the app opens a TSX file:

1. esbuild's resolver identifies required packages
2. Missing packages are installed into `~/.tsx-viewer/node_modules/` via npm (or bun if available)
3. esbuild transpiles TSX to JS and bundles all dependencies into a single ESM file (`--bundle --format=esm --jsx=automatic`)
4. The bundled JS is returned to the Rust side via stdout

React and ReactDOM are pre-installed into the cache on first launch. The cache is shared across all TSX files.

## Webview & UI

The webview loads a minimal HTML shell that:

- Mounts the default-exported React component into a `<div id="root">` via `createRoot`
- Includes Tailwind CSS via CDN (most Claude artifacts use Tailwind)
- Shows a styled error overlay if transpilation or rendering fails

Window chrome:

- Standard macOS title bar showing the filename
- No toolbar or sidebar — entire window is the rendered component
- Resizable window for testing responsive behavior
- One file per window; opening another file opens a new window

## File Opening

- **CLI:** `tsx-viewer ./component.tsx` opens a window rendering that file
- **File dialog:** Launch with no args to get a native macOS Open File dialog filtered to `.tsx`
- **Finder:** Double-click a `.tsx` file after setting tsx-viewer as default handler
- **Drag and drop:** Drag `.tsx` onto the app icon or into an open window

## File Watching & Live Reload

The Rust side uses the `notify` crate to watch the open `.tsx` file. On change:

1. Re-invoke esbuild sidecar
2. Push new bundle to webview via Tauri IPC
3. Webview hot-swaps the rendered content

Errors during re-bundle display as an overlay; they dismiss automatically on the next successful render.

## Distribution & Auto-Updates

Following the Tauri v2 standard pattern (same as OpenUsage):

- **Installation:** `.dmg` downloaded from GitHub Releases, drag to Applications
- **Auto-updates:** `tauri-plugin-updater` checks `https://github.com/<owner>/tsx-viewer/releases/latest/download/latest.json` on launch
- **Release workflow:** GitHub Actions triggered by `v*` tags
  - Builds for `aarch64-apple-darwin` (Apple Silicon) and `x86_64-apple-darwin` (Intel)
  - Code-signs and notarizes with Apple Developer certificate
  - Uploads `.dmg`, `.app.tar.gz`, signatures, and `latest.json` to GitHub Releases
  - Validates version consistency across `tauri.conf.json`, `Cargo.toml`, and `package.json`

## macOS File Association

Configured in `tauri.conf.json` under `bundle.fileAssociations` to register the app as a handler for `.tsx` files. Users can set it as default via Finder > Get Info.

## App Icon

Neon-style hand-crafted SVG icon:

- Dark purple background with minimal gradient
- Bright neon `</>` code bracket motif with soft glow
- Lucide-inspired clean geometric stroke style
- Rounded-square shape matching macOS icon conventions
- Exported at all Tauri-required sizes (32x32, 128x128, 128x128@2x, .icns, .ico)
