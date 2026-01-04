import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DatabaseType = "postgres" | "mysql";

export interface Connection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  // Password is stored in OS keychain, not here
  isConnected: boolean;
  lastConnected?: string;
}

export interface QueryTab {
  id: string;
  connectionId: string;
  title: string;
  sql: string;
  results?: QueryResult;
  isRunning: boolean;
}

export interface QueryResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  schema: string;
  type: "table" | "view";
  rowCount?: number;
}

interface ConnectionStore {
  // Connections
  connections: Connection[];
  activeConnectionId: string | null;
  
  // Query tabs
  queryTabs: QueryTab[];
  activeTabId: string | null;
  
  // Tables for active connection
  tables: TableInfo[];
  
  // UI state
  sidebarWidth: number;
  theme: "light" | "dark" | "system";
  
  // Connection actions
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  setConnectionStatus: (id: string, isConnected: boolean) => void;
  
  // Tab actions
  addQueryTab: (connectionId: string) => void;
  updateQueryTab: (id: string, updates: Partial<QueryTab>) => void;
  removeQueryTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  
  // Table actions
  setTables: (tables: TableInfo[]) => void;
  
  // UI actions
  setSidebarWidth: (width: number) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      connections: [],
      activeConnectionId: null,
      queryTabs: [],
      activeTabId: null,
      tables: [],
      sidebarWidth: 260,
      theme: "dark",

      // Connection actions
      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
        })),

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
          queryTabs: state.queryTabs.filter((t) => t.connectionId !== id),
        })),

      setActiveConnection: (id) =>
        set({ activeConnectionId: id, tables: [] }),

      setConnectionStatus: (id, isConnected) =>
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isConnected,
                  lastConnected: isConnected ? new Date().toISOString() : c.lastConnected,
                }
              : c
          ),
        })),

      // Tab actions
      addQueryTab: (connectionId) => {
        const newTabId = generateId();
        const tabCount = get().queryTabs.filter(
          (t) => t.connectionId === connectionId
        ).length;
        
        set((state) => ({
          queryTabs: [
            ...state.queryTabs,
            {
              id: newTabId,
              connectionId,
              title: `Query ${tabCount + 1}`,
              sql: "",
              isRunning: false,
            },
          ],
          activeTabId: newTabId,
        }));
      },

      updateQueryTab: (id, updates) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      removeQueryTab: (id) =>
        set((state) => {
          const tabs = state.queryTabs.filter((t) => t.id !== id);
          const wasActive = state.activeTabId === id;
          return {
            queryTabs: tabs,
            activeTabId: wasActive ? tabs[tabs.length - 1]?.id ?? null : state.activeTabId,
          };
        }),

      setActiveTab: (id) => set({ activeTabId: id }),

      // Table actions
      setTables: (tables) => set({ tables }),

      // UI actions
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "mesagrid-storage",
      partialize: (state) => ({
        connections: state.connections.map((c) => ({ ...c, isConnected: false })),
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
      }),
    }
  )
);
