// bundle_tsx promises to give up after a timeout. The bundler's stderr is
// read until EOF, so the timeout only works if the timed-out process is
// actually killed; otherwise a hung bundler hangs open_file forever and the
// node process is left running.
use std::time::Duration;

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn hung_bundler_times_out_and_is_killed() {
    std::env::set_var(
        "TERRARIUM_BUNDLER_PATH",
        format!(
            "{}/tests/fixtures/hang-bundler.mjs",
            env!("CARGO_MANIFEST_DIR")
        ),
    );
    let dir = tempfile::TempDir::new().unwrap();
    let pid_file = dir.path().join("bundler.pid");
    std::env::set_var("HANG_PID_FILE", &pid_file);
    let file = dir.path().join("component.tsx");
    std::fs::write(&file, "export default function A() { return null; }").unwrap();

    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();

    let result = tokio::time::timeout(
        Duration::from_secs(15),
        terrarium_lib::bundler::bundle_tsx_with_timeout(
            app.handle(),
            &file,
            Duration::from_secs(1),
        ),
    )
    .await
    .expect("bundle_tsx did not return after its 1s timeout");
    let err = result.expect_err("a hung bundler should not succeed");
    assert!(err.contains("timed out"), "unexpected error: {err}");

    let pid = std::fs::read_to_string(&pid_file).unwrap();
    let alive = || {
        std::process::Command::new("kill")
            .args(["-0", pid.trim()])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    };
    for _ in 0..50 {
        if !alive() {
            return;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    let _ = std::process::Command::new("kill")
        .args(["-9", pid.trim()])
        .status();
    panic!("timed-out bundler process {} is still running", pid.trim());
}
