// Hot-reload properties checked in formal/tla/HotReload.tla, run against the
// real watcher with tests/fixtures/echo-bundler.mjs standing in for the
// bundler: it reads the source immediately, sleeps `delay=<ms>` if the source
// says so, then emits what it read as the bundle.
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Listener;
use terrarium_lib::watcher::{watch_file, watch_file_since, FileStamp};

fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
    // All tests in this binary use the same stand-in bundler.
    std::env::set_var(
        "TERRARIUM_BUNDLER_PATH",
        format!(
            "{}/tests/fixtures/echo-bundler.mjs",
            env!("CARGO_MANIFEST_DIR")
        ),
    );
    tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("failed to build mock Tauri app")
}

#[derive(Default)]
struct Renders {
    /// Every `bundle-ready` payload (the source text the bundle read).
    seen: Mutex<Vec<String>>,
    /// Bundles that have started and not yet finished.
    running: AtomicUsize,
}

fn record_renders(app: &tauri::App<tauri::test::MockRuntime>) -> Arc<Renders> {
    let renders = Arc::new(Renders::default());
    let sink = renders.clone();
    app.handle().listen_any("bundle-ready", move |event| {
        let source: String = serde_json::from_str(event.payload()).unwrap();
        sink.seen.lock().unwrap().push(source);
    });
    let sink = renders.clone();
    app.handle().listen_any("bundle-started", move |_| {
        sink.running.fetch_add(1, Ordering::SeqCst);
    });
    let sink = renders.clone();
    app.handle().listen_any("bundle-finished", move |_| {
        sink.running.fetch_sub(1, Ordering::SeqCst);
    });
    renders
}

fn temp_source(dir: &tempfile::TempDir, contents: &str) -> PathBuf {
    // Canonicalize so notify's event paths match (macOS /var -> /private/var).
    let file = dir.path().canonicalize().unwrap().join("component.tsx");
    std::fs::write(&file, contents).unwrap();
    file
}

fn save(file: &Path, contents: &str) {
    std::fs::write(file, contents).unwrap();
}

/// Waits until something has rendered, no bundle is running, and nothing has
/// changed for 1.5 s. Checking for running bundles matters: macOS can report
/// the fixture's initial write to the new watcher, and that stray render must
/// not count as settled while a slow bundle is still going.
async fn settled(renders: &Renders) -> Vec<String> {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(30);
    let mut last_len = 0;
    let mut quiet_since = tokio::time::Instant::now();
    loop {
        tokio::time::sleep(Duration::from_millis(100)).await;
        let len = renders.seen.lock().unwrap().len();
        if len != last_len || renders.running.load(Ordering::SeqCst) > 0 {
            last_len = len;
            quiet_since = tokio::time::Instant::now();
        }
        if len > 0 && quiet_since.elapsed() >= Duration::from_millis(1500) {
            return renders.seen.lock().unwrap().clone();
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "no render settled; got {:?}",
            renders.seen.lock().unwrap()
        );
    }
}

/// Lets the OS watcher register and the debounce window from start-up pass.
async fn let_watcher_start() {
    tokio::time::sleep(Duration::from_millis(1000)).await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn slow_older_rebuild_does_not_overwrite_newer_one() {
    // HotReload.tla `Monotonic`: each accepted event spawned its own bundle,
    // so a slow bundle of v2 finished after a fast one of v3 and won.
    let app = mock_app();
    let renders = record_renders(&app);
    let dir = tempfile::TempDir::new().unwrap();
    let file = temp_source(&dir, "v1");
    let _watcher = watch_file(app.handle().clone(), file.clone(), "main".into()).unwrap();
    let_watcher_start().await;

    save(&file, "v2 delay=2000");
    tokio::time::sleep(Duration::from_millis(700)).await;
    save(&file, "v3");

    let renders = settled(&renders).await;
    assert_eq!(
        renders.last().map(String::as_str),
        Some("v3"),
        "renders: {renders:?}"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn second_of_two_quick_saves_is_rendered() {
    // HotReload_debounce.cfg: the leading-edge debounce dropped any save
    // within 300 ms of the last accepted one, e.g. format-on-save.
    let app = mock_app();
    let renders = record_renders(&app);
    let dir = tempfile::TempDir::new().unwrap();
    let file = temp_source(&dir, "v1");
    let _watcher = watch_file(app.handle().clone(), file.clone(), "main".into()).unwrap();
    let_watcher_start().await;

    save(&file, "v2");
    tokio::time::sleep(Duration::from_millis(200)).await;
    save(&file, "v3");

    let renders = settled(&renders).await;
    assert_eq!(
        renders.last().map(String::as_str),
        Some("v3"),
        "renders: {renders:?}"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn save_during_initial_bundle_is_rendered() {
    // HotReload_converges.cfg: open_file bundles first and only then starts
    // the watcher, so a save made while the first bundle ran was never seen.
    let app = mock_app();
    let renders = record_renders(&app);
    let dir = tempfile::TempDir::new().unwrap();
    let file = temp_source(&dir, "v1");

    let before_initial_bundle = FileStamp::of(&file);
    // ... the initial bundle reads v1 here ...
    tokio::time::sleep(Duration::from_millis(50)).await;
    save(&file, "v2 (saved while the first bundle was running)");
    // ... the initial bundle returns, then open_file starts the watcher.
    let _watcher = watch_file_since(
        app.handle().clone(),
        file.clone(),
        "main".into(),
        before_initial_bundle,
    )
    .unwrap();

    let renders = settled_or_empty(&renders).await;
    assert_eq!(
        renders.last().map(String::as_str),
        Some("v2 (saved while the first bundle was running)"),
        "renders: {renders:?}"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn unchanged_file_is_not_rebuilt_on_watch() {
    let app = mock_app();
    let renders = record_renders(&app);
    let dir = tempfile::TempDir::new().unwrap();
    let file = temp_source(&dir, "v1");
    // Let the write age out so the OS cannot report it to the new watcher.
    tokio::time::sleep(Duration::from_millis(1000)).await;

    let stamp = FileStamp::of(&file);
    let _watcher =
        watch_file_since(app.handle().clone(), file.clone(), "main".into(), stamp).unwrap();

    tokio::time::sleep(Duration::from_millis(2000)).await;
    assert!(renders.seen.lock().unwrap().is_empty());
}

/// Like `settled`, but returns an empty list if nothing renders within 5 s.
async fn settled_or_empty(renders: &Renders) -> Vec<String> {
    tokio::time::sleep(Duration::from_millis(5000)).await;
    if renders.seen.lock().unwrap().is_empty() {
        return Vec::new();
    }
    settled(renders).await
}
