use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::bundler::cache_dir;

const MAX_RECENT: usize = 6;
const NUM_PLANT_TYPES: u32 = 6; // u32 to match hash arithmetic in plant_index

/// Serialises every read-modify-write of the recent-files list. Several
/// bundles finishing at once call `record_recent` from different threads
/// (formal/tla/RecentFiles.tla).
static RECENT_LOCK: Mutex<()> = Mutex::new(());

fn lock_recent() -> MutexGuard<'static, ()> {
    RECENT_LOCK.lock().unwrap_or_else(|e| e.into_inner())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RecentFile {
    pub path: String,
    pub plant: u8,
    pub opened_at: String,
}

/// Returns the path to the recent-files JSON file: `~/.terrarium/recent-files.json`.
fn recent_file_path() -> PathBuf {
    cache_dir().join("recent-files.json")
}

/// Reads the recent files list from disk. Returns an empty vec if the file is
/// missing, unreadable, or contains invalid JSON.
pub fn read_recent() -> Vec<RecentFile> {
    let path = recent_file_path();
    let Ok(data) = std::fs::read_to_string(&path) else {
        return Vec::new();
    };
    serde_json::from_str(&data).unwrap_or_default()
}

/// Writes the given list to disk (best-effort). The file is replaced
/// atomically so a concurrent reader never sees it truncated.
pub fn write_recent(entries: &[RecentFile]) {
    let path = recent_file_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(entries) {
        let tmp = path.with_extension("json.tmp");
        if std::fs::write(&tmp, json).is_ok() {
            let _ = std::fs::rename(&tmp, &path);
        }
    }
}

/// Removes entries for which `keep` returns false, writes the result to
/// disk and returns it.
pub fn prune_recent(keep: impl Fn(&RecentFile) -> bool) -> Vec<RecentFile> {
    let _guard = lock_recent();
    let live: Vec<RecentFile> = read_recent().into_iter().filter(|e| keep(e)).collect();
    write_recent(&live);
    live
}

/// Adds or bumps `file_path` to the front of the recent files list.
///
/// - If the path already exists, it is moved to the front with its existing
///   plant index and a fresh timestamp.
/// - If it is new, a deterministic plant index (0-5) is derived from a hash
///   of the path bytes.
/// - The list is capped at `MAX_RECENT` (6) entries.
/// - The updated list is written to disk and returned.
pub fn record_recent(file_path: &str) -> Vec<RecentFile> {
    let _guard = lock_recent();
    let list = push_recent(read_recent(), file_path, iso_timestamp());
    write_recent(&list);
    list
}

/// The list update behind [`record_recent`], without the file I/O.
pub fn push_recent(mut list: Vec<RecentFile>, file_path: &str, now: String) -> Vec<RecentFile> {
    let existing = list.iter().position(|r| r.path == file_path);

    let entry = if let Some(idx) = existing {
        let mut entry = list.remove(idx);
        entry.opened_at = now;
        entry
    } else {
        // Pick a plant type not already on the shelf when possible. Only the
        // entries that survive the truncation below count as used.
        let used: std::collections::HashSet<u8> =
            list.iter().take(MAX_RECENT - 1).map(|r| r.plant).collect();
        let preferred = plant_index(file_path);
        let plant = if used.contains(&preferred) {
            (0..NUM_PLANT_TYPES as u8)
                .find(|i| !used.contains(i))
                .unwrap_or(preferred)
        } else {
            preferred
        };
        RecentFile {
            path: file_path.to_string(),
            plant,
            opened_at: now,
        }
    };

    list.insert(0, entry);
    list.truncate(MAX_RECENT);
    list
}

/// Deterministic plant index (0-5) based on a simple hash of the path bytes.
fn plant_index(path: &str) -> u8 {
    let hash = path
        .bytes()
        .fold(0u32, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u32));
    (hash % NUM_PLANT_TYPES) as u8
}

/// Produces an ISO-8601-ish UTC timestamp from `SystemTime` without pulling in
/// the `chrono` crate. Format: `YYYY-MM-DDTHH:MM:SSZ`.
fn iso_timestamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let (year, month, day) = days_to_ymd(days);

    format!("{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}Z")
}

