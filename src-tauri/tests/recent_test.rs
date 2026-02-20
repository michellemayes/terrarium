use terrarium_lib::recent::RecentFile;

#[test]
fn read_recent_does_not_panic() {
    // read_recent should return a Vec (possibly empty) without panicking,
    // regardless of whether ~/.terrarium/recent-files.json exists.
    let list = terrarium_lib::recent::read_recent();
    // Basic sanity: it's a valid vec.
    assert!(list.len() < 10_000, "recent list unexpectedly large");
}

#[test]
fn recent_file_serialization_roundtrip() {
    let entry = RecentFile {
        path: "/Users/alice/projects/hello.tsx".to_string(),
        plant: 3,
        opened_at: "2025-06-15T10:30:00Z".to_string(),
    };

    let json = serde_json::to_string(&entry).expect("serialize should succeed");
    let deserialized: RecentFile =
        serde_json::from_str(&json).expect("deserialize should succeed");

    assert_eq!(entry, deserialized);
}

#[test]
fn recent_file_deserialization_from_valid_json() {
    let json = r#"{
        "path": "/tmp/demo.tsx",
        "plant": 5,
        "opened_at": "2025-01-01T00:00:00Z"
    }"#;

    let entry: RecentFile = serde_json::from_str(json).expect("should parse valid JSON");
    assert_eq!(entry.path, "/tmp/demo.tsx");
    assert_eq!(entry.plant, 5);
    assert_eq!(entry.opened_at, "2025-01-01T00:00:00Z");
}

#[test]
fn recent_file_deserialization_returns_default_on_corrupt_json() {
    let corrupt = "this is not json at all {{{";
    let result: Result<Vec<RecentFile>, _> = serde_json::from_str(corrupt);
    // Corrupt JSON should fail to parse; callers (read_recent) use unwrap_or_default.
    assert!(result.is_err(), "corrupt JSON should fail to deserialize");

    // Verify that unwrap_or_default produces an empty vec, matching read_recent behaviour.
    let fallback: Vec<RecentFile> = result.unwrap_or_default();
    assert!(fallback.is_empty());
}

// These tests read/write the real ~/.terrarium/recent-files.json, so they
// must not run in parallel with each other. We use #[ignore] and run them
// separately with: cargo test --test recent_test -- --ignored --test-threads=1
#[test]
#[ignore]
fn plant_index_is_deterministic_for_same_path() {
    let recent_path = terrarium_lib::bundler::cache_dir().join("recent-files.json");
    let backup = std::fs::read_to_string(&recent_path).ok();

    let unique_path = "/tmp/__terrarium_test_determinism_12345.tsx";

    let list1 = terrarium_lib::recent::record_recent(unique_path);
    let plant1 = list1
        .iter()
        .find(|e| e.path == unique_path)
        .expect("should contain the recorded path")
        .plant;

    let list2 = terrarium_lib::recent::record_recent(unique_path);
    let plant2 = list2
        .iter()
        .find(|e| e.path == unique_path)
        .expect("should contain the recorded path")
        .plant;

    assert_eq!(plant1, plant2, "plant index should be deterministic");

    if let Some(original) = backup {
        let _ = std::fs::write(&recent_path, original);
    } else {
        let _ = std::fs::remove_file(&recent_path);
    }
}

#[test]
#[ignore]
fn record_recent_places_entry_at_front() {
    let recent_path = terrarium_lib::bundler::cache_dir().join("recent-files.json");
    let backup = std::fs::read_to_string(&recent_path).ok();

    let unique_path = "/tmp/__terrarium_test_front_67890.tsx";

    let list = terrarium_lib::recent::record_recent(unique_path);
    assert_eq!(
        list[0].path, unique_path,
        "most recently recorded file should be at index 0"
    );

    if let Some(original) = backup {
        let _ = std::fs::write(&recent_path, original);
    } else {
        let _ = std::fs::remove_file(&recent_path);
    }
}
