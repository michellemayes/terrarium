#[test]
fn cache_dir_returns_home_terrarium() {
    let dir = terrarium_lib::bundler::cache_dir();
    let home = dirs::home_dir().unwrap();
    assert_eq!(dir, home.join(".terrarium"));
}

#[test]
fn parse_bundler_output_success() {
    let output = "console.log('hello');";
    assert!(!output.starts_with("{\"error\":true"));
}

#[test]
fn parse_bundler_output_error() {
    let output = r#"{"error":true,"message":"Failed to resolve"}"#;
    assert!(output.starts_with("{\"error\":true"));
}
