use std::path::{Path, PathBuf};
use tokio::process::Command as AsyncCommand;

pub fn cache_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".terrarium")
}

pub fn bundler_script_path(app_handle: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    app_handle
        .path()
        .resolve(
            "resources/bundler.mjs",
            tauri::path::BaseDirectory::Resource,
        )
        .expect("Failed to resolve bundler.mjs resource path")
}

pub fn needs_install() -> bool {
    !cache_dir().join("node_modules").join("react").exists()
}

pub async fn bundle_tsx(app_handle: &tauri::AppHandle, tsx_path: &Path) -> Result<String, String> {
    use tauri::Emitter;

    let installing = needs_install();
    if installing {
        let _ = app_handle.emit("install-started", ());
    }

    let bundler = bundler_script_path(app_handle);

    let output = AsyncCommand::new("node")
        .arg(&bundler)
        .arg(tsx_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run bundler: {e}"))?;

    if installing {
        let _ = app_handle.emit("install-finished", ());
    }

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        if stdout.starts_with("{\"error\":true") {
            return Err(stdout);
        }
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        if !stdout.is_empty() && stdout.starts_with('{') {
            Err(stdout)
        } else {
            Err(format!("Bundler failed:\n{stderr}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_dir_is_under_home() {
        let dir = cache_dir();
        assert!(dir.to_string_lossy().contains(".terrarium"));
        assert!(dir.is_absolute());
    }
}
