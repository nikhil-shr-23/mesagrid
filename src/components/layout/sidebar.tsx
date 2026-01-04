import { useState } from "react";
import {
  Database,
  Plus,
  ChevronRight,
  ChevronDown,
  Table2,
  Eye,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useConnectionStore,
  type Connection,
  type TableInfo,
} from "@/stores/connection-store";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onNewConnection: () => void;
  onSelectTable: (table: TableInfo) => void;
  onOpenQuery: (connectionId: string) => void;
}

export function Sidebar({
  onNewConnection,
  onSelectTable,
  onOpenQuery,
}: SidebarProps) {
  const {
    connections,
    activeConnectionId,
    setActiveConnection,
    tables,
    theme,
    setTheme,
  } = useConnectionStore();

  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(
    new Set()
  );

  const toggleConnection = (connectionId: string) => {
    const newExpanded = new Set(expandedConnections);
    if (newExpanded.has(connectionId)) {
      newExpanded.delete(connectionId);
    } else {
      newExpanded.add(connectionId);
      setActiveConnection(connectionId);
    }
    setExpandedConnections(newExpanded);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-[hsl(var(--sidebar-bg))]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[hsl(var(--mesa-primary))]" />
            <span className="font-semibold text-sm">MesaGrid</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator />

        {/* New Connection Button */}
        <div className="px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onNewConnection}
          >
            <Plus className="h-4 w-4" />
            New Connection
          </Button>
        </div>

        <Separator />

        {/* Connections List */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-2">
            {connections.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <Database className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No connections</p>
                <p className="text-xs mt-1">
                  Click "New Connection" to add one
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {connections.map((connection) => (
                  <ConnectionItem
                    key={connection.id}
                    connection={connection}
                    isExpanded={expandedConnections.has(connection.id)}
                    isActive={activeConnectionId === connection.id}
                    tables={activeConnectionId === connection.id ? tables : []}
                    onToggle={() => toggleConnection(connection.id)}
                    onSelectTable={onSelectTable}
                    onOpenQuery={() => onOpenQuery(connection.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

interface ConnectionItemProps {
  connection: Connection;
  isExpanded: boolean;
  isActive: boolean;
  tables: TableInfo[];
  onToggle: () => void;
  onSelectTable: (table: TableInfo) => void;
  onOpenQuery: () => void;
}

function ConnectionItem({
  connection,
  isExpanded,
  isActive,
  tables,
  onToggle,
  onSelectTable,
  onOpenQuery,
}: ConnectionItemProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
          isActive && "bg-accent"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span
          className={cn(
            "status-dot shrink-0",
            connection.isConnected ? "connected" : "disconnected"
          )}
        />
        <span className="truncate flex-1 text-left">{connection.name}</span>
        <span className="text-xs text-muted-foreground uppercase">
          {connection.type}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {/* New Query button */}
          <button
            onClick={onOpenQuery}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            <span>New Query</span>
          </button>

          {/* Tables section */}
          {tables.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                Tables
              </div>
              {tables
                .filter((t) => t.type === "table")
                .map((table) => (
                  <button
                    key={`${table.schema}.${table.name}`}
                    onClick={() => onSelectTable(table)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                  >
                    <Table2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{table.name}</span>
                  </button>
                ))}

              {/* Views section */}
              {tables.some((t) => t.type === "view") && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase mt-2">
                    Views
                  </div>
                  {tables
                    .filter((t) => t.type === "view")
                    .map((view) => (
                      <button
                        key={`${view.schema}.${view.name}`}
                        onClick={() => onSelectTable(view)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                      >
                        <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{view.name}</span>
                      </button>
                    ))}
                </>
              )}
            </>
          )}

          {connection.isConnected && tables.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              No tables found
            </div>
          )}

          {!connection.isConnected && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Connect to see tables
            </div>
          )}
        </div>
      )}
    </div>
  );
}
