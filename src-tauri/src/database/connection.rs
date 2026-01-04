use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use sqlx::{mysql::MySqlPoolOptions, postgres::PgPoolOptions, MySqlPool, PgPool, Row, Column};
use thiserror::Error;
use uuid::Uuid;
use std::time::Instant;

use super::credentials;
use super::types::*;

#[derive(Error, Debug)]
pub enum ConnectionError {
    #[error("Connection not found: {0}")]
    NotFound(String),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Credential error: {0}")]
    Credential(String),
    #[error("Unsupported database type")]
    UnsupportedType,
}

/// Holds either a Postgres or MySQL connection pool
pub enum DatabasePool {
    Postgres(PgPool),
    MySql(MySqlPool),
}

/// Manages database connections and configurations
pub struct ConnectionManager {
    /// Saved connection configurations
    configs: RwLock<HashMap<String, ConnectionConfig>>,
    /// Active connection pools
    pools: RwLock<HashMap<String, Arc<DatabasePool>>>,
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            configs: RwLock::new(HashMap::new()),
            pools: RwLock::new(HashMap::new()),
        }
    }

    /// Create a new connection configuration and store credentials
    pub fn create_connection(&self, params: CreateConnectionParams) -> Result<String, ConnectionError> {
        let id = Uuid::new_v4().to_string();
        
        // Store password in keychain
        credentials::store_password(&id, &params.password)
            .map_err(|e| ConnectionError::Credential(e.to_string()))?;

        let config = ConnectionConfig {
            id: id.clone(),
            name: params.name,
            db_type: params.db_type,
            host: params.host,
            port: params.port,
            database: params.database,
            username: params.username,
            created_at: Some(chrono::Utc::now()),
            last_connected: None,
        };

        self.configs.write().insert(id.clone(), config);
        
        Ok(id)
    }

    /// Test connection without saving
    pub async fn test_connection(&self, params: TestConnectionParams) -> TestConnectionResult {
        let connection_string = build_connection_string(
            params.db_type,
            &params.host,
            params.port,
            &params.database,
            &params.username,
            &params.password,
        );

        let result = match params.db_type {
            DatabaseType::Postgres => {
                PgPoolOptions::new()
                    .max_connections(1)
                    .acquire_timeout(std::time::Duration::from_secs(5))
                    .connect(&connection_string)
                    .await
                    .map(|_| ())
            }
            DatabaseType::Mysql => {
                MySqlPoolOptions::new()
                    .max_connections(1)
                    .acquire_timeout(std::time::Duration::from_secs(5))
                    .connect(&connection_string)
                    .await
                    .map(|_| ())
            }
        };

        match result {
            Ok(_) => TestConnectionResult {
                success: true,
                error: None,
            },
            Err(e) => TestConnectionResult {
                success: false,
                error: Some(e.to_string()),
            },
        }
    }

    /// Connect to a saved connection
    pub async fn connect(&self, connection_id: &str) -> Result<(), ConnectionError> {
        let config = self.configs.read()
            .get(connection_id)
            .cloned()
            .ok_or_else(|| ConnectionError::NotFound(connection_id.to_string()))?;

        let password = credentials::get_password(connection_id)
            .map_err(|e| ConnectionError::Credential(e.to_string()))?;

        let connection_string = build_connection_string(
            config.db_type,
            &config.host,
            config.port,
            &config.database,
            &config.username,
            &password,
        );

        let pool = match config.db_type {
            DatabaseType::Postgres => {
                let pool = PgPoolOptions::new()
                    .max_connections(5)
                    .connect(&connection_string)
                    .await?;
                DatabasePool::Postgres(pool)
            }
            DatabaseType::Mysql => {
                let pool = MySqlPoolOptions::new()
                    .max_connections(5)
                    .connect(&connection_string)
                    .await?;
                DatabasePool::MySql(pool)
            }
        };

        self.pools.write().insert(connection_id.to_string(), Arc::new(pool));
        
        // Update last connected time
        if let Some(config) = self.configs.write().get_mut(connection_id) {
            config.last_connected = Some(chrono::Utc::now());
        }

        Ok(())
    }

    /// Disconnect from a connection
    pub fn disconnect(&self, connection_id: &str) -> Result<(), ConnectionError> {
        self.pools.write().remove(connection_id);
        Ok(())
    }

    /// Get all saved connections
    pub fn list_connections(&self) -> Vec<ConnectionConfig> {
        self.configs.read().values().cloned().collect()
    }

    /// Delete a connection
    pub fn delete_connection(&self, connection_id: &str) -> Result<(), ConnectionError> {
        self.pools.write().remove(connection_id);
        self.configs.write().remove(connection_id);
        let _ = credentials::delete_password(connection_id);
        Ok(())
    }

    /// Execute a query
    pub async fn execute_query(&self, params: ExecuteQueryParams) -> Result<QueryResult, ConnectionError> {
        let pool = self.pools.read()
            .get(&params.connection_id)
            .cloned()
            .ok_or_else(|| ConnectionError::NotFound(params.connection_id.clone()))?;

        let start = Instant::now();
        
        let result = match pool.as_ref() {
            DatabasePool::Postgres(pool) => execute_postgres_query(pool, &params.sql).await?,
            DatabasePool::MySql(pool) => execute_mysql_query(pool, &params.sql).await?,
        };

        let execution_time_ms = start.elapsed().as_millis();

        Ok(QueryResult {
            columns: result.0,
            rows: result.1,
            row_count: result.2,
            execution_time_ms,
        })
    }

    /// List tables for a connection
    pub async fn list_tables(&self, connection_id: &str) -> Result<Vec<TableInfo>, ConnectionError> {
        let pool = self.pools.read()
            .get(connection_id)
            .cloned()
            .ok_or_else(|| ConnectionError::NotFound(connection_id.to_string()))?;

        let config = self.configs.read()
            .get(connection_id)
            .cloned()
            .ok_or_else(|| ConnectionError::NotFound(connection_id.to_string()))?;

        match pool.as_ref() {
            DatabasePool::Postgres(pool) => list_postgres_tables(pool).await,
            DatabasePool::MySql(pool) => list_mysql_tables(pool, &config.database).await,
        }
    }

    /// Check if connection is active
    pub fn is_connected(&self, connection_id: &str) -> bool {
        self.pools.read().contains_key(connection_id)
    }
}

