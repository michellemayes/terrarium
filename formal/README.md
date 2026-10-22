# Formal models

TLA+ models of Terrarium's concurrent code and a Lean 4 proof about the plant
shelf. Each v1.0.1 model has a counterexample, which is reproduced by a Rust
or JS test in this repo. Each fixed model passes and describes the current
code.

Run everything with `formal/check.sh` (needs Java 11+ and [elan](https://github.com/leanprover/elan); downloads `tla2tools.jar` on first use).

## Models

| Model | Code | Property | v1.0.1 | Fixed | Test |
|---|---|---|---|---|---|
| `tla/HotReload.tla` | `watcher.rs`, `open_file` | `Converges`: once idle, the window shows the latest save | Violated: a save during the first bundle is never seen | `HotReloadFixed.tla` passes | `watcher_ordering_test::save_during_initial_bundle_is_rendered` |
| | | `Converges` with `HotReload_debounce.cfg` | Violated: the leading-edge debounce drops a save that lands within 300 ms of the previous one | passes | `second_of_two_quick_saves_is_rendered` |
| | | `Monotonic`: the render never goes back to an older version | Violated: rebuilds ran as detached tasks, so a slow older one could finish last | passes | `slow_older_rebuild_does_not_overwrite_newer_one` |
| `tla/Windows.tla` | `AppState.windows`, `open_file`, `spawn_bundle_and_watch`, `RunEvent::Opened`, `Destroyed` | `RegistryOnlyLive` | Violated: a Finder open after closing `main` is routed to the closed window; `open_file` re-registers a window closed during its bundle | `WindowsFixed.cfg` passes | `window_registry_test::finder_open_after_main_closed_opens_a_new_window`, `open_file_finishing_after_its_window_closed_leaves_no_entry` |
| | | `StorageMatchesShown` | Violated: two racing `open_file`s render one component while `__TERRARIUM_FILE_PATH__` names the other, so it uses the other file's storage | passes | `earlier_open_file_finishing_last_does_not_win`, renderer `ignores an open that a newer open superseded` |
| | | `WatcherMatchesFile`, `RegistryMatchesShown` | Violated: a Finder open during `open_file` claims the same window, so the window shows and watches one file while the registry has another | passes | `finder_open_while_open_file_runs_uses_another_window` |
| `tla/RecentFiles.tla` | `recent.rs` | `NoLostEntries` | Violated: concurrent `record_recent` calls overwrite each other, and a truncating write can be read as an empty list | `RecentFilesFixed.cfg` passes | `recent_concurrency_test` |
| `lean/RecentPlants.lean` | `recent.rs` `push_recent` | Shelf plants stay distinct | `v1_duplicates_plants`: a full shelf gets a duplicate plant | `recordFixed_preserves_shelf` proved for all inputs | `recent::push_recent_keeps_plants_distinct_when_shelf_is_full` |

`HotReloadFixed_sanity.cfg` is expected to fail. It shows that the
`Converges` check runs on states where every save has been made.

## Bounds

TLC checks every state within these bounds:
- `HotReload`: 3–4 versions, a 2-tick debounce, 6–8 ticks.
- `Windows`: 2 files, `main` plus 2 more windows (168,784 distinct states for the fixed model).
- `RecentFiles`: 3 recorders plus the shelf reader.

The Lean theorems hold for every input.
