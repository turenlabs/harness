import { useState } from "react";
import { Plus, LayoutGrid, Terminal as TerminalIcon, Radio, Settings2, ArrowUpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useTerminalStore } from "@/stores/terminal-store";
import { useEnvStore } from "@/stores/env-store";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";
import { EnvPanel } from "./EnvPanel";

export function TopBar() {
  const { addTerminal, addUpgradeTerminal, terminals, layout, broadcastMode, toggleBroadcastMode, getVisibleTerminals } = useTerminalStore();
  const { envVars } = useEnvStore();
  const [envPanelOpen, setEnvPanelOpen] = useState(false);
  const visibleCount = getVisibleTerminals().length;
  const envVarCount = Object.keys(envVars).length;

  const handleNewTerminal = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select folder for Claude Code session",
    });

    if (selected) {
      addTerminal(selected as string);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-6 w-6 text-primary" />
          <div className="flex flex-col leading-tight">
            <h1 className="text-lg font-semibold">Harness</h1>
            <span className="text-xs text-muted-foreground">By Turen Labs</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          <span>
            {layout.cols}x{layout.rows} Grid
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span>{visibleCount} of {terminals.size} Terminal{terminals.size !== 1 ? "s" : ""}</span>
        </div>

        <Button
          onClick={toggleBroadcastMode}
          size="sm"
          variant={broadcastMode ? "default" : "outline"}
          className={cn(
            "gap-2",
            broadcastMode && "bg-red-600 hover:bg-red-700 text-white border-red-600"
          )}
        >
          <Radio className={cn("h-4 w-4", broadcastMode && "animate-pulse")} />
          Broadcast {broadcastMode ? "ON" : "OFF"}
        </Button>

        <Button
          onClick={() => setEnvPanelOpen(true)}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Env
          {envVarCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
              {envVarCount}
            </Badge>
          )}
        </Button>

        <Button
          onClick={addUpgradeTerminal}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <ArrowUpCircle className="h-4 w-4" />
          Upgrade Claude
        </Button>

        <Button onClick={handleNewTerminal} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Terminal
        </Button>
      </div>

      <EnvPanel open={envPanelOpen} onClose={() => setEnvPanelOpen(false)} />
    </header>
  );
}
