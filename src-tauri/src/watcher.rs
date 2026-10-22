use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::{Duration, Instant, SystemTime};
use tauri::Emitter;

/// A rebuild starts once the file has been quiet for this long.
const DEBOUNCE: Duration = Duration::from_millis(300);

/// Modification time and size of a file, taken before a bundle reads it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FileStamp {
    modified: Option<SystemTime>,
    len: u64,
}

impl FileStamp {
    pub fn of(path: &Path) -> Option<Self> {
        let meta = std::fs::metadata(path).ok()?;
        Some(Self {
            modified: meta.modified().ok(),
            len: meta.len(),
        })
    }
}

pub fn watch_file<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: PathBuf,
    window_label: String,
) -> Result<RecommendedWatcher, String> {
    watch_file_since(app_handle, path, window_label, None)
}

/// Watches `path` and re-bundles it for `window_label` on every change.
///
/// `since` is the file's stamp from before the caller's initial bundle; if
/// the file has changed since then, a rebuild is scheduled straight away so
/// a save made while that bundle ran is not lost.
pub fn watch_file_since<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: PathBuf,
    window_label: String,
    since: Option<FileStamp>,
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

    let mut changed = since.is_some_and(|stamp| FileStamp::of(&path) != Some(stamp));
    let watched_path = path;

    // Rebuilds run one at a time on this thread, so they finish in the order
    // they started; changes made during a rebuild queue up in `rx` and cause
    // another one (formal/tla/HotReloadFixed.tla). The loop ends when the
    // watcher is dropped and `rx` disconnects.
    std::thread::spawn(move || loop {
        while !changed {
            match rx.recv() {
                Ok(event) => changed = is_change(&event, &watched_path),
                Err(_) => return,
            }
        }
        changed = false;
        if !wait_until_quiet(&rx, &watched_path) {
            return;
        }

        let (event_name, payload) = match tauri::async_runtime::block_on(
            crate::bundler::bundle_tsx(&app_handle, &watched_path),
        ) {
            Ok(bundle) => ("bundle-ready", bundle),
            Err(err) => ("bundle-error", err),
        };
        let _ = app_handle.emit_to(&window_label, event_name, payload);
    });

    Ok(watcher)
}

fn is_change(event: &Event, path: &Path) -> bool {
    event.paths.iter().any(|p| p == path)
        && matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_))
}

/// Trailing-edge debounce: returns once no change to `path` has arrived for
/// `DEBOUNCE`, or false if the watcher was dropped.
fn wait_until_quiet(rx: &mpsc::Receiver<Event>, path: &Path) -> bool {
    let mut deadline = Instant::now() + DEBOUNCE;
    loop {
        match rx.recv_timeout(deadline.saturating_duration_since(Instant::now())) {
            Ok(event) if is_change(&event, path) => deadline = Instant::now() + DEBOUNCE,
            Ok(_) => {}
            Err(RecvTimeoutError::Timeout) => return true,
            Err(RecvTimeoutError::Disconnected) => return false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn file_stamp_changes_when_file_is_rewritten() {
        let dir = tempfile::TempDir::new().unwrap();
        let file = dir.path().join("test.tsx");
        std::fs::write(&file, "v1").unwrap();
        let before = FileStamp::of(&file);
        assert!(before.is_some());
        assert_eq!(FileStamp::of(&file), before);
        std::fs::write(&file, "version 2").unwrap();
        assert_ne!(FileStamp::of(&file), before);
    }

    #[test]
    fn file_stamp_is_none_for_missing_file() {
        assert_eq!(FileStamp::of(Path::new("/nonexistent/terrarium.tsx")), None);
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
