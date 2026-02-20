pub mod bundler;
pub mod recent;
pub mod watcher;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager, State};

pub struct WindowState {
    pub file: PathBuf,
    pub watcher: Option<notify::RecommendedWatcher>,
}

pub struct AppState {
    pub windows: Mutex<HashMap<String, WindowState>>,
    pub next_window_id: Mutex<u32>,
}

#[tauri::command]
async fn open_file(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    let tsx_path = PathBuf::from(&path);
    if !tsx_path.exists() {
        return Err(format!("File not found: {path}"));
    }
    if tsx_path.extension().and_then(|e| e.to_str()) != Some("tsx") {
        return Err(format!("Not a TSX file: {path}"));
    }

    let label = window.label().to_string();
    let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
    let _ = window.set_title(&format!("{filename} — Terrarium"));

    let bundle_result = bundler::bundle_tsx(&app, &tsx_path).await;

    recent::record_recent(&path);

    let watcher = watcher::watch_file(app.clone(), tsx_path.clone(), label.clone()).ok();

    state
        .windows
        .lock()
        .map_err(|_| "Internal state error".to_string())?
        .insert(
            label,
            WindowState {
                file: tsx_path,
                watcher,
            },
        );

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
        .add_filter("TSX Files", &["tsx"])
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
        .contains_key(&label);

    let (first_file, remaining) = if has_file {
        (None, paths)
    } else {
        let mut iter = paths.into_iter();
        (iter.next(), iter.collect())
    };

    for tsx_path in &remaining {
        if !tsx_path.exists() || tsx_path.extension().and_then(|e| e.to_str()) != Some("tsx") {
            continue;
        }
        let new_label = next_label(&state);
        let new_window = create_window(&app, &new_label)?;
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = new_window.set_title(&format!("{filename} — Terrarium"));

        spawn_bundle_and_watch(app.clone(), tsx_path.clone(), new_label);
    }

    match first_file {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            open_file(app, window, state, path_str).await
        }
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
        .get(&label)
        .map(|ws| ws.file.clone())
        .ok_or_else(|| "No file loaded".to_string())?;
    bundler::bundle_tsx(&app, &path).await
}

fn tsx_paths_from_urls(urls: &[tauri::Url]) -> Vec<PathBuf> {
    urls.iter()
        .filter(|u| u.scheme() == "file")
        .filter_map(|u| u.to_file_path().ok())
        .filter(|p| {
            p.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.eq_ignore_ascii_case("tsx"))
                .unwrap_or(false)
        })
        .collect()
}

fn next_label(state: &AppState) -> String {
    let mut id = state.next_window_id.lock().unwrap();
    let label = format!("window-{}", *id);
    *id += 1;
    label
}

fn create_window(app: &tauri::AppHandle, label: &str) -> Result<tauri::WebviewWindow, String> {
    tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("index.html".into()))
        .title("Terrarium")
        .inner_size(800.0, 600.0)
        .build()
        .map_err(|e| format!("Failed to create window: {e}"))
}

