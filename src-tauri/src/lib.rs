pub mod bundler;
mod watcher;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State, Emitter};

pub struct AppState {
    pub current_file: Mutex<Option<PathBuf>>,
    pub watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

#[tauri::command]
async fn open_file(app: tauri::AppHandle, state: State<'_, AppState>, path: String) -> Result<String, String> {
    let tsx_path = PathBuf::from(&path);
    if !tsx_path.exists() {
        return Err(format!("File not found: {path}"));
    }
    if tsx_path.extension().and_then(|e| e.to_str()) != Some("tsx") {
        return Err(format!("Not a TSX file: {path}"));
    }

    *state.current_file.lock()
        .map_err(|_| "Internal state error".to_string())? = Some(tsx_path.clone());

    if let Some(window) = app.get_webview_window("main") {
        let filename = tsx_path.file_name().unwrap_or_default().to_string_lossy();
        let _ = window.set_title(&format!("{filename} — TSX Viewer"));
    }

    let bundle_result = bundler::bundle_tsx(&app, &tsx_path).await;

    // Start watching the new file
    if let Ok(w) = watcher::watch_file(app.clone(), tsx_path) {
        *state.watcher.lock().map_err(|_| "Internal state error".to_string())? = Some(w);
    }

    bundle_result
}

#[tauri::command]
async fn request_bundle(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let file = state.current_file.lock()
        .map_err(|_| "Internal state error".to_string())?
        .clone();
    match file {
        Some(path) => bundler::bundle_tsx(&app, &path).await,
        None => Err("No file loaded".to_string()),
    }
}

#[tauri::command]
async fn watch_current_file(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let file = state.current_file.lock()
        .map_err(|_| "Internal state error".to_string())?
        .clone();
    if let Some(path) = file {
        let w = watcher::watch_file(app, path)?;
        *state.watcher.lock().map_err(|_| "Internal state error".to_string())? = Some(w);
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
            current_file: Mutex::new(None),
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![open_file, request_bundle, watch_current_file])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Handle CLI arguments
            // Try the CLI plugin first, fall back to std::env::args for dev mode
            // (tauri dev passes extra flags like --no-default-features that the CLI plugin rejects)
            {
                use tauri_plugin_cli::CliExt;
                let mut found_file = false;
                if let Ok(matches) = app.cli().matches() {
                    if let Some(file_arg) = matches.args.get("file") {
                        if let Some(path) = file_arg.value.as_str() {
                            if !path.is_empty() {
                                let resolved = std::fs::canonicalize(path)
                                    .unwrap_or_else(|_| PathBuf::from(path));
                                *app.state::<AppState>().current_file.lock().unwrap() = Some(resolved);
                                found_file = true;
                            }
                        }
                    }
                }

                // Fallback: check raw args for a .tsx file path
                // In dev mode, CWD may be src-tauri/, so also try parent directory
                if !found_file {
                    for arg in std::env::args().skip(1) {
                        if arg.ends_with(".tsx") {
                            let path = PathBuf::from(&arg);
                            if let Ok(resolved) = std::fs::canonicalize(&path) {
                                *app.state::<AppState>().current_file.lock().unwrap() = Some(resolved);
                                break;
                            }
                            let from_parent = PathBuf::from("..").join(&path);
                            if let Ok(resolved) = std::fs::canonicalize(&from_parent) {
                                *app.state::<AppState>().current_file.lock().unwrap() = Some(resolved);
                                break;
                            }
                        }
                    }
                }
            }

            let has_file = app.state::<AppState>().current_file.lock().unwrap().is_some();

            if !has_file {
                let handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_dialog::DialogExt;
                    let file = handle.dialog().file()
                        .add_filter("TSX Files", &["tsx"])
                        .blocking_pick_file();
                    if let Some(picked) = file {
                        let path = match picked.into_path() {
                            Ok(p) => p,
                            Err(_) => return,
                        };
                        let state = handle.state::<AppState>();
                        *state.current_file.lock().unwrap() = Some(path.clone());

                        match bundler::bundle_tsx(&handle, &path).await {
                            Ok(bundle) => { let _ = handle.emit("bundle-ready", bundle); }
                            Err(err) => { let _ = handle.emit("bundle-error", err); }
                        }

                        if let Ok(w) = watcher::watch_file(handle.clone(), path) {
                            *state.watcher.lock().unwrap() = Some(w);
                        }
                    }
                });
            } else {
                let handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let state = handle.state::<AppState>();
                    let path = state.current_file.lock().unwrap().clone().unwrap();

                    if let Some(window) = handle.get_webview_window("main") {
                        let name = path.file_name().unwrap_or_default().to_string_lossy();
                        let _ = window.set_title(&format!("{name} — TSX Viewer"));
                    }

                    match bundler::bundle_tsx(&handle, &path).await {
                        Ok(bundle) => { let _ = handle.emit("bundle-ready", bundle); }
                        Err(err) => { let _ = handle.emit("bundle-error", err); }
                    }

                    if let Ok(w) = watcher::watch_file(handle.clone(), path) {
                        *state.watcher.lock().unwrap() = Some(w);
                    }
                });
            }

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
