// The window-registry interleavings found in formal/tla/Windows.tla, run
// against the real open_file / RunEvent::Opened / Destroyed code on Tauri's
// MockRuntime. tests/fixtures/echo-bundler.mjs stands in for the bundler, and
// `delay=<ms>` in a source file controls which bundle finishes first.
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Duration;
use tauri::Manager;
use terrarium_lib::{handle_opened, handle_window_destroyed, open_file_in, AppState};

static ENV: OnceLock<tempfile::TempDir> = OnceLock::new();

fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
    ENV.get_or_init(|| {
        // record_recent writes under $HOME; keep it away from the real one.
        let home = tempfile::TempDir::new().unwrap();
        std::env::set_var("HOME", home.path());
        std::env::set_var(
            "TERRARIUM_BUNDLER_PATH",
            format!(
                "{}/tests/fixtures/echo-bundler.mjs",
                env!("CARGO_MANIFEST_DIR")
            ),
        );
        home
    });
    tauri::test::mock_builder()
        .manage(AppState::default())
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("failed to build mock Tauri app")
}

fn webview(
    app: &tauri::App<tauri::test::MockRuntime>,
    label: &str,
) -> tauri::Window<tauri::test::MockRuntime> {
    tauri::WebviewWindowBuilder::new(app, label, Default::default())
        .build()
        .unwrap()
        .as_ref()
        .window()
}

fn source(dir: &tempfile::TempDir, name: &str, contents: &str) -> PathBuf {
    let file = dir.path().canonicalize().unwrap().join(name);
    std::fs::write(&file, contents).unwrap();
    file
}

fn arg(path: &std::path::Path) -> String {
    path.to_string_lossy().into_owned()
}

/// Waits until the registry maps some window to `file`.
async fn window_showing(
    app: &tauri::App<tauri::test::MockRuntime>,
    file: &std::path::Path,
) -> Option<String> {
    for _ in 0..50 {
        if let Some(label) = app.state::<AppState>().label_for(file) {
            return Some(label);
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    None
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn finder_open_after_main_closed_opens_a_new_window() {
    // Windows.tla RegistryOnlyLive: with "main" closed and another window
    // still open, RunEvent::Opened saw "main" had no file and claimed the
    // closed window for the new file, which then never appeared.
    let app = mock_app();
    let dir = tempfile::TempDir::new().unwrap();
    let a = source(&dir, "a.tsx", "a");
    let _main = webview(&app, "main");
    let _other = webview(&app, "window-9");
    handle_window_destroyed(app.handle(), "main");

    handle_opened(app.handle(), vec![a.clone()]);

    let state = app.state::<AppState>();
    assert_eq!(
        state.file_for("main"),
        None,
        "file was routed to the closed main window"
    );
    let label = window_showing(&app, &a)
        .await
        .expect("file was not opened in any window");
    assert_ne!(label, "main");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn open_file_finishing_after_its_window_closed_leaves_no_entry() {
    // Windows.tla RegistryOnlyLive: open_file inserted its entry (and a live
    // file watcher) after the await even if the window had closed meanwhile.
    let app = mock_app();
    let dir = tempfile::TempDir::new().unwrap();
    let a = source(&dir, "a.tsx", "a delay=800");
    let main = webview(&app, "main");
    let handle = app.handle().clone();
    let state = handle.state::<AppState>();

    let (result, ()) = tokio::join!(
        open_file_in(handle.clone(), main.clone(), &state, arg(&a)),
        async {
            tokio::time::sleep(Duration::from_millis(200)).await;
            handle_window_destroyed(&handle, "main");
        }
    );

    assert!(
        result.is_err(),
        "open_file rendered into a closed window: {result:?}"
    );
    assert_eq!(
        state.file_for("main"),
        None,
        "closed window kept a registry entry"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn earlier_open_file_finishing_last_does_not_win() {
    // Windows.tla StorageMatchesShown: open B (slow), then A (fast), in one
    // window. A's call set __TERRARIUM_FILE_PATH__ last, but B's bundle came
    // back last and was rendered, so B's component used A's storage.
    let app = mock_app();
    let dir = tempfile::TempDir::new().unwrap();
    let b = source(&dir, "b.tsx", "b delay=1500");
    let a = source(&dir, "a.tsx", "a");
    let main = webview(&app, "main");
    let handle = app.handle().clone();
    let state = handle.state::<AppState>();

    let (b_result, a_result) = tokio::join!(
        open_file_in(handle.clone(), main.clone(), &state, arg(&b)),
        async {
            tokio::time::sleep(Duration::from_millis(200)).await;
            open_file_in(handle.clone(), main.clone(), &state, arg(&a)).await
        }
    );

    assert_eq!(a_result.as_deref(), Ok("a"));
    assert!(
        b_result.is_err(),
        "stale open_file would render over the newer one: {b_result:?}"
    );
    assert_eq!(state.file_for("main"), Some(a));
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn finder_open_while_open_file_runs_uses_another_window() {
    // Windows.tla WatcherMatchesFile / RegistryMatchesShown: while open_file(A)
    // was bundling, "main" had no registry entry yet, so a Finder open of B
    // claimed it too. B rendered last and its watcher replaced A's, but the
    // registry said A, so a reload switched the window back to A.
    let app = mock_app();
    let dir = tempfile::TempDir::new().unwrap();
    let a = source(&dir, "a.tsx", "a delay=300");
    let b = source(&dir, "b.tsx", "b delay=1500");
    let main = webview(&app, "main");
    let handle = app.handle().clone();
    let state = handle.state::<AppState>();

    let (a_result, ()) = tokio::join!(
        open_file_in(handle.clone(), main.clone(), &state, arg(&a)),
        async {
            tokio::time::sleep(Duration::from_millis(100)).await;
            handle_opened(&handle, vec![b.clone()]);
        }
    );

    assert_eq!(a_result.as_deref(), Ok("a delay=300"));
    let label = window_showing(&app, &b).await.expect("B was not opened");
    assert_ne!(
        label, "main",
        "B was loaded into the window that was opening A"
    );
    assert_eq!(state.file_for("main"), Some(a));
}
