use std::path::{Path, PathBuf};
use tokio::process::Command as AsyncCommand;

pub fn cache_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".terrarium")
}

fn find_node() -> Result<PathBuf, String> {
    let home = dirs::home_dir().unwrap_or_default();

    // Direct paths: Homebrew (Apple Silicon + Intel), official installer
    let direct = [
        PathBuf::from("/opt/homebrew/bin/node"),
        PathBuf::from("/usr/local/bin/node"),
        home.join(".volta/bin/node"),
    ];
    for p in &direct {
        if p.exists() {
            return Ok(p.clone());
        }
    }

    // Version managers: pick the latest installed version
    let version_dirs = [
        home.join(".nvm/versions/node"),
        home.join("Library/Application Support/fnm/node-versions"),
        home.join(".asdf/installs/nodejs"),
    ];
    for dir in &version_dirs {
        if let Some(node) = find_latest_node_in(dir) {
            return Ok(node);
        }
    }

    // Fallback: try user's login shell to resolve PATH (covers custom setups)
    if let Some(node) = find_node_via_shell() {
        return Ok(node);
    }

    Err("Node.js not found. Install it from https://nodejs.org".to_string())
}

fn find_latest_node_in(versions_dir: &Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(versions_dir).ok()?;
    let mut versions: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.join("bin/node").exists())
        .collect();
    versions.sort();
    versions.last().map(|p| p.join("bin/node"))
}

fn find_node_via_shell() -> Option<PathBuf> {
    // Launch the user's login shell to get their full PATH,
    // then use it to find node. This handles custom setups.
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = std::process::Command::new(&shell)
        .args(["-l", "-c", "which node"])
        .output()
        .ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(PathBuf::from(path));
        }
    }
    None
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
