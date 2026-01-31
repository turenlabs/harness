import { Circle, Terminal as TerminalIcon, FolderOpen } from "lucide-react";
import { useTerminalStore } from "@/stores/terminal-store";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import type { TerminalStatus } from "@/types/terminal";

const statusColors: Record<TerminalStatus, string> = {
  starting: "text-warning",
  running: "text-success",
  idle: "text-muted-foreground",
  error: "text-destructive",
};

const statusBadgeVariant: Record<TerminalStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  starting: "warning",
  running: "success",
  idle: "secondary",
  error: "destructive",
};

export function Sidebar() {
  const { activeId, setActive, groups, setTerminalGroup, getVisibleTerminals, activeGroupId, broadcastMode } = useTerminalStore();
  const visibleTerminals = getVisibleTerminals();
  const groupList = Array.from(groups.values());

  return (
    <aside className="w-64 border-r bg-card/50 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {activeGroupId ? `${groups.get(activeGroupId)?.name}` : "All Terminals"} ({visibleTerminals.length})
        </h2>
        {broadcastMode && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Broadcast Mode Active
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {visibleTerminals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No terminals
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleTerminals.map((terminal) => {
                const group = groups.get(terminal.groupId);
                return (
                  <li key={terminal.id}>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                        "hover:bg-secondary",
                        activeId === terminal.id && "bg-secondary"
                      )}
                      onClick={() => setActive(terminal.id)}
                    >
                      <TerminalIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Circle
                            className={cn(
                              "w-2 h-2 fill-current",
                              statusColors[terminal.status]
                            )}
                          />
                          <span className="text-sm font-medium truncate">
                            {terminal.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={statusBadgeVariant[terminal.status]}
                            className="text-xs py-0"
                          >
                            {terminal.status}
                          </Badge>
                          {activeGroupId === null && group && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {group.name}
                            </span>
                          )}
                        </div>
                        {/* Group selector */}
                        <select
                          className="mt-1 text-xs bg-secondary border-0 rounded px-1 py-0.5 w-full"
                          value={terminal.groupId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            setTerminalGroup(terminal.id, e.target.value);
                          }}
                        >
                          {groupList.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd>Cmd+T</kbd>
          <span>New Terminal</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <kbd>Cmd+B</kbd>
          <span>Toggle Broadcast</span>
        </div>
      </div>
    </aside>
  );
}
