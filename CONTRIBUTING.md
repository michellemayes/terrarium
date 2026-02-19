# Contributing to Terrarium

Thanks for your interest in contributing! Here's how to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable)
- macOS (Terrarium currently targets macOS only)

## Setup

```bash
git clone https://github.com/michellemayes/terrarium.git
cd terrarium
npm install
cd src-tauri/resources && npm install && cd ../..
```

## Development

Run the app in dev mode:

```bash
npm run tauri dev
```

Pass a TSX file directly:

```bash
npm run tauri dev -- -- test.tsx
```

## Testing

```bash
npm test                        # Node tests (bundler, renderer)
cd src-tauri && cargo test      # Rust tests
```

## Project Structure

```
src/                  # Frontend (HTML + vanilla JS)
  index.html          # Welcome screen, error banner, drop overlay
  renderer.js         # Event handling, bundle rendering, drag-and-drop
src-tauri/
  src/lib.rs          # App setup, commands, native menu
  src/bundler.rs      # Spawns the Node bundler process
  src/watcher.rs      # File system watcher (auto-reload on save)
  resources/
    bundler.mjs       # esbuild-based TSX bundler with auto-install
tests/                # Vitest test suites
```

## Making Changes

1. Fork the repo and create a branch from `master`
2. Make your changes
3. Add or update tests if applicable
4. Run `cargo fmt` and `cargo clippy` before committing
5. Open a pull request against `master`

## Code Style

- **Rust**: Follow `rustfmt` defaults. No warnings from `clippy`.
- **JavaScript**: Keep it vanilla — no build step for the frontend.

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- macOS version and any relevant details
