import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ConnectionDialog } from "@/components/connections/connection-dialog";
import { QueryEditor } from "@/components/query-editor/query-editor";
import { WelcomeScreen } from "@/components/welcome-screen";
import { useConnectionStore, type TableInfo } from "@/stores/connection-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";

function App() {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);

  const {
    theme,
    queryTabs,
    activeTabId,
    activeConnectionId,
    addQueryTab,
    connections,
  } = useConnectionStore();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleNewConnection = () => {
    setConnectionDialogOpen(true);
  };

  const handleSelectTable = (table: TableInfo) => {
    setSelectedTable(table);
    // TODO: Open table viewer
  };

  const handleOpenQuery = (connectionId: string) => {
    addQueryTab(connectionId);
  };

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const activeTab = queryTabs.find((t) => t.id === activeTabId);

  const hasContent = queryTabs.length > 0 || selectedTable;

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <aside
          className="flex-shrink-0 border-r border-border"
          style={{ width: "var(--sidebar-width)" }}
        >
          <Sidebar
            onNewConnection={handleNewConnection}
            onSelectTable={handleSelectTable}
            onOpenQuery={handleOpenQuery}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {hasContent ? (
            <QueryEditor />
          ) : (
            <WelcomeScreen onNewConnection={handleNewConnection} />
          )}
        </main>

        {/* Dialogs */}
        <ConnectionDialog
          open={connectionDialogOpen}
          onOpenChange={setConnectionDialogOpen}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
