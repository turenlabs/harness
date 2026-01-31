import { useState } from "react";
import { X, Plus, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEnvStore } from "@/stores/env-store";
import { cn } from "@/lib/utils";

interface EnvPanelProps {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [
  { key: "ANTHROPIC_API_KEY", description: "Anthropic API key" },
  { key: "CLAUDE_CODE_USE_BEDROCK", description: "Use AWS Bedrock" },
  { key: "CLAUDE_CODE_USE_VERTEX", description: "Use Google Vertex AI" },
  { key: "AWS_REGION", description: "AWS Region" },
  { key: "AWS_ACCESS_KEY_ID", description: "AWS Access Key ID" },
  { key: "AWS_SECRET_ACCESS_KEY", description: "AWS Secret Access Key" },
];

export function EnvPanel({ open, onClose }: EnvPanelProps) {
  const { envVars, setEnvVar, removeEnvVar } = useEnvStore();
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [showWarning, setShowWarning] = useState(!localStorage.getItem("env-warning-dismissed"));

  const handleAdd = () => {
    if (newKey.trim() && newValue.trim()) {
      setEnvVar(newKey.trim(), newValue.trim());
      setNewKey("");
      setNewValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handlePresetClick = (presetKey: string) => {
    setNewKey(presetKey);
  };

  const dismissWarning = () => {
    localStorage.setItem("env-warning-dismissed", "true");
    setShowWarning(false);
  };

  const envEntries = Object.entries(envVars);
  const unusedPresets = PRESETS.filter((p) => !envVars[p.key]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[450px] bg-card border-l border-border shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Warning */}
        {showWarning && (
          <div className="mx-4 mt-4 p-3 bg-warning/10 border border-warning/30 rounded-md">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-warning">Security Notice</p>
                <p className="text-muted-foreground mt-1">
                  Values are stored in plaintext at ~/.config/harness/env.json
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs"
                  onClick={dismissWarning}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Existing Variables */}
          {envEntries.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Custom Variables ({envEntries.length})
              </h3>
              {envEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono truncate">{key}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate">
                      {revealedKeys.has(key) ? value : "•".repeat(Math.min(value.length, 20))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-50 hover:opacity-100"
                    onClick={() => toggleReveal(key)}
                  >
                    {revealedKeys.has(key) ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-50 hover:opacity-100 hover:text-destructive"
                    onClick={() => removeEnvVar(key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No custom environment variables</p>
              <p className="text-sm mt-1">Add variables below to pass to new terminals</p>
            </div>
          )}

          {/* Add New Variable */}
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-medium text-muted-foreground">Add Variable</h3>
            <div className="flex gap-2">
              <Input
                placeholder="KEY"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="flex-1 font-mono text-sm"
              />
              <Input
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 font-mono text-sm"
                type="password"
              />
              <Button
                size="icon"
                onClick={handleAdd}
                disabled={!newKey.trim() || !newValue.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Presets */}
          {unusedPresets.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">Common Presets</h3>
              <div className="flex flex-wrap gap-2">
                {unusedPresets.map((preset) => (
                  <Button
                    key={preset.key}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs font-mono h-7",
                      newKey === preset.key && "border-primary bg-primary/10"
                    )}
                    onClick={() => handlePresetClick(preset.key)}
                    title={preset.description}
                  >
                    {preset.key}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-secondary/20">
          <p className="text-xs text-muted-foreground text-center">
            Changes apply to new terminals only. Existing terminals keep their environment.
          </p>
        </div>
      </div>
    </div>
  );
}
