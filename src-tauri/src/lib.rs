pub mod bundler;
pub mod recent;
pub mod storage;
pub mod watcher;

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

const SUPPORTED_EXTENSIONS: &[&str] = &["tsx", "jsx"];

fn is_supported_ext(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| {
            SUPPORTED_EXTENSIONS
                .iter()
                .any(|ext| e.eq_ignore_ascii_case(ext))
        })
        .unwrap_or(false)
}

pub struct WindowState {
    pub file: PathBuf,
    pub watcher: Option<notify::RecommendedWatcher>,
}

/// Which file each window shows. Window labels are never reused, so closed
/// labels are remembered to stop late async work from re-registering them
/// (formal/tla/Windows.tla).
#[derive(Default)]
pub struct Windows {
    open: HashMap<String, WindowState>,
    closed: HashSet<String>,
}

impl Windows {
    /// Records that `label` now shows `file`, dropping its previous watcher.
    /// Returns false if the window has been closed.
    pub fn begin_open(&mut self, label: &str, file: PathBuf) -> bool {
        if self.closed.contains(label) {
            return false;
        }
        self.open.insert(
            label.to_string(),
            WindowState {
                file,
                watcher: None,
            },
        );
        true
    }

    /// The entry for `label` if it still shows `file`: the window has not
    /// been closed or given another file since `begin_open`.
    pub fn current(&mut self, label: &str, file: &Path) -> Option<&mut WindowState> {
        self.open.get_mut(label).filter(|ws| ws.file == file)
    }

    pub fn close(&mut self, label: &str) {
        self.open.remove(label);
        self.closed.insert(label.to_string());
    }

    pub fn file(&self, label: &str) -> Option<&PathBuf> {
        self.open.get(label).map(|ws| &ws.file)
    }

    pub fn label_showing(&self, file: &Path) -> Option<&str> {
        self.open
            .iter()
            .find(|(_, ws)| ws.file == file)
            .map(|(label, _)| label.as_str())
    }
}

pub struct AppState {
    pub windows: Mutex<Windows>,
    pub next_window_id: Mutex<u32>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            windows: Mutex::new(Windows::default()),
            next_window_id: Mutex::new(2),
        }
    }
}

impl AppState {
    /// The file the registry says `label` shows.
    pub fn file_for(&self, label: &str) -> Option<PathBuf> {
        self.windows.lock().ok()?.file(label).cloned()
    }

    /// The window the registry says shows `file`.
    pub fn label_for(&self, file: &Path) -> Option<String> {
        self.windows
            .lock()
            .ok()?
            .label_showing(file)
            .map(str::to_string)
    }
}

/// open_file's error when its window was closed, or another file was opened
/// in it, before this one finished bundling. The frontend ignores it.
const SUPERSEDED: &str = "Superseded";

pub struct UpdateState {
    pub pending_update: Mutex<Option<tauri_plugin_updater::Update>>,
}

#[tauri::command]
async fn open_file(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    open_file_in(app, window, &state, path).await
}

/// Opens `path` in `window` and returns its bundle (the `open_file` command).
pub async fn open_file_in<R: Runtime>(
    app: AppHandle<R>,
    window: tauri::Window<R>,
    state: &AppState,
    path: String,
) -> Result<String, String> {
    let tsx_path = PathBuf::from(&path);
    if !tsx_path.exists() {
        return Err(format!("File not found: {path}"));
    }
    if !is_supported_ext(&tsx_path) {
        return Err(format!("Not a TSX/JSX file: {path}"));
    }

    let label = window.label().to_string();
    let stamp = watcher::FileStamp::of(&tsx_path);
    {
        // Register the file before awaiting so concurrent opens see it.
        let mut windows = state
            .windows
            .lock()
            .map_err(|_| "Internal state error".to_string())?;
        if !windows.begin_open(&label, tsx_path.clone()) {
            return Err(SUPERSEDED.to_string());
        }
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{filename} — Terrarium"));
        if let Some(wv) = app.get_webview_window(&label) {
            set_file_path_on_window(&wv, &path);
        }
    }

    let bundle_result = bundler::bundle_tsx(&app, &tsx_path).await;
    let watcher =
        watcher::watch_file_since(app.clone(), tsx_path.clone(), label.clone(), stamp).ok();

    state
        .windows
        .lock()
        .map_err(|_| "Internal state error".to_string())?
        .current(&label, &tsx_path)
        .ok_or_else(|| SUPERSEDED.to_string())?
        .watcher = watcher;

    if bundle_result.is_ok() {
        recent::record_recent(&path);
    }

    bundle_result
}

