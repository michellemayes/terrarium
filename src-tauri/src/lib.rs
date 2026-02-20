pub mod bundler;
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
            windows.insert(
                label,
                WindowState {
                    file: path,
                    watcher,
                },
            );
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
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

            let mut cli_files: Vec<PathBuf> = Vec::new();
            {
                use tauri_plugin_cli::CliExt;
                if let Ok(matches) = app.cli().matches() {
                    if let Some(arg) = matches.args.get("file") {
                        if let Some(arr) = arg.value.as_array() {
                            for val in arr {
                                if let Some(s) = val.as_str() {
                                    if !s.is_empty() {
                                        if let Ok(resolved) = std::fs::canonicalize(s) {
                                            cli_files.push(resolved);
                                        }
                                    }
                                }
                            }
                        } else if let Some(s) = arg.value.as_str() {
                            if !s.is_empty() {
                                if let Ok(resolved) = std::fs::canonicalize(s) {
                                    cli_files.push(resolved);
                                }
                            }
                        }
                    }
                }

                // Fallback: check raw args for .tsx file paths
                if cli_files.is_empty() {
                    for arg in std::env::args().skip(1) {
                        if arg.ends_with(".tsx") {
                            let path = PathBuf::from(&arg);
                            if let Ok(resolved) = std::fs::canonicalize(&path) {
                                cli_files.push(resolved);
                            } else {
                                let from_parent = PathBuf::from("..").join(&path);
                                if let Ok(resolved) = std::fs::canonicalize(&from_parent) {
                                    cli_files.push(resolved);
                                }
                            }
                        }
                    }
                }
            }

            let update_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                if let Ok(updater) = update_handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update_handle.emit("update-available", &update.version);
                    }
                }
            });

            if cli_files.is_empty() {
                let _ = app_handle.emit("no-file", ());
                return Ok(());
            }

            let first_file = cli_files.remove(0);

            if let Some(window) = app_handle.get_webview_window("main") {
                let name = first_file.file_name().unwrap_or_default().to_string_lossy();
                let _ = window.set_title(&format!("{name} — Terrarium"));
            }
            spawn_bundle_and_watch(app_handle.clone(), first_file, "main".to_string());

            for file in cli_files {
                let handle = app_handle.clone();
                let state_ref = app.state::<AppState>();
                let label = next_label(&state_ref);

                if let Ok(window) = create_window(&app_handle, &label) {
                    let filename = file.file_name().unwrap_or_default().to_string_lossy();
                    let _ = window.set_title(&format!("{filename} — Terrarium"));
                    spawn_bundle_and_watch(handle, file, label);
                }
            }

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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
}
