#[cfg(debug_assertions)]
use tauri::Manager;

use std::collections::HashMap;

/// Get the current process environment variables
#[tauri::command]
fn get_environment() -> HashMap<String, String> {
    let mut env: HashMap<String, String> = std::env::vars().collect();

    // Ensure terminal-specific vars are set for full shell experience
    env.entry("TERM".to_string())
        .or_insert_with(|| "xterm-256color".to_string());
    env.entry("COLORTERM".to_string())
        .or_insert_with(|| "truecolor".to_string());

    // Ensure locale is set for unicode support
    if !env.contains_key("LANG") {
        env.insert("LANG".to_string(), "en_US.UTF-8".to_string());
    }

    env
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_environment])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
