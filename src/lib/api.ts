import { invoke } from "@tauri-apps/api/core";
import type {
  Connection,
  DatabaseType,
  QueryResult,
  TableInfo,
  ColumnInfo,
} from "@/stores/connection-store";

// Connection management
export interface CreateConnectionParams {
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface TestConnectionParams {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface ExecuteQueryParams {
  connectionId: string;
  sql: string;
  limit?: number;
  offset?: number;
}

export interface GetTableDataParams {
  connectionId: string;
  tableName: string;
  schema?: string;
  limit?: number;
  offset?: number;
}

export interface TableDataResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  totalCount: number;
  hasMore: boolean;
}

// Connection commands
export async function createConnection(
  params: CreateConnectionParams
): Promise<string> {
  return invoke("create_connection", { params });
}

export async function testConnection(
  params: TestConnectionParams
): Promise<{ success: boolean; error?: string }> {
  return invoke("test_connection", { params });
}

export async function connect(connectionId: string): Promise<void> {
  return invoke("connect", { connectionId });
}

export async function disconnect(connectionId: string): Promise<void> {
  return invoke("disconnect", { connectionId });
}

export async function listConnections(): Promise<Connection[]> {
  return invoke("list_connections");
}

export async function deleteConnection(connectionId: string): Promise<void> {
  return invoke("delete_connection", { connectionId });
}

// Query commands
export async function executeQuery(
  params: ExecuteQueryParams
): Promise<QueryResult> {
  return invoke("execute_query", { params });
}

export async function cancelQuery(queryId: string): Promise<void> {
  return invoke("cancel_query", { queryId });
}

// Table commands
export async function listTables(connectionId: string): Promise<TableInfo[]> {
  return invoke("list_tables", { connectionId });
}

export async function getTableSchema(
  connectionId: string,
  tableName: string,
  schema?: string
): Promise<ColumnInfo[]> {
  return invoke("get_table_schema", { connectionId, tableName, schema });
}

export async function getTableData(
  params: GetTableDataParams
): Promise<TableDataResult> {
  return invoke("get_table_data", { params });
}

// Cell edit commands
export async function updateCell(
  connectionId: string,
  tableName: string,
  schema: string,
  primaryKeyColumn: string,
  primaryKeyValue: unknown,
  column: string,
  value: unknown
): Promise<void> {
  return invoke("update_cell", {
    connectionId,
    tableName,
    schema,
    primaryKeyColumn,
    primaryKeyValue,
    column,
    value,
  });
}

export async function insertRow(
  connectionId: string,
  tableName: string,
  schema: string,
  data: Record<string, unknown>
): Promise<void> {
  return invoke("insert_row", {
    connectionId,
    tableName,
    schema,
    data,
  });
}

export async function deleteRow(
  connectionId: string,
  tableName: string,
  schema: string,
  primaryKeyColumn: string,
  primaryKeyValue: unknown
): Promise<void> {
  return invoke("delete_row", {
    connectionId,
    tableName,
    schema,
    primaryKeyColumn,
    primaryKeyValue,
  });
}