#[tauri::command]
async fn pick_and_open_files(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let picked = app
        .dialog()
        .file()
        .add_filter("TSX/JSX Files", &["tsx", "jsx"])
        .blocking_pick_files();

    let files = picked.ok_or_else(|| "No file selected".to_string())?;
    if files.is_empty() {
        return Err("No file selected".to_string());
    }

    let paths: Vec<PathBuf> = files
        .into_iter()
        .filter_map(|f| f.into_path().ok())
        .collect();

    if paths.is_empty() {
        return Err("No file selected".to_string());
    }

    let label = window.label().to_string();
    let has_file = state
        .windows
        .lock()
        .map_err(|_| "Internal state error".to_string())?
        .file(&label)
        .is_some();

    let (first_file, remaining) = if has_file {
        (None, paths)
    } else {
        let mut iter = paths.into_iter();
        (iter.next(), iter.collect())
    };

    for tsx_path in &remaining {
        if !tsx_path.exists() || !is_supported_ext(tsx_path) {
            continue;
        }
        let new_label = next_label(&state);
        let new_window = create_window(&app, &new_label)?;
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = new_window.set_title(&format!("{filename} — Terrarium"));

        if let Ok(mut windows) = state.windows.lock() {
            windows.begin_open(&new_label, tsx_path.clone());
        }

        spawn_bundle_and_watch(app.clone(), tsx_path.clone(), new_label);
    }

    match first_file {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            open_file_in(app, window, &state, path_str).await
        }
        // The current window already had a file and the picked files were
        // opened in new windows. Surface this as "no file selected" so the
        // frontend's swallow-this-error branch leaves the current render alone.
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
async fn request_bundle(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let label = window.label().to_string();
    let path = state
        .windows
        .lock()
        .map_err(|_| "Internal state error".to_string())?
        .file(&label)
        .cloned()
        .ok_or_else(|| "No file loaded".to_string())?;
    bundler::bundle_tsx(&app, &path).await
}

fn supported_paths_from_urls(urls: &[tauri::Url]) -> Vec<PathBuf> {
    urls.iter()
        .filter(|u| u.scheme() == "file")
        .filter_map(|u| u.to_file_path().ok())
        .filter(|p| is_supported_ext(p))
        .collect()
}

fn next_label(state: &AppState) -> String {
    let mut id = state.next_window_id.lock().unwrap();
    let label = format!("window-{}", *id);
    *id += 1;
    label
}

/// Sets `window.__TERRARIUM_FILE_PATH__` on a webview so the storage shim
/// knows which file's storage namespace to use.
fn set_file_path_on_window<R: Runtime>(window: &tauri::WebviewWindow<R>, path: &str) {
    let _ = window.eval(format!(
        "window.__TERRARIUM_FILE_PATH__ = {};",
        serde_json::to_string(path).unwrap_or_default()
    ));
}

fn create_window<R: Runtime>(
    app: &AppHandle<R>,
    label: &str,
) -> Result<tauri::WebviewWindow<R>, String> {
    tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("index.html".into()))
        .title("Terrarium")
        .inner_size(800.0, 600.0)
        .initialization_script(include_str!("../resources/storage-shim.js"))
        .build()
        .map_err(|e| format!("Failed to create window: {e}"))
}

fn spawn_bundle_and_watch<R: Runtime>(app: AppHandle<R>, path: PathBuf, label: String) {
    tauri::async_runtime::spawn(async move {
        let stamp = watcher::FileStamp::of(&path);
        let result = bundler::bundle_tsx(&app, &path).await;
        let watcher =
            watcher::watch_file_since(app.clone(), path.clone(), label.clone(), stamp).ok();

        let state = app.state::<AppState>();
        let Ok(mut windows) = state.windows.lock() else {
            return;
        };
        // Skip if the window was closed or another file was opened in it.
        let Some(ws) = windows.current(&label, &path) else {
            return;
        };
        ws.watcher = watcher;
        match result {
            Ok(bundle) => {
                if let Some(w) = app.get_webview_window(&label) {
                    let filename = path.file_name().unwrap_or_default().to_string_lossy();
                    let _ = w.set_title(&format!("{filename} — Terrarium"));
                    set_file_path_on_window(&w, &path.to_string_lossy());
                }
                let _ = app.emit_to(&label, "bundle-ready", bundle);
                drop(windows);
                recent::record_recent(&path.to_string_lossy());
            }
            Err(err) => {
                let _ = app.emit_to(&label, "bundle-error", err);
            }
        }
    });
}

