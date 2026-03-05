# Changelog

All notable changes to Terrarium are documented in this file.

## [0.3.0] - 2026-03-05

### Bug Fixes

- Use generate-notes API for release notes automation by @michellemayes
- Load all files when dropping multiple files (#12) by @michellemayes in [#12](https://github.com/michellemayes/terrarium/pull/12)
- Use emit_to for targeted window events in multi-file opens (#13) by @michellemayes in [#13](https://github.com/michellemayes/terrarium/pull/13)
- Improve release notes generation with safer file-based approach (#17) by @michellemayes in [#17](https://github.com/michellemayes/terrarium/pull/17)

### Features

- Add JSX support alongside TSX (#18) by @michellemayes in [#18](https://github.com/michellemayes/terrarium/pull/18)
- Pre-install common dependencies for instant artifact rendering (#16) by @michellemayes in [#16](https://github.com/michellemayes/terrarium/pull/16)
- Add auto-update notification on app open (#19) by @michellemayes in [#19](https://github.com/michellemayes/terrarium/pull/19)
- Add Next.js landing page for Vercel deployment (#21) by @michellemayes in [#21](https://github.com/michellemayes/terrarium/pull/21)

## [0.2.2] - 2026-02-20

### Bug Fixes

- Support tauri window API fallback for direct file opens (#8) by @michellemayes in [#8](https://github.com/michellemayes/terrarium/pull/8)
- Eliminate cold-start duplicate window bug (#9) by @michellemayes in [#9](https://github.com/michellemayes/terrarium/pull/9)
- Decouple cold-start file open from window existence check (#10) by @michellemayes in [#10](https://github.com/michellemayes/terrarium/pull/10)

## [0.2.1] - 2026-02-20

### Features

- Add multi-window support for opening multiple TSX files (#3) by @michellemayes in [#3](https://github.com/michellemayes/terrarium/pull/3)

## [0.1.0] - 2026-02-19

### Fix

- Load esbuild from user cache instead of bundled node_modules by @michellemayes


