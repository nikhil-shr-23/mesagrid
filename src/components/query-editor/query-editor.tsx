import { useState, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor, Position, languages } from "monaco-editor";
import { Play, Clock, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connection-store";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

export function QueryEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const {
    queryTabs,
    activeTabId,
    activeConnectionId,
    addQueryTab,
    updateQueryTab,
    removeQueryTab,
    setActiveTab,
    connections,
    theme,
  } = useConnectionStore();

  const activeTab = queryTabs.find((t) => t.id === activeTabId);
  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;

    // Configure SQL language
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (
        model: editor.ITextModel,
        position: Position
      ): languages.ProviderResult<languages.CompletionList> => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const keywords = [
          "SELECT",
          "FROM",
          "WHERE",
          "INSERT",
          "INTO",
          "VALUES",
          "UPDATE",
          "SET",
          "DELETE",
          "CREATE",
          "TABLE",
          "DROP",
          "ALTER",
          "INDEX",
          "JOIN",
          "LEFT",
          "RIGHT",
          "INNER",
          "OUTER",
          "ON",
          "AND",
          "OR",
          "NOT",
          "NULL",
          "IS",
          "ORDER",
          "BY",
          "GROUP",
          "HAVING",
          "LIMIT",
          "OFFSET",
          "AS",
          "DISTINCT",
          "COUNT",
          "SUM",
          "AVG",
          "MAX",
          "MIN",
        ];

        return {
          suggestions: keywords.map((keyword) => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          })),
        };
      },
    });
  };

  const handleRunQuery = async () => {
    if (!activeTab || !activeConnection || isRunning) return;

    const sql = editorRef.current?.getModel()?.getValue() || activeTab.sql;
    if (!sql.trim()) return;

    setIsRunning(true);
    updateQueryTab(activeTab.id, { isRunning: true });

    try {
      const result = await api.executeQuery({
        connectionId: activeConnection.id,
        sql,
        limit: 100,
        offset: 0,
      });

      updateQueryTab(activeTab.id, {
        isRunning: false,
        results: result,
      });
    } catch (err) {
      updateQueryTab(activeTab.id, {
        isRunning: false,
        results: {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSqlChange = (value: string | undefined) => {
    if (activeTab && value !== undefined) {
      updateQueryTab(activeTab.id, { sql: value });
    }
  };

  const handleNewTab = () => {
    if (activeConnectionId) {
      addQueryTab(activeConnectionId);
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeQueryTab(tabId);
  };

  const connectionTabs = queryTabs.filter(
    (t) => t.connectionId === activeConnectionId
  );

  if (!activeConnection) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a connection to start querying
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-muted/30 px-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {connectionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                tab.id === activeTabId
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              {tab.isRunning && (
                <Loader2 className="h-3 w-3 animate-spin text-[hsl(var(--mesa-primary))]" />
              )}
              <span>{tab.title}</span>
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleNewTab}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeTab ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-background">
            <Button
              size="sm"
              onClick={handleRunQuery}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </Button>

            <div className="flex-1" />

            {activeTab.results && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{activeTab.results.rowCount} rows</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activeTab.results.executionTimeMs}ms
                </span>
              </div>
            )}
          </div>

          {/* Editor and Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Monaco Editor */}
            <div className="h-[40%] min-h-[150px] border-b border-border">
              <Editor
                height="100%"
                language="sql"
                theme={theme === "dark" ? "vs-dark" : "light"}
                value={activeTab.sql}
                onChange={handleSqlChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  wordWrap: "on",
                }}
              />
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-auto">
              {activeTab.results ? (
                activeTab.results.columns.length > 0 ? (
                  <table className="result-grid w-full">
                    <thead>
                      <tr>
                        {activeTab.results.columns.map((col) => (
                          <th key={col.name}>
                            <div className="flex flex-col">
                              <span>{col.name}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {col.dataType}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab.results.rows.map((row, i) => (
                        <tr key={i}>
                          {activeTab.results!.columns.map((col) => (
                            <td key={col.name}>
                              {formatCellValue(row[col.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Query executed successfully. No results to display.
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Run a query to see results
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Button variant="outline" onClick={handleNewTab} className="gap-2">
            <Plus className="h-4 w-4" />
            Open New Query Tab
          </Button>
        </div>
      )}
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null) return "NULL";
  if (value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
