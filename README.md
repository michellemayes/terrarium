# TSX Viewer

View Claude Artifact TSX files locally. A lightweight macOS app that renders TSX components with auto-installed dependencies and live reload.

## Install

Download the latest `.dmg` from [Releases](https://github.com/OWNER/tsx-viewer/releases).

## Usage

- **Double-click** a `.tsx` file in Finder (after setting TSX Viewer as default)
- **Drag and drop** a `.tsx` file onto the app icon
- **CLI:** `tsx-viewer myfile.tsx`

Files auto-reload when edited externally. Build errors show in a collapsible bottom banner while keeping the last good render visible.

## Requirements

- macOS 12+
- Node.js 18+ (for transpiling TSX files)

## Development

```bash
npm install
cd src-tauri/resources && npm install && cd ../..
npm run tauri dev
```

## Testing

```bash
# Node.js tests (bundler + renderer)
npm test

# Rust tests
cd src-tauri && cargo test
```
