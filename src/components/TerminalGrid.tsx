import { useTerminalStore } from "@/stores/terminal-store";
import { Terminal } from "./Terminal";

export function TerminalGrid() {
  const { layout, terminals, activeGroupId } = useTerminalStore();
  const allTerminals = Array.from(terminals.values());

  // Determine which terminals are visible based on active group
  const visibleIds = new Set(
    allTerminals
      .filter((t) => activeGroupId === null || t.groupId === activeGroupId)
      .map((t) => t.id)
  );

  return (
    <div
      className="grid gap-2 p-2 h-full"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
      }}
    >
      {allTerminals.map((terminal) => {
        const isVisible = visibleIds.has(terminal.id);
        return (
          <div
            key={terminal.id}
            className={isVisible ? "contents" : "hidden"}
          >
            <Terminal terminalId={terminal.id} />
          </div>
        );
      })}
    </div>
  );
}
