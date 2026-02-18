use std::path::{Path, PathBuf};
use tokio::process::Command as AsyncCommand;

pub fn cache_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".tsx-viewer")
}

pub fn bundler_script_path(app_handle: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    app_handle
        .path()
        .resolve("resources/bundler.mjs", tauri::path::BaseDirectory::Resource)
        .expect("Failed to resolve bundler.mjs resource path")
}

pub async fn bundle_tsx(app_handle: &tauri::AppHandle, tsx_path: &Path) -> Result<String, String> {
    let bundler = bundler_script_path(app_handle);

    let output = AsyncCommand::new("node")
        .arg(&bundler)
        .arg(tsx_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run bundler: {e}"))?;

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
        assert!(dir.to_string_lossy().contains(".tsx-viewer"));
        assert!(dir.is_absolute());
    }
}
