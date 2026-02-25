use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::Emitter;

pub fn watch_file<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: PathBuf,
    window_label: String,
) -> Result<RecommendedWatcher, String> {
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

    // Watch the parent directory to catch renames (Vim-style save: write temp → delete → rename)
    let watch_dir = path.parent().unwrap_or(&path);
    watcher
        .watch(watch_dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch file: {e}"))?;

    let watched_path = path.clone();

    std::thread::spawn(move || {
        let mut last_rebuild = Instant::now();

        for event in rx {
            if !event.paths.iter().any(|p| p == &watched_path) {
                continue;
            }
            if !matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                continue;
            }
            if !should_rebuild(last_rebuild, 300) {
                continue;
            }
            last_rebuild = Instant::now();

            let app = app_handle.clone();
            let path = watched_path.clone();
            let label = window_label.clone();
            tauri::async_runtime::spawn(async move {
                let (event_name, payload) = match crate::bundler::bundle_tsx(&app, &path).await {
                    Ok(bundle) => ("bundle-ready", bundle),
                    Err(err) => ("bundle-error", err),
                };
                let _ = app.emit_to(&label, event_name, payload);
            });
        }
    });

    Ok(watcher)
}

/// Debounce helper — returns true if enough time has passed since the last event.
pub fn should_rebuild(last_rebuild: Instant, debounce_ms: u64) -> bool {
    last_rebuild.elapsed() >= Duration::from_millis(debounce_ms)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn debounce_allows_after_delay() {
        let last = Instant::now() - Duration::from_millis(500);
        assert!(should_rebuild(last, 300));
    }

    #[test]
    fn debounce_blocks_within_window() {
        let last = Instant::now();
        assert!(!should_rebuild(last, 300));
    }

    #[test]
    fn debounce_exact_boundary() {
        let last = Instant::now() - Duration::from_millis(300);
        assert!(should_rebuild(last, 300));
    }

    #[test]
    fn watcher_fails_on_nonexistent_path() {
        let (tx, _rx) = mpsc::channel();
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .unwrap();

        let result = watcher.watch(
            &PathBuf::from("/nonexistent/path/that/does/not/exist.tsx"),
            RecursiveMode::NonRecursive,
        );
        assert!(result.is_err());
    }

    #[test]
    fn watcher_succeeds_on_existing_file() {
        let dir = tempfile::TempDir::new().unwrap();
        let file = dir.path().join("test.tsx");
        std::fs::write(&file, "export default function() {}").unwrap();

        let (tx, _rx) = mpsc::channel();
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .unwrap();

        let result = watcher.watch(&file, RecursiveMode::NonRecursive);
        assert!(result.is_ok());
    }
}
