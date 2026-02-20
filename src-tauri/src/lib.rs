pub mod bundler;
mod watcher;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager, State};

pub struct AppState {
    pub current_file: Mutex<Option<PathBuf>>,
    pub watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

#[tauri::command]
async fn open_file(
    app: tauri::AppHandle,
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

    *state
        .current_file
        .lock()
        .map_err(|_| "Internal state error".to_string())? = Some(tsx_path.clone());

    if let Some(window) = app.get_webview_window("main") {
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{filename} — Terrarium"));
    }

    let bundle_result = bundler::bundle_tsx(&app, &tsx_path).await;

    if let Ok(w) = watcher::watch_file(app.clone(), tsx_path) {
        *state
            .watcher
            .lock()
            .map_err(|_| "Internal state error".to_string())? = Some(w);
    }

    bundle_result
}

#[tauri::command]
async fn pick_and_open_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let picked = app
        .dialog()
        .file()
        .add_filter("TSX Files", &["tsx"])
        .blocking_pick_file()
        .ok_or_else(|| "No file selected".to_string())?;
    let path = picked.into_path().map_err(|e| format!("{e}"))?;
    let path_str = path.to_string_lossy().to_string();
    open_file(app, state, path_str).await
}

#[tauri::command]
async fn request_bundle(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let path = state
        .current_file
        .lock()
        .map_err(|_| "Internal state error".to_string())?
        .clone()
        .ok_or_else(|| "No file loaded".to_string())?;
    bundler::bundle_tsx(&app, &path).await
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            current_file: Mutex::new(None),
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
            pick_and_open_file,
            request_bundle
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
                .build()
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "open-file" {
                let _ = app.emit("menu-open-file", ());
            }
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppState>();

            // Try CLI plugin first, then fall back to raw args for dev mode
            // (tauri dev passes extra flags that the CLI plugin rejects)
            {
                use tauri_plugin_cli::CliExt;
                let resolved = app
                    .cli()
                    .matches()
                    .ok()
                    .and_then(|m| m.args.get("file").cloned())
                    .and_then(|a| a.value.as_str().map(String::from))
                    .filter(|p| !p.is_empty())
                    .map(|path| {
                        std::fs::canonicalize(&path).unwrap_or_else(|_| PathBuf::from(&path))
                    })
                    .or_else(|| {
                        // Fallback: check raw args for a .tsx file path
                        // In dev mode, CWD may be src-tauri/, so also try parent directory
                        std::env::args()
                            .skip(1)
                            .filter(|arg| arg.ends_with(".tsx"))
                            .find_map(|arg| {
                                std::fs::canonicalize(&arg)
                                    .or_else(|_| {
                                        std::fs::canonicalize(PathBuf::from("..").join(&arg))
                                    })
                                    .ok()
                            })
                    });

                if let Some(path) = resolved {
                    if let Ok(mut file) = state.current_file.lock() {
                        *file = Some(path);
                    }
                }
            }

            // Check for updates in the background (silently skips if pubkey not configured)
            let update_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                if let Ok(updater) = update_handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update_handle.emit("update-available", &update.version);
                    }
                }
            });

            let has_file = state
                .current_file
                .lock()
                .map(|f| f.is_some())
                .unwrap_or(false);

            if !has_file {
                let _ = app_handle.emit("no-file", ());
                return Ok(());
            }

            let handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<AppState>();
                let path = match state.current_file.lock().ok().and_then(|f| f.clone()) {
                    Some(p) => p,
                    None => return,
                };

                if let Some(window) = handle.get_webview_window("main") {
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    let _ = window.set_title(&format!("{name} — Terrarium"));
                }

                let (event, payload) = match bundler::bundle_tsx(&handle, &path).await {
                    Ok(bundle) => ("bundle-ready", bundle),
                    Err(err) => ("bundle-error", err),
                };
                if handle.emit(event, payload).is_err() {
                    log::warn!("Failed to emit {event} event");
                }

                if let Ok(w) = watcher::watch_file(handle.clone(), path) {
                    if let Ok(mut watcher) = state.watcher.lock() {
                        *watcher = Some(w);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_state_initializes_with_no_file() {
        let state = AppState {
            current_file: Mutex::new(None),
            watcher: Mutex::new(None),
        };
        assert!(state.current_file.lock().unwrap().is_none());
    }

    #[test]
    fn app_state_stores_file_path() {
        let state = AppState {
            current_file: Mutex::new(None),
            watcher: Mutex::new(None),
        };
        let path = PathBuf::from("/tmp/test.tsx");
        *state.current_file.lock().unwrap() = Some(path.clone());
        assert_eq!(*state.current_file.lock().unwrap(), Some(path));
    }
}