fn build_connection_string(
    db_type: DatabaseType,
    host: &str,
    port: u16,
    database: &str,
    username: &str,
    password: &str,
) -> String {
    match db_type {
        DatabaseType::Postgres => {
            format!("postgres://{}:{}@{}:{}/{}", username, password, host, port, database)
        }
        DatabaseType::Mysql => {
            format!("mysql://{}:{}@{}:{}/{}", username, password, host, port, database)
        }
    }
}

async fn execute_postgres_query(
    pool: &PgPool,
    sql: &str,
) -> Result<(Vec<ColumnInfo>, Vec<serde_json::Value>, usize), ConnectionError> {
    let rows = sqlx::query(sql).fetch_all(pool).await?;
    
    if rows.is_empty() {
        return Ok((vec![], vec![], 0));
    }

    let columns: Vec<ColumnInfo> = rows[0]
        .columns()
        .iter()
        .map(|col| ColumnInfo {
            name: col.name().to_string(),
            data_type: col.type_info().to_string(),
            nullable: true, // PostgreSQL requires more complex checks
        })
        .collect();

    let mut result_rows = Vec::with_capacity(rows.len());
    for row in &rows {
        let mut obj = serde_json::Map::new();
        for (i, col) in columns.iter().enumerate() {
            let value = extract_postgres_value(&row, i);
            obj.insert(col.name.clone(), value);
        }
        result_rows.push(serde_json::Value::Object(obj));
    }

    let row_count = result_rows.len();
    Ok((columns, result_rows, row_count))
}

