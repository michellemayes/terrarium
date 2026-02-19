use std::path::{Path, PathBuf};
use tokio::process::Command as AsyncCommand;

pub fn cache_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".terrarium")
}

fn find_node() -> Result<PathBuf, String> {
    // In a bundled .app, PATH is minimal (/usr/bin:/bin).
    // Check common Node.js install locations explicitly.
    let candidates = [
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        // nvm
        &format!(
            "{}/.nvm/versions/node",
            dirs::home_dir().unwrap_or_default().display()
        ),
        // fnm
        &format!(
            "{}/Library/Application Support/fnm/node-versions",
            dirs::home_dir().unwrap_or_default().display()
        ),
    ];

    for candidate in &candidates[..2] {
        let p = PathBuf::from(candidate);
        if p.exists() {
            return Ok(p);
        }
    }

    // nvm: find latest installed version
    let nvm_dir = PathBuf::from(candidates[2]);
    if nvm_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
            let mut versions: Vec<PathBuf> = entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| p.join("bin/node").exists())
                .collect();
            versions.sort();
            if let Some(latest) = versions.last() {
                return Ok(latest.join("bin/node"));
            }
        }
    }

    // Fallback: try PATH (works in dev mode and if user has node in PATH)
    if let Ok(output) = std::process::Command::new("which").arg("node").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err("Node.js not found. Install it from https://nodejs.org".to_string())
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
    let node = find_node()?;

    // Add node's directory to PATH so bundler.mjs can find npm
    let node_dir = node.parent().unwrap_or(Path::new(""));
    let path_env = match std::env::var("PATH") {
        Ok(existing) => format!("{}:{existing}", node_dir.display()),
        Err(_) => format!("{}:/usr/bin:/bin", node_dir.display()),
    };

    let output = AsyncCommand::new(&node)
        .arg(&bundler)
        .arg(tsx_path)
        .env("PATH", &path_env)
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
