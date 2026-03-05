# Changelog

All notable changes to Terrarium are documented in this file.

## [Unreleased]

### Bug Fixes

- Use generate-notes API for release notes automation
- Load all files when dropping multiple files (#12)
- Use emit_to for targeted window events in multi-file opens (#13)
- Improve release notes generation with safer file-based approach (#17)

### Documentation

- Add commit linting and changelog generation design
- Add commit linting and changelog implementation plan

### Features

- Add JSX support alongside TSX (#18)
- Pre-install common dependencies for instant artifact rendering (#16)
- Add auto-update notification on app open (#19)

## [0.2.2] - 2026-02-20

### Bug Fixes

- Support tauri window API fallback for direct file opens (#8)
- Eliminate cold-start duplicate window bug (#9)
- Decouple cold-start file open from window existence check (#10)

## [0.2.1] - 2026-02-20

### Features

- Add multi-window support for opening multiple TSX files (#3)

## [0.1.0] - 2026-02-19

### Fix

- Load esbuild from user cache instead of bundled node_modules


