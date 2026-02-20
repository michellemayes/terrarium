use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use tauri::Listener;

static BUNDLER_PATH_INIT: OnceLock<()> = OnceLock::new();

fn set_bundler_path() {
    BUNDLER_PATH_INIT.get_or_init(|| {
        let bundler = format!("{}/resources/bundler.mjs", env!("CARGO_MANIFEST_DIR"));
        unsafe {
            std::env::set_var("TERRARIUM_BUNDLER_PATH", &bundler);
        }
    });
}

fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
    tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("failed to build mock Tauri app")
}

#[tokio::test(flavor = "multi_thread")]
async fn bundler_produces_valid_output() {
    set_bundler_path();

    let app = mock_app();
    let handle = app.handle();

    let dir = tempfile::TempDir::new().unwrap();
    let dir_path = dir.path().canonicalize().unwrap();
    let file = dir_path.join("test.tsx");
    std::fs::write(&file, r#"export default function Hello() { return <div>hello</div>; }"#)
        .unwrap();

    let result = terrarium_lib::bundler::bundle_tsx(handle, &file).await;
    assert!(result.is_ok(), "bundle_tsx failed: {:?}", result.err());

    let output = result.unwrap();
    assert!(!output.is_empty(), "bundle output should not be empty");
    assert!(
        !output.starts_with(r#"{"error":true"#),
        "bundle output should not be an error: {output}"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn watcher_triggers_rebundle_on_file_change() {
    set_bundler_path();

    let app = mock_app();
    let handle = app.handle().clone();

    let dir = tempfile::TempDir::new().unwrap();
    // Canonicalize the temp dir path to resolve macOS /var -> /private/var symlink,
    // so that notify event paths match our watched path.
    let canon_dir = dir.path().canonicalize().unwrap();
    let file = canon_dir.join("watch_test.tsx");
    std::fs::write(
        &file,
        r#"export default function V1() { return <div>v1</div>; }"#,
    )
    .unwrap();

    let received = Arc::new(Mutex::new(Vec::<String>::new()));
    let errors = Arc::new(Mutex::new(Vec::<String>::new()));

    let received_clone = received.clone();
    handle.listen("bundle-ready", move |event| {
        let payload = event.payload().to_string();
        received_clone.lock().unwrap().push(payload);
    });

    let errors_clone = errors.clone();
    handle.listen("bundle-error", move |event| {
        let payload = event.payload().to_string();
        errors_clone.lock().unwrap().push(payload);
    });

    let _watcher =
        terrarium_lib::watcher::watch_file(handle.clone(), file.clone()).expect("watch_file failed");

    // Wait for watcher to initialize
    tokio::time::sleep(Duration::from_millis(1000)).await;

    // Modify the file — triggers a rebundle
    std::fs::write(
        &file,
        r#"export default function V2() { return <div>v2</div>; }"#,
    )
    .unwrap();

    // Wait for debounce (300ms) + bundling (up to several seconds for Node.js)
    let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
    loop {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if !received.lock().unwrap().is_empty() || !errors.lock().unwrap().is_empty() {
            break;
        }
        if tokio::time::Instant::now() > deadline {
            panic!(
                "Timed out waiting for bundle-ready event after file change. errors={:?}",
                errors.lock().unwrap()
            );
        }
    }

    let events: Vec<String> = received.lock().unwrap().clone();
    let error_events: Vec<String> = errors.lock().unwrap().clone();
    assert!(!events.is_empty(), "Expected at least one bundle-ready event, but got errors: {:?}", error_events);
    assert!(
        !events[0].is_empty(),
        "bundle-ready payload should not be empty"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn watcher_emits_error_on_invalid_tsx() {
    set_bundler_path();

    let app = mock_app();
    let handle = app.handle().clone();

    let dir = tempfile::TempDir::new().unwrap();
    // Canonicalize to resolve macOS /var -> /private/var symlink
    let canon_dir = dir.path().canonicalize().unwrap();
    let file = canon_dir.join("error_test.tsx");
    std::fs::write(
        &file,
        r#"export default function OK() { return <div>ok</div>; }"#,
    )
    .unwrap();

    let errors = Arc::new(Mutex::new(Vec::<String>::new()));
    let errors_clone = errors.clone();
    handle.listen("bundle-error", move |event| {
        let payload = event.payload().to_string();
        errors_clone.lock().unwrap().push(payload);
    });

    let ready = Arc::new(Mutex::new(Vec::<String>::new()));
    let ready_clone = ready.clone();
    handle.listen("bundle-ready", move |event| {
        let payload = event.payload().to_string();
        ready_clone.lock().unwrap().push(payload);
    });

    let _watcher =
        terrarium_lib::watcher::watch_file(handle.clone(), file.clone()).expect("watch_file failed");

    // Wait for watcher to initialize
    tokio::time::sleep(Duration::from_millis(1000)).await;

    std::fs::write(&file, "this is not valid tsx {{{").unwrap();

    let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
    loop {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if !errors.lock().unwrap().is_empty() || !ready.lock().unwrap().is_empty() {
            break;
        }
        if tokio::time::Instant::now() > deadline {
            panic!("Timed out waiting for bundle-error event after writing invalid TSX");
        }
    }

    let error_events: Vec<String> = errors.lock().unwrap().clone();
    let ready_events: Vec<String> = ready.lock().unwrap().clone();
    assert!(
        !error_events.is_empty(),
        "Expected at least one bundle-error event, got ready events: {:?}",
        ready_events
    );
}
