import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConnectionStore,
  type DatabaseType,
  type Connection,
} from "@/stores/connection-store";
import * as api from "@/lib/api";

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editConnection?: Connection;
}

interface FormData {
  name: string;
  type: DatabaseType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

const defaultFormData: FormData = {
  name: "",
  type: "postgres",
  host: "localhost",
  port: "5432",
  database: "",
  username: "",
  password: "",
};

const defaultPorts: Record<DatabaseType, string> = {
  postgres: "5432",
  mysql: "3306",
};

export function ConnectionDialog({
  open,
  onOpenChange,
  editConnection,
}: ConnectionDialogProps) {
  const { addConnection, updateConnection } = useConnectionStore();

  const [formData, setFormData] = useState<FormData>(
    editConnection
      ? {
          name: editConnection.name,
          type: editConnection.type,
          host: editConnection.host,
          port: String(editConnection.port),
          database: editConnection.database,
          username: editConnection.username,
          password: "",
        }
      : defaultFormData
  );

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (type: DatabaseType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      port: defaultPorts[type],
    }));
    setTestResult(null);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await api.testConnection({
        type: formData.type,
        host: formData.host,
        port: parseInt(formData.port, 10),
        database: formData.database,
        username: formData.username,
        password: formData.password,
      });

      setTestResult({
        success: result.success,
        message: result.success
          ? "Connection successful!"
          : result.error || "Connection failed",
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (editConnection) {
        // Update existing connection
        updateConnection(editConnection.id, {
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: parseInt(formData.port, 10),
          database: formData.database,
          username: formData.username,
        });
        // If password changed, update in keychain
        if (formData.password) {
          await api.createConnection({
            ...formData,
            port: parseInt(formData.port, 10),
          });
        }
      } else {
        // Create new connection
        const connectionId = await api.createConnection({
          ...formData,
          port: parseInt(formData.port, 10),
        });

        addConnection({
          id: connectionId,
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: parseInt(formData.port, 10),
          database: formData.database,
          username: formData.username,
          isConnected: false,
        });
      }

      onOpenChange(false);
      setFormData(defaultFormData);
      setTestResult(null);
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to save connection",
      });
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    formData.name.trim() &&
    formData.host.trim() &&
    formData.port.trim() &&
    formData.database.trim() &&
    formData.username.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editConnection ? "Edit Connection" : "New Connection"}
          </DialogTitle>
          <DialogDescription>
            Configure your database connection details. Credentials are stored
            securely in your system keychain.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Connection Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              placeholder="My Database"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
          </div>

          {/* Database Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">Database Type</Label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Host and Port */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                placeholder="localhost"
                value={formData.host}
                onChange={(e) => handleInputChange("host", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                placeholder={defaultPorts[formData.type]}
                value={formData.port}
                onChange={(e) => handleInputChange("port", e.target.value)}
              />
            </div>
          </div>

          {/* Database */}
          <div className="grid gap-2">
            <Label htmlFor="database">Database</Label>
            <Input
              id="database"
              placeholder="mydb"
              value={formData.database}
              onChange={(e) => handleInputChange("database", e.target.value)}
            />
          </div>

          {/* Username */}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="postgres"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="password">
              Password
              {editConnection && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  (leave empty to keep existing)
                </span>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                testResult.success
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !isValid}
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={saving || !isValid}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editConnection ? "Save Changes" : "Save Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
