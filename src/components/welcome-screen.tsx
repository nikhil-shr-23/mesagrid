import { Database, Plus, Sparkles, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onNewConnection: () => void;
}

export function WelcomeScreen({ onNewConnection }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--mesa-primary))] to-[hsl(217,91%,50%)] shadow-lg shadow-[hsl(var(--mesa-primary)/0.25)]">
          <Database className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2">Welcome to MesaGrid</h1>
        <p className="text-muted-foreground mb-8">
          A fast, native, and secure database GUI for the modern developer.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          onClick={onNewConnection}
          className="gap-2 bg-gradient-to-r from-[hsl(var(--mesa-primary))] to-[hsl(217,91%,50%)] hover:opacity-90 mb-12"
        >
          <Plus className="h-5 w-5" />
          Create Your First Connection
        </Button>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 text-left">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Zap className="h-5 w-5 text-[hsl(var(--mesa-warning))]" />
            </div>
            <h3 className="font-semibold">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Native performance with Rust backend. No Chromium tax.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Shield className="h-5 w-5 text-[hsl(var(--mesa-success))]" />
            </div>
            <h3 className="font-semibold">Secure by Default</h3>
            <p className="text-sm text-muted-foreground">
              Credentials stored in your OS keychain. Never in plain text.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Sparkles className="h-5 w-5 text-[hsl(var(--mesa-primary))]" />
            </div>
            <h3 className="font-semibold">Modern UX</h3>
            <p className="text-sm text-muted-foreground">
              Monaco editor, inline editing, and paginated results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