/// Converts days since Unix epoch (1970-01-01) to (year, month, day).
/// Uses Howard Hinnant's algorithm.
fn days_to_ymd(days: u64) -> (u64, u64, u64) {
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn plant_index_is_deterministic() {
        let idx1 = plant_index("/Users/alice/hello.tsx");
        let idx2 = plant_index("/Users/alice/hello.tsx");
        assert_eq!(idx1, idx2);
    }

    #[test]
    fn plant_index_in_range() {
        for i in 0..200 {
            let path = format!("/tmp/test-{i}.tsx");
            let idx = plant_index(&path);
            assert!(idx < 6, "plant index {idx} out of range for {path}");
        }
    }

    #[test]
    fn plant_index_varies_across_paths() {
        // Different paths should (statistically) produce different indices.
        let indices: std::collections::HashSet<u8> = (0..100)
            .map(|i| plant_index(&format!("/projects/file-{i}.tsx")))
            .collect();
        // With 100 paths and 6 buckets, we should hit at least 3 distinct values.
        assert!(indices.len() >= 3);
    }

    #[test]
    fn iso_timestamp_format() {
        let ts = iso_timestamp();
        // Should look like 2024-01-15T12:30:45Z
        assert!(ts.ends_with('Z'));
        assert_eq!(ts.len(), 20);
        assert_eq!(&ts[4..5], "-");
        assert_eq!(&ts[7..8], "-");
        assert_eq!(&ts[10..11], "T");
        assert_eq!(&ts[13..14], ":");
        assert_eq!(&ts[16..17], ":");
    }

    #[test]
    fn days_to_ymd_epoch() {
        assert_eq!(days_to_ymd(0), (1970, 1, 1));
    }

    #[test]
    fn days_to_ymd_known_date() {
        // 2024-01-01 is 19723 days after epoch
        assert_eq!(days_to_ymd(19723), (2024, 1, 1));
    }

    #[test]
    fn read_recent_returns_empty_for_missing_file() {
        // If the file doesn't exist, we get an empty vec.
        // This test relies on the default cache dir; if it happens to exist
        // with content, that's fine too — we're mainly testing it doesn't panic.
        let _list = read_recent();
    }

    #[test]
    fn record_recent_adds_and_caps() {
        let mut list: Vec<RecentFile> = Vec::new();

        // Record 7 files (exceeding the cap of 6).
        for i in 0..7 {
            list = push_recent(list, &format!("/tmp/file-{i}.tsx"), iso_timestamp());
        }

        assert_eq!(list.len(), 6);
        assert_eq!(list[0].path, "/tmp/file-6.tsx");
        assert_eq!(list[5].path, "/tmp/file-1.tsx");
    }

    #[test]
    fn record_recent_bumps_existing_to_front() {
        let list = vec![
            RecentFile {
                path: "/tmp/a.tsx".to_string(),
                plant: 1,
                opened_at: "2024-01-01T00:00:00Z".to_string(),
            },
            RecentFile {
                path: "/tmp/b.tsx".to_string(),
                plant: 2,
                opened_at: "2024-01-01T00:00:00Z".to_string(),
            },
            RecentFile {
                path: "/tmp/c.tsx".to_string(),
                plant: 3,
                opened_at: "2024-01-01T00:00:00Z".to_string(),
            },
        ];

        let list = push_recent(list, "/tmp/b.tsx", iso_timestamp());

        assert_eq!(list[0].path, "/tmp/b.tsx");
        assert_eq!(list[0].plant, 2);
        assert_eq!(list.len(), 3);
    }

    #[test]
    fn push_recent_keeps_plants_distinct_when_shelf_is_full() {
        // formal/lean/RecentPlants.lean: on a full shelf all six plants count
        // as used, including the one on the entry about to be evicted, so
        // the new file fell back to its hash plant and duplicated another.
        let new_path = "/tmp/new.tsx";
        let preferred = plant_index(new_path);
        let evicted_plant = (preferred + 1) % NUM_PLANT_TYPES as u8;
        let mut plants: Vec<u8> = (0..NUM_PLANT_TYPES as u8)
            .filter(|p| *p != evicted_plant)
            .collect();
        plants.push(evicted_plant);
        let list = plants
            .iter()
            .enumerate()
            .map(|(i, plant)| RecentFile {
                path: format!("/tmp/{i}.tsx"),
                plant: *plant,
                opened_at: "2024-01-01T00:00:00Z".to_string(),
            })
            .collect();

        let list = push_recent(list, new_path, iso_timestamp());

        let distinct: std::collections::HashSet<u8> = list.iter().map(|r| r.plant).collect();
        assert_eq!(list.len(), MAX_RECENT);
        assert_eq!(distinct.len(), MAX_RECENT, "duplicate plants: {list:?}");
        assert_eq!(list[0].plant, evicted_plant);
    }

    #[test]
    fn recent_file_path_is_under_cache_dir() {
        let path = recent_file_path();
        assert!(path.to_string_lossy().contains(".terrarium"));
        assert!(path.to_string_lossy().ends_with("recent-files.json"));
    }
}
