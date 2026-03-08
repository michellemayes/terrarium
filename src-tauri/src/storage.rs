use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};

pub struct StorageDb {
    conn: Mutex<Connection>,
}

impl StorageDb {
    pub fn open(db_path: &PathBuf) -> Result<Self, String> {
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS artifact_storage (
                file_path TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
                PRIMARY KEY (file_path, key)
            );",
        )
        .map_err(|e| e.to_string())?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn get(&self, file_path: &str, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT value FROM artifact_storage WHERE file_path = ?1 AND key = ?2",
            params![file_path, key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())
    }

    pub fn set(&self, file_path: &str, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO artifact_storage (file_path, key, value, updated_at)
             VALUES (?1, ?2, ?3, unixepoch())
             ON CONFLICT(file_path, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![file_path, key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove(&self, file_path: &str, key: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM artifact_storage WHERE file_path = ?1 AND key = ?2",
            params![file_path, key],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn test_db() -> (StorageDb, NamedTempFile) {
        let tmp = NamedTempFile::new().expect("failed to create temp file");
        let path = tmp.path().to_path_buf();
        let db = StorageDb::open(&path).expect("failed to open DB");
        (db, tmp)
    }

    #[test]
    fn get_missing_key_returns_none() {
        let (db, _tmp) = test_db();
        let result = db.get("file.tsx", "missing").unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn set_then_get_returns_value() {
        let (db, _tmp) = test_db();
        db.set("file.tsx", "theme", "dark").unwrap();
        let result = db.get("file.tsx", "theme").unwrap();
        assert_eq!(result, Some("dark".to_string()));
    }

    #[test]
    fn different_files_are_isolated() {
        let (db, _tmp) = test_db();
        db.set("a.tsx", "key", "alpha").unwrap();
        db.set("b.tsx", "key", "beta").unwrap();
        assert_eq!(db.get("a.tsx", "key").unwrap(), Some("alpha".to_string()));
        assert_eq!(db.get("b.tsx", "key").unwrap(), Some("beta".to_string()));
    }

    #[test]
    fn set_overwrites_existing() {
        let (db, _tmp) = test_db();
        db.set("file.tsx", "key", "v1").unwrap();
        db.set("file.tsx", "key", "v2").unwrap();
        assert_eq!(db.get("file.tsx", "key").unwrap(), Some("v2".to_string()));
    }

    #[test]
    fn remove_deletes_key() {
        let (db, _tmp) = test_db();
        db.set("file.tsx", "key", "val").unwrap();
        db.remove("file.tsx", "key").unwrap();
        assert_eq!(db.get("file.tsx", "key").unwrap(), None);
    }

    #[test]
    fn remove_nonexistent_key_is_ok() {
        let (db, _tmp) = test_db();
        let result = db.remove("file.tsx", "nope");
        assert!(result.is_ok());
    }
}
