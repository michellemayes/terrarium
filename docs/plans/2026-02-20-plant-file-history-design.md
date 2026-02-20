# Plant File History — Design

A recent-files feature on the Terrarium welcome screen, where previously opened files appear as small potted plants on a shelf.

## Data Model

Storage: `~/.terrarium/recent-files.json`

```json
[
  { "path": "/Users/me/projects/Button.tsx", "plant": 3, "opened_at": "2026-02-20T10:30:00Z" }
]
```

- **Max 6 entries**, most-recent first.
- `plant` is a stable random index (0–5) assigned on first entry, so the same file always gets the same plant type.
- Reopening a file bumps it to the front but keeps its plant index.
- When a 7th file is added, the oldest entry is dropped.

## Backend (Rust)

**New command**: `get_recent_files()` — reads the JSON, filters out paths that no longer exist on disk, returns the list.

**Recording**: The existing `open_file` command writes to the history file after a successful bundle. This covers every open path: file picker, drag-and-drop, CLI args, and clicking a plant on the shelf.

No new Tauri plugins or dependencies.

## Visual Design

The shelf appears on the welcome screen between the "Open TSX File" button and the drop hint.

### Shelf

- Subtle horizontal line using the purple palette.
- Plants sit in a centered, evenly-spaced row.
- Each plant is ~40–48px tall (pot included).
- A small "Recent" label above in `#8b7aab`.
- A few neon-pink 4-pointed sparkles (matching the logo) scattered around the shelf.

### Plant Varieties (6 types, inline SVG)

All drawn in the purple/pink/lavender palette. Each sits in a small pot (rounded trapezoid, dark purple gradient matching the terrarium's glass panels).

1. **Round cactus** — small round body, pink flower on top.
2. **Tall succulent** — layered leaves stacking upward.
3. **Trailing vine** — leaves draping over the pot edge.
4. **Fern** — delicate fronds fanning out.
5. **Flower** — single stem with a bloom in pink sparkle colors.
6. **Aloe** — spiky pointed leaves.

### Hover

- Plant wiggles gently (CSS `@keyframes` rotate animation).
- Filename fades in below the pot (truncated with ellipsis, ~80px max width).

### Empty State

When there is no history (first launch): a single watering can SVG centered where the shelf would be, with faint text "Your garden awaits" in `#6b5a8a`.

## Interaction

- **Click a plant** → calls `open_file` with that path; opens in the current window.
- **Dead files** → `get_recent_files` silently removes paths that no longer exist on disk.
- **No menu changes** — the shelf is a welcome-screen convenience only.
- **No window-title changes** — already handled by `open_file`.
