// formal/tla/RecentFiles.tla: record_recent is a read-modify-write of
// recent-files.json, and opening several files at once runs it on several
// threads. Without a lock, one writer overwrites another's entry; with a
// truncating write, a reader can also see an empty file and wipe the list.
//
// This file holds a single test because it points $HOME at a temp dir.
use std::sync::{Arc, Barrier};

#[test]
fn concurrent_record_recent_keeps_every_entry() {
    let home = tempfile::TempDir::new().unwrap();
    std::env::set_var("HOME", home.path());
    let recent_path = terrarium_lib::bundler::cache_dir().join("recent-files.json");
    assert!(recent_path.starts_with(home.path()));

    const THREADS: usize = 6; // MAX_RECENT, so every entry must survive
    for round in 0..50 {
        let _ = std::fs::remove_file(&recent_path);
        let barrier = Arc::new(Barrier::new(THREADS));
        let handles: Vec<_> = (0..THREADS)
            .map(|i| {
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    terrarium_lib::recent::record_recent(&format!("/tmp/file-{i}.tsx"));
                })
            })
            .collect();
        for h in handles {
            h.join().unwrap();
        }

        let list = terrarium_lib::recent::read_recent();
        let mut paths: Vec<String> = list.into_iter().map(|e| e.path).collect();
        paths.sort();
        let expected: Vec<String> = (0..THREADS).map(|i| format!("/tmp/file-{i}.tsx")).collect();
        assert_eq!(paths, expected, "round {round}: entries were lost");
    }
}