async fn execute_mysql_query(
    pool: &MySqlPool,
    sql: &str,
) -> Result<(Vec<ColumnInfo>, Vec<serde_json::Value>, usize), ConnectionError> {
    let rows = sqlx::query(sql).fetch_all(pool).await?;
    
    if rows.is_empty() {
        return Ok((vec![], vec![], 0));
    }

    let columns: Vec<ColumnInfo> = rows[0]
        .columns()
        .iter()
        .map(|col| ColumnInfo {
            name: col.name().to_string(),
            data_type: col.type_info().to_string(),
            nullable: true,
        })
        .collect();

    let mut result_rows = Vec::with_capacity(rows.len());
    for row in &rows {
        let mut obj = serde_json::Map::new();
        for (i, col) in columns.iter().enumerate() {
            let value = extract_mysql_value(&row, i);
            obj.insert(col.name.clone(), value);
        }
        result_rows.push(serde_json::Value::Object(obj));
    }

    let row_count = result_rows.len();
    Ok((columns, result_rows, row_count))
}

fn extract_postgres_value(row: &sqlx::postgres::PgRow, index: usize) -> serde_json::Value {
    // Try to get as various types
    if let Ok(v) = row.try_get::<Option<i64>, _>(index) {
        return v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<i32>, _>(index) {
        return v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<f64>, _>(index) {
        return v.and_then(|n| serde_json::Number::from_f64(n))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<bool>, _>(index) {
        return v.map(serde_json::Value::Bool).unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<String>, _>(index) {
        return v.map(serde_json::Value::String).unwrap_or(serde_json::Value::Null);
    }
    serde_json::Value::Null
}

fn extract_mysql_value(row: &sqlx::mysql::MySqlRow, index: usize) -> serde_json::Value {
    if let Ok(v) = row.try_get::<Option<i64>, _>(index) {
        return v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<i32>, _>(index) {
        return v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<f64>, _>(index) {
        return v.and_then(|n| serde_json::Number::from_f64(n))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<bool>, _>(index) {
        return v.map(serde_json::Value::Bool).unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<String>, _>(index) {
        return v.map(serde_json::Value::String).unwrap_or(serde_json::Value::Null);
    }
    serde_json::Value::Null
}

async fn list_postgres_tables(pool: &PgPool) -> Result<Vec<TableInfo>, ConnectionError> {
    let query = r#"
        SELECT 
            table_name as name,
            table_schema as schema,
            table_type as type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
    "#;

    let rows = sqlx::query(query).fetch_all(pool).await?;
    
    let tables = rows
        .iter()
        .map(|row| TableInfo {
            name: row.try_get("name").unwrap_or_default(),
            schema: row.try_get("schema").unwrap_or_default(),
            table_type: if row.try_get::<String, _>("type").unwrap_or_default() == "VIEW" {
                "view".to_string()
            } else {
                "table".to_string()
            },
            row_count: None,
        })
        .collect();

    Ok(tables)
}

async fn list_mysql_tables(pool: &MySqlPool, database: &str) -> Result<Vec<TableInfo>, ConnectionError> {
    let query = r#"
        SELECT 
            TABLE_NAME as name,
            TABLE_SCHEMA as `schema`,
            TABLE_TYPE as type
        FROM information_schema.tables
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
    "#;

    let rows = sqlx::query(query)
        .bind(database)
        .fetch_all(pool)
        .await?;
    
    let tables = rows
        .iter()
        .map(|row| TableInfo {
            name: row.try_get("name").unwrap_or_default(),
            schema: row.try_get("schema").unwrap_or_default(),
            table_type: if row.try_get::<String, _>("type").unwrap_or_default() == "VIEW" {
                "view".to_string()
            } else {
                "table".to_string()
            },
            row_count: None,
        })
        .collect();

    Ok(tables)
}
