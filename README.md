# Terrarium

A tiny terrarium for your TSX components — a contained environment where they can live and grow.

Terrarium is a lightweight macOS app that renders standalone TSX files instantly. It was built for previewing [Claude Artifacts](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) locally: drop in a `.tsx` file and Terrarium auto-installs its npm dependencies, bundles it with esbuild, and renders the component in a live preview. When you edit the file externally, it hot-reloads automatically.

## Features

- Opens `.tsx` files via double-click, drag-and-drop, file picker, or CLI
- Auto-detects and installs npm dependencies from imports
- Bundles with esbuild and renders the default export as a React component
- Watches for file changes and live-reloads on save
- Build errors appear in a collapsible banner while keeping the last good render visible
- Tailwind CSS available out of the box

## Install

Download the latest `.dmg` from [Releases](https://github.com/michellemayes/terrarium/releases).

## Usage

- **Double-click** a `.tsx` file in Finder (after setting Terrarium as the default app)
- **Drag and drop** a `.tsx` file onto the app icon
- **CLI:** `terrarium myfile.tsx`
- **File picker:** Launch the app with no arguments to browse for a file

## Requirements

- macOS 12+
- Node.js 18+ (for bundling TSX files)

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