#[tauri::command]
async fn open_in_new_windows(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<(), String> {
    for path in paths {
        let tsx_path = PathBuf::from(&path);
        if !tsx_path.exists() || !is_supported_ext(&tsx_path) {
            continue;
        }
        let label = next_label(&state);
        let window = create_window(&app, &label)?;
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{filename} — Terrarium"));

        if let Ok(mut windows) = state.windows.lock() {
            windows.begin_open(&label, tsx_path.clone());
        }

        spawn_bundle_and_watch(app.clone(), tsx_path, label);
    }
    Ok(())
}

#[tauri::command]
fn check_node() -> Result<serde_json::Value, String> {
    let (path, version) = bundler::check_node_availability()?;
    let major: u32 = version
        .trim_start_matches('v')
        .split('.')
        .next()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    Ok(serde_json::json!({
        "path": path,
        "version": version,
        "major": major,
        "supported": major >= 18,
    }))
}

#[tauri::command]
fn is_first_run() -> bool {
    !bundler::cache_dir().join("first-run-complete").exists()
}

#[tauri::command]
fn mark_first_run_complete() -> Result<(), String> {
    let cache = bundler::cache_dir();
    let flag = cache.join("first-run-complete");
    std::fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
    std::fs::write(&flag, "").map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_recent_files() -> Vec<recent::RecentFile> {
    recent::prune_recent(|e| std::path::Path::new(&e.path).exists())
}

#[tauri::command]
async fn download_update(
    app: tauri::AppHandle,
    state: State<'_, UpdateState>,
) -> Result<(), String> {
    // Take the pending update, if any. download_and_install consumes the
    // Update by value, so we can't keep it for retries — fall back to a
    // fresh check if state is empty (e.g. on retry after a failed download).
    let taken = state
        .pending_update
        .lock()
        .map_err(|_| "Internal state error".to_string())?
        .take();

    let update = match taken {
        Some(u) => u,
        None => {
            use tauri_plugin_updater::UpdaterExt;
            let updater = app.updater().map_err(|e| e.to_string())?;
            updater
                .check()
                .await
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "No update available".to_string())?
        }
    };

    let result = update.download_and_install(|_, _| {}, || {}).await;

    match result {
        Ok(()) => {
            let _ = app.emit("update-downloaded", ());
            Ok(())
        }
        Err(e) => {
            let _ = app.emit("update-error", e.to_string());
            Err(e.to_string())
        }
    }
}

#[tauri::command]
async fn restart_app(app: tauri::AppHandle) -> Result<(), String> {
    app.restart();
}

pub fn handle_window_destroyed<R: Runtime>(app: &AppHandle<R>, label: &str) {
    let state = app.state::<AppState>();
    if let Ok(mut windows) = state.windows.lock() {
        windows.close(label);
    };
}

/// Handles files opened from Finder / the dock / `open -a` (RunEvent::Opened).
pub fn handle_opened<R: Runtime>(app: &AppHandle<R>, tsx_paths: Vec<PathBuf>) {
    if tsx_paths.is_empty() {
        return;
    }

    let state = app.state::<AppState>();
    let mut iter = tsx_paths.into_iter().peekable();

    if let Some(tsx_path) = iter.next_if(|p| claim_main(app, &state, p)) {
        spawn_bundle_and_watch(app.clone(), tsx_path, "main".to_string());
    }

    for tsx_path in iter {
        // Skip files already open in any window
        let already_open = state
            .windows
            .lock()
            .map(|w| w.label_showing(&tsx_path).is_some())
            .unwrap_or(false);
        if already_open {
            continue;
        }

        let label = next_label(&state);
        if let Ok(window) = create_window(app, &label) {
            if let Ok(mut windows) = state.windows.lock() {
                windows.begin_open(&label, tsx_path.clone());
            }
            let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
            let _ = window.set_title(&format!("{filename} — Terrarium"));
            set_file_path_on_window(&window, &tsx_path.to_string_lossy());
            spawn_bundle_and_watch(app.clone(), tsx_path, label);
        }
    }
}

/// Claims the "main" window for a file opened from Finder if it has no file
/// loaded and has not been closed.
///
/// On macOS cold start, RunEvent::Opened fires before the window is
/// registered in the runtime, so we intentionally do NOT check
/// get_webview_window("main") here. We only check state: if "main"
/// has no file yet, we reserve it. The frontend's request_bundle
/// call will find the file in state when the webview loads.
fn claim_main<R: Runtime>(app: &AppHandle<R>, state: &AppState, tsx_path: &Path) -> bool {
    let Ok(mut windows) = state.windows.lock() else {
        return false;
    };
    if windows.file("main").is_some() || !windows.begin_open("main", tsx_path.to_path_buf()) {
        return false;
    }
    if let Some(window) = app.get_webview_window("main") {
        let name = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{name} — Terrarium"));
        set_file_path_on_window(&window, &tsx_path.to_string_lossy());
    }
    true
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::default())
        .manage(UpdateState { pending_update: Mutex::new(None) })
        .manage({
            let db_path = bundler::cache_dir().join("storage.db");
            storage::StorageDb::open(&db_path).expect("Failed to open storage database")
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
            pick_and_open_files,
            request_bundle,
            open_in_new_windows,
            check_node,
            is_first_run,
            mark_first_run_complete,
            get_recent_files,
            download_update,
            restart_app,
            storage::storage_get,
            storage::storage_set,
            storage::storage_remove,
        ])
        .menu(|handle| {
            let open_item = tauri::menu::MenuItemBuilder::with_id("open-file", "Open...")
                .accelerator("CmdOrCtrl+O")
                .build(handle)?;
            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&open_item)
                .separator()
                .close_window()
                .build()?;
            let edit_menu = SubmenuBuilder::new(handle, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let window_menu = SubmenuBuilder::new(handle, "Window").minimize().build()?;
            let help_menu = SubmenuBuilder::new(handle, "Help")
                .item(
                    &tauri::menu::MenuItemBuilder::with_id("documentation", "Documentation")
                        .build(handle)?,
                )
                .item(
                    &tauri::menu::MenuItemBuilder::with_id(
                        "check-for-updates",
                        "Check for Updates\u{2026}",
                    )
                    .build(handle)?,
                )
                .build()?;
            let app_menu = SubmenuBuilder::new(handle, "Terrarium")
                .about(None)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;
            MenuBuilder::new(handle)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "open-file" {
                let _ = app.emit("menu-open-file", ());
            } else if event.id().as_ref() == "documentation" {
                use tauri_plugin_opener::OpenerExt;
                if let Err(e) = app.opener().open_url("https://github.com/michellemayes/terrarium", None::<&str>) {
                    log::warn!("Failed to open documentation URL: {e}");
                }
            } else if event.id().as_ref() == "check-for-updates" {
                let handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_dialog::DialogExt;
                    use tauri_plugin_updater::UpdaterExt;

                    let updater = match handle.updater() {
                        Ok(u) => u,
                        Err(e) => {
                            log::warn!("Failed to initialize updater: {e}");
                            handle
                                .dialog()
                                .message("Could not check for updates.")
                                .title("Update Error")
                                .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                                .blocking_show();
                            return;
                        }
                    };

                    match updater.check().await {
                        Ok(Some(update)) => {
                            let version = update.version.clone();
                            let state = handle.state::<UpdateState>();
                            if let Ok(mut pending) = state.pending_update.lock() {
                                *pending = Some(update);
                            }
                            let _ = handle.emit("update-available", &version);
                        }
                        Ok(None) => {
                            handle
                                .dialog()
                                .message("You're running the latest version.")
                                .title("No Updates Available")
                                .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                                .blocking_show();
                        }
                        Err(e) => {
                            log::warn!("Update check failed: {e}");
                            handle
                                .dialog()
                                .message("Could not check for updates. Please check your internet connection.")
                                .title("Update Error")
                                .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                                .blocking_show();
                        }
                    }
                });
            }
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                if let Ok(updater) = app_handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let version = update.version.clone();
                        let state = app_handle.state::<UpdateState>();
                        if let Ok(mut pending) = state.pending_update.lock() {
                            *pending = Some(update);
                        }
                        let _ = app_handle.emit("update-available", &version);
                    }
                }
            });
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.eval(include_str!("../resources/storage-shim.js"));
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                handle_window_destroyed(window.app_handle(), window.label());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                handle_opened(app, supported_paths_from_urls(&urls));
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_state_initializes_empty() {
        let state = AppState::default();
        assert_eq!(state.file_for("main"), None);
    }

    #[test]
    fn app_state_stores_window_state() {
        let state = AppState::default();
        let path = PathBuf::from("/tmp/test.tsx");
        assert!(state
            .windows
            .lock()
            .unwrap()
            .begin_open("main", path.clone()));
        assert_eq!(state.file_for("main"), Some(path.clone()));
        assert_eq!(state.label_for(&path).as_deref(), Some("main"));
    }

    #[test]
    fn closed_window_cannot_be_registered_again() {
        let mut windows = Windows::default();
        assert!(windows.begin_open("window-2", PathBuf::from("/tmp/a.tsx")));
        windows.close("window-2");
        assert!(!windows.begin_open("window-2", PathBuf::from("/tmp/b.tsx")));
        assert_eq!(windows.file("window-2"), None);
    }

    #[test]
    fn current_only_matches_the_latest_file() {
        let mut windows = Windows::default();
        let a = PathBuf::from("/tmp/a.tsx");
        let b = PathBuf::from("/tmp/b.tsx");
        windows.begin_open("main", a.clone());
        windows.begin_open("main", b.clone());
        assert!(windows.current("main", &a).is_none());
        assert!(windows.current("main", &b).is_some());
        windows.close("main");
        assert!(windows.current("main", &b).is_none());
    }

    #[test]
    fn next_window_id_increments() {
        let state = AppState::default();
        let mut id = state.next_window_id.lock().unwrap();
        assert_eq!(*id, 2);
        *id += 1;
        assert_eq!(*id, 3);
    }

    #[test]
    fn next_label_generates_sequential_labels() {
        let state = AppState::default();
        assert_eq!(next_label(&state), "window-2");
        assert_eq!(next_label(&state), "window-3");
        assert_eq!(next_label(&state), "window-4");
    }

    #[test]
    fn supported_paths_from_urls_filters_supported_files() {
        let urls: Vec<tauri::Url> = vec![
            "file:///tmp/hello.tsx".parse().unwrap(),
            "file:///tmp/readme.md".parse().unwrap(),
            "file:///tmp/app.tsx".parse().unwrap(),
            "file:///tmp/widget.jsx".parse().unwrap(),
            "https://example.com/foo.tsx".parse().unwrap(),
        ];
        let paths = supported_paths_from_urls(&urls);
        assert_eq!(paths.len(), 3);
        assert_eq!(paths[0], PathBuf::from("/tmp/hello.tsx"));
        assert_eq!(paths[1], PathBuf::from("/tmp/app.tsx"));
        assert_eq!(paths[2], PathBuf::from("/tmp/widget.jsx"));
    }

    #[test]
    fn supported_paths_from_urls_returns_empty_for_unsupported() {
        let urls: Vec<tauri::Url> = vec![
            "file:///tmp/readme.md".parse().unwrap(),
            "https://example.com/foo.tsx".parse().unwrap(),
        ];
        assert!(supported_paths_from_urls(&urls).is_empty());
    }

    #[test]
    fn supported_paths_from_urls_handles_empty_input() {
        assert!(supported_paths_from_urls(&[]).is_empty());
    }

    #[test]
    fn supported_paths_from_urls_accepts_mixed_case_extensions() {
        let urls: Vec<tauri::Url> = vec![
            "file:///tmp/App.TSX".parse().unwrap(),
            "file:///tmp/Page.Tsx".parse().unwrap(),
            "file:///tmp/Widget.JSX".parse().unwrap(),
        ];
        let paths = supported_paths_from_urls(&urls);
        assert_eq!(paths.len(), 3);
    }
}
