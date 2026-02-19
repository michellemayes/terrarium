<p align="center">
  <img src="src-tauri/icons/icon.svg" width="128" height="128" alt="Terrarium icon" />
</p>

<h1 align="center">Terrarium</h1>

<p align="center">
  <strong>A tiny terrarium to view your TSX components</strong>
  <br />
  A contained Tauri viewing environment where they can live and grow.
</p>

<p align="center">
  <a href="https://github.com/michellemayes/terrarium/releases"><img src="https://img.shields.io/github/v/release/michellemayes/terrarium?style=flat-square&color=7c3aed" alt="Release" /></a>
  <a href="https://github.com/michellemayes/terrarium/actions"><img src="https://img.shields.io/github/actions/workflow/status/michellemayes/terrarium/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://github.com/michellemayes/terrarium/blob/master/LICENSE"><img src="https://img.shields.io/github/license/michellemayes/terrarium?style=flat-square&color=a78bfa" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-macOS-e9d5ff?style=flat-square" alt="macOS" />
</p>

---

Claude generates beautiful TSX artifacts &mdash; interactive dashboards, data visualizations, mini-apps &mdash; but they live trapped inside a chat window. **Terrarium sets them free.**

Drop any `.tsx` file into Terrarium and it renders instantly as a standalone app. No `create-react-app`, no `package.json`, no setup. Terrarium reads the imports, installs the dependencies, bundles everything with esbuild, and shows you a live preview. Edit the file and it hot-reloads automatically.

## The Workflow

**Claude.ai &rarr; your file system &rarr; Terrarium**

1. **Generate** &mdash; Use Claude Desktop to build something as an Artifact. A dashboard, a form, a game, a chart &mdash; anything that renders as a React component.

2. **Export** &mdash; Click the download button on the Artifact to save it as a `.tsx` file, or copy the code into a new file.

3. **Preview** &mdash; Open the file in Terrarium. Double-click it, drag it onto the dock icon, or run `terrarium myfile.tsx` from your terminal.

4. **Iterate** &mdash; Edit the file in your editor or with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and watch Terrarium live-reload your changes. Go from chat prototype to polished local app without ever spinning up a dev server.

## Features

- **Open anywhere** &mdash; double-click, drag-and-drop, file picker, or CLI
- **Zero config** &mdash; auto-detects and installs npm dependencies from imports
- **Instant preview** &mdash; bundles with esbuild and renders the default export as a React component
- **Live reload** &mdash; watches for file changes and re-renders on save
- **Error overlay** &mdash; build errors appear in a collapsible banner while keeping the last good render visible
- **Tailwind built in** &mdash; Tailwind CSS available out of the box

## Install

Download the latest `.dmg` from [**Releases**](https://github.com/michellemayes/terrarium/releases).

### Requirements

- macOS 12+
- Node.js 18+

## Usage

```bash
# Open from the command line
terrarium myfile.tsx
```

Or launch the app and click **Open TSX File**, or drag a `.tsx` file onto the dock icon.

### Works great with Claude Code

Use Claude Code to iterate on your Artifacts without leaving the terminal. Terrarium watches the file and live-reloads every time Claude Code saves a change:

```bash
# In one terminal
terrarium dashboard.tsx

# In another terminal
claude "add a dark mode toggle to dashboard.tsx"
```

## Development

```bash
# Install dependencies
npm install
cd src-tauri/resources && npm install && cd ../..

# Run in dev mode
npm run tauri dev
```

## Testing

```bash
# Node.js tests (bundler + renderer)
npm test

# Rust tests
cd src-tauri && cargo test
```

## Built With

- [Tauri](https://tauri.app) &mdash; native app shell
- [esbuild](https://esbuild.github.io) &mdash; TSX bundling
- [React](https://react.dev) &mdash; component rendering
- [Tailwind CSS](https://tailwindcss.com) &mdash; styling

## License

[MIT](LICENSE)
