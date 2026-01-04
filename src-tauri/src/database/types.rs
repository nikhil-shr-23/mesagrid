use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

/// Database type supported by MesaGrid
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    Postgres,
    Mysql,
}

/// Connection configuration (without password)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_connected: Option<DateTime<Utc>>,
}

/// Parameters for creating a new connection
#[derive(Debug, Deserialize)]
pub struct CreateConnectionParams {
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
}

/// Parameters for testing a connection
#[derive(Debug, Deserialize)]
pub struct TestConnectionParams {
    #[serde(rename = "type")]
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
}

/// Parameters for executing a query
#[derive(Debug, Deserialize)]
pub struct ExecuteQueryParams {
    #[serde(rename = "connectionId")]
    pub connection_id: String,
    pub sql: String,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    100
}

/// Query result returned to frontend
#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<serde_json::Value>,
    #[serde(rename = "rowCount")]
    pub row_count: usize,
    #[serde(rename = "executionTimeMs")]
    pub execution_time_ms: u128,
}

/// Column information
#[derive(Debug, Clone, Serialize)]
pub struct ColumnInfo {
    pub name: String,
    #[serde(rename = "dataType")]
    pub data_type: String,
    pub nullable: bool,
}

/// Table information
#[derive(Debug, Clone, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub schema: String,
    #[serde(rename = "type")]
    pub table_type: String,
    #[serde(rename = "rowCount", skip_serializing_if = "Option::is_none")]
    pub row_count: Option<i64>,
}

/// Parameters for fetching table data
#[derive(Debug, Deserialize)]
pub struct GetTableDataParams {
    #[serde(rename = "connectionId")]
    pub connection_id: String,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(default = "default_schema")]
    pub schema: String,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_schema() -> String {
    "public".to_string()
}

/// Table data result
#[derive(Debug, Serialize)]
pub struct TableDataResult {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<serde_json::Value>,
    #[serde(rename = "totalCount")]
    pub total_count: i64,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
}

/// Test connection result
#[derive(Debug, Serialize)]
pub struct TestConnectionResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
