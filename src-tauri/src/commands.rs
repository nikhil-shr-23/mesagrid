use tauri::State;
use crate::database::{
    ConnectionManager, CreateConnectionParams, TestConnectionParams,
    ExecuteQueryParams, ConnectionConfig, TestConnectionResult, QueryResult, TableInfo,
};

/// Create a new connection configuration
#[tauri::command]
pub async fn create_connection(
    manager: State<'_, ConnectionManager>,
    params: CreateConnectionParams,
) -> Result<String, String> {
    manager
        .create_connection(params)
        .map_err(|e| e.to_string())
}

/// Test a connection without saving
#[tauri::command]
pub async fn test_connection(
    manager: State<'_, ConnectionManager>,
    params: TestConnectionParams,
) -> Result<TestConnectionResult, String> {
    Ok(manager.test_connection(params).await)
}

/// Establish connection to a saved configuration
#[tauri::command]
pub async fn connect(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<(), String> {
    manager
        .connect(&connection_id)
        .await
        .map_err(|e| e.to_string())
}

/// Disconnect from a connection
#[tauri::command]
pub async fn disconnect(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<(), String> {
    manager
        .disconnect(&connection_id)
        .map_err(|e| e.to_string())
}

/// List all saved connections
#[tauri::command]
pub async fn list_connections(
    manager: State<'_, ConnectionManager>,
) -> Result<Vec<ConnectionConfig>, String> {
    Ok(manager.list_connections())
}

/// Delete a connection
#[tauri::command]
pub async fn delete_connection(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<(), String> {
    manager
        .delete_connection(&connection_id)
        .map_err(|e| e.to_string())
}

/// Execute a SQL query
#[tauri::command]
pub async fn execute_query(
    manager: State<'_, ConnectionManager>,
    params: ExecuteQueryParams,
) -> Result<QueryResult, String> {
    manager
        .execute_query(params)
        .await
        .map_err(|e| e.to_string())
}

/// List tables for a connection
#[tauri::command]
pub async fn list_tables(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<Vec<TableInfo>, String> {
    manager
        .list_tables(&connection_id)
        .await
        .map_err(|e| e.to_string())
}