fn spawn_bundle_and_watch(app: tauri::AppHandle, path: PathBuf, label: String) {
    tauri::async_runtime::spawn(async move {
        match bundler::bundle_tsx(&app, &path).await {
            Ok(bundle) => {
                if let Some(w) = app.get_webview_window(&label) {
                    let filename = path.file_name().unwrap_or_default().to_string_lossy();
                    let _ = w.set_title(&format!("{filename} — Terrarium"));
                    let _ = w.emit("bundle-ready", bundle);
                }
            }
            Err(err) => {
                if let Some(w) = app.get_webview_window(&label) {
                    let _ = w.emit("bundle-error", err);
                }
            }
        }
        let watcher = watcher::watch_file(app.clone(), path.clone(), label.clone()).ok();
        let state = app.state::<AppState>();
        if let Ok(mut windows) = state.windows.lock() {
            if let Some(ws) = windows.get_mut(&label) {
                ws.watcher = watcher;
            }
        };
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
        if !tsx_path.exists() || tsx_path.extension().and_then(|e| e.to_str()) != Some("tsx") {
            continue;
        }
        let label = next_label(&state);
        let window = create_window(&app, &label)?;
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{filename} — Terrarium"));

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
    recent::read_recent()
        .into_iter()
        .filter(|e| std::path::Path::new(&e.path).exists())
        .collect()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            windows: Mutex::new(HashMap::new()),
            next_window_id: Mutex::new(2),
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
                            let msg = format!("Version {} is available.", update.version);
                            let should_open = handle
                                .dialog()
                                .message(msg)
                                .title("Update Available")
                                .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                                .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom("Download".to_string(), "Later".to_string()))
                                .blocking_show();
                            if should_open {
                                use tauri_plugin_opener::OpenerExt;
                                if let Err(e) = handle.opener().open_url(
                                    "https://github.com/michellemayes/terrarium/releases/latest",
                                    None::<&str>,
                                ) {
                                    log::warn!("Failed to open releases URL: {e}");
                                }
                            }
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

            let update_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                if let Ok(updater) = update_handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update_handle.emit("update-available", &update.version);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                let label = window.label().to_string();
                if let Ok(mut windows) = state.windows.lock() {
                    windows.remove(&label);
                };
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                let tsx_paths = tsx_paths_from_urls(&urls);
                if tsx_paths.is_empty() {
                    return;
                }

                let state = app.state::<AppState>();
                let mut iter = tsx_paths.into_iter();

                // Claim the "main" window for the first file if it has no file loaded.
                // On macOS cold start, RunEvent::Opened fires before the window is
                // registered in the runtime, so we intentionally do NOT check
                // get_webview_window("main") here. We only check state: if "main"
                // has no file yet, we reserve it. The frontend's request_bundle
                // call will find the file in state when the webview loads.
                let main_has_no_file = !state
                    .windows
                    .lock()
                    .map(|w| w.contains_key("main"))
                    .unwrap_or(true);

                if main_has_no_file {
                    if let Some(tsx_path) = iter.next() {
                        // Insert into state immediately so the frontend's
                        // request_bundle call can find the file on page load.
                        if let Ok(mut windows) = state.windows.lock() {
                            windows.insert(
                                "main".to_string(),
                                WindowState {
                                    file: tsx_path.clone(),
                                    watcher: None,
                                },
                            );
                        }
                        if let Some(window) = app.get_webview_window("main") {
                            let name = tsx_path.file_name().unwrap_or_default().to_string_lossy();
                            let _ = window.set_title(&format!("{name} — Terrarium"));
                        }
                        spawn_bundle_and_watch(app.clone(), tsx_path, "main".to_string());
                    }
                }

                for tsx_path in iter {
                    // Skip files already open in any window
                    let already_open = state
                        .windows
                        .lock()
                        .map(|w| w.values().any(|ws| ws.file == tsx_path))
                        .unwrap_or(false);
                    if already_open {
                        continue;
                    }

                    let label = next_label(&state);
                    if let Ok(window) = create_window(app, &label) {
                        if let Ok(mut windows) = state.windows.lock() {
                            windows.insert(
                                label.clone(),
                                WindowState {
                                    file: tsx_path.clone(),
                                    watcher: None,
                                },
                            );
                        }
                        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
                        let _ = window.set_title(&format!("{filename} — Terrarium"));
                        spawn_bundle_and_watch(app.clone(), tsx_path, label);
                    }
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_state_initializes_empty() {
        let state = AppState {
            windows: Mutex::new(HashMap::new()),
            next_window_id: Mutex::new(2),
        };
        assert!(state.windows.lock().unwrap().is_empty());
    }

    #[test]
    fn app_state_stores_window_state() {
        let state = AppState {
            windows: Mutex::new(HashMap::new()),
            next_window_id: Mutex::new(2),
        };
        let path = PathBuf::from("/tmp/test.tsx");
        state.windows.lock().unwrap().insert(
            "main".to_string(),
            WindowState {
                file: path.clone(),
                watcher: None,
            },
        );
        let windows = state.windows.lock().unwrap();
        assert_eq!(windows.get("main").unwrap().file, path);
    }

    #[test]
    fn next_window_id_increments() {
        let state = AppState {
            windows: Mutex::new(HashMap::new()),
            next_window_id: Mutex::new(2),
        };
        let mut id = state.next_window_id.lock().unwrap();
        assert_eq!(*id, 2);
        *id += 1;
        assert_eq!(*id, 3);
    }

    #[test]
    fn next_label_generates_sequential_labels() {
        let state = AppState {
            windows: Mutex::new(HashMap::new()),
            next_window_id: Mutex::new(2),
        };
        assert_eq!(next_label(&state), "window-2");
        assert_eq!(next_label(&state), "window-3");
        assert_eq!(next_label(&state), "window-4");
    }

    #[test]
    fn tsx_paths_from_urls_filters_tsx_files() {
        let urls: Vec<tauri::Url> = vec![
            "file:///tmp/hello.tsx".parse().unwrap(),
            "file:///tmp/readme.md".parse().unwrap(),
            "file:///tmp/app.tsx".parse().unwrap(),
            "https://example.com/foo.tsx".parse().unwrap(),
        ];
        let paths = tsx_paths_from_urls(&urls);
        assert_eq!(paths.len(), 2);
        assert_eq!(paths[0], PathBuf::from("/tmp/hello.tsx"));
        assert_eq!(paths[1], PathBuf::from("/tmp/app.tsx"));
    }

    #[test]
    fn tsx_paths_from_urls_returns_empty_for_no_tsx() {
        let urls: Vec<tauri::Url> = vec![
            "file:///tmp/readme.md".parse().unwrap(),
            "https://example.com/foo.tsx".parse().unwrap(),
        ];
        assert!(tsx_paths_from_urls(&urls).is_empty());
    }

    #[test]
    fn tsx_paths_from_urls_handles_empty_input() {
        assert!(tsx_paths_from_urls(&[]).is_empty());
    }

    #[test]
    fn tsx_paths_from_urls_accepts_mixed_case_extensions() {
        let urls: Vec<tauri::Url> = vec![
            "file:///tmp/App.TSX".parse().unwrap(),
            "file:///tmp/Page.Tsx".parse().unwrap(),
        ];
        let paths = tsx_paths_from_urls(&urls);
        assert_eq!(paths.len(), 2);
        assert_eq!(paths[0], PathBuf::from("/tmp/App.TSX"));
        assert_eq!(paths[1], PathBuf::from("/tmp/Page.Tsx"));
    }
}
