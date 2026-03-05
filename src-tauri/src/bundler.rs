use std::path::{Path, PathBuf};

pub fn cache_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".terrarium")
}

pub fn find_node() -> Result<PathBuf, String> {
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
    // Sort by version number, not lexicographically (so v18 > v9)
    versions.sort_by(|a, b| {
        let parse = |p: &Path| -> Vec<u64> {
            p.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .trim_start_matches('v')
                .split('.')
                .filter_map(|s| s.parse().ok())
                .collect()
        };
        parse(a).cmp(&parse(b))
    });
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
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|p| !p.is_empty())
        .map(PathBuf::from)
}

pub fn check_node_availability() -> Result<(String, String), String> {
    let node = find_node()?;
    let version = node_version(&node)?;
    Ok((node.to_string_lossy().to_string(), version))
}

fn node_version(node_path: &Path) -> Result<String, String> {
    let output = std::process::Command::new(node_path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to run node: {e}"))?;
    if !output.status.success() {
        return Err("Could not determine Node.js version".to_string());
    }
    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(version)
}

pub fn bundler_script_path<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("TERRARIUM_BUNDLER_PATH") {
        return Ok(PathBuf::from(path));
    }
    use tauri::Manager;
    app_handle
        .path()
        .resolve(
            "resources/bundler.mjs",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| format!("Failed to locate bundler: {e}"))
}

pub async fn bundle_tsx<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
    tsx_path: &Path,
) -> Result<String, String> {
    use tauri::Emitter;
    use tokio::io::{AsyncBufReadExt, BufReader};

    let _ = app_handle.emit("bundle-started", ());

    let bundler = bundler_script_path(app_handle)?;
    let node = find_node()?;

    let node_dir = node.parent().unwrap_or(Path::new(""));
    let path_env = match std::env::var("PATH") {
        Ok(existing) => format!("{}:{existing}", node_dir.display()),
        Err(_) => format!("{}:/usr/bin:/bin", node_dir.display()),
    };

    let mut child = tokio::process::Command::new(&node)
        .arg(&bundler)
        .arg(tsx_path)
        .env("PATH", &path_env)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to run bundler: {e}"))?;

    // Stream stderr for progress events
    let stderr = child.stderr.take();
    let progress_handle = app_handle.clone();
    let stderr_task = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                    if val.get("progress").and_then(|v| v.as_bool()) == Some(true) {
                        if let Some(msg) = val.get("message").and_then(|v| v.as_str()) {
                            let _ = progress_handle.emit("bundle-progress", msg);
                        }
                    }
                }
            }
        }
    });

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(120),
        child.wait_with_output(),
    )
    .await;

    // Ensure stderr task completes
    let _ = stderr_task.await;

    let _ = app_handle.emit("bundle-finished", ());

    let output = result
        .map_err(|_| "Bundler timed out after 120 seconds".to_string())?
        .map_err(|e| format!("Failed to run bundler: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    if stdout.starts_with("{\"error\":true")
        || (!output.status.success() && stdout.starts_with('{'))
    {
        return Err(stdout);
    }

    if output.status.success() {
        Ok(stdout)
    } else {
        let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Bundler failed:\n{stderr_str}"))
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

    #[test]
    fn check_node_availability_returns_version() {
        // This test requires Node.js to be installed on the machine.
        if find_node().is_ok() {
            let result = check_node_availability();
            assert!(result.is_ok());
            let (path, version) = result.unwrap();
            assert!(!path.is_empty());
            assert!(version.starts_with('v'));
        }
    }
}
