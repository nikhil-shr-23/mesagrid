mod commands;
mod database;

use database::ConnectionManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ConnectionManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::create_connection,
            commands::test_connection,
            commands::connect,
            commands::disconnect,
            commands::list_connections,
            commands::delete_connection,
            commands::execute_query,
            commands::list_tables,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
