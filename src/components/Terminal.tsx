import { useRef, useEffect, useCallback, useMemo } from "react";
import { useTerminal } from "@/hooks/use-terminal";
import { useTerminalStore } from "@/stores/terminal-store";
import { TerminalHeader } from "./TerminalHeader";
import { cn } from "@/lib/utils";
import type { TerminalColor } from "@/types/terminal";

// Map terminal colors to actual CSS color values for the active highlight
const highlightColors: Record<TerminalColor, string> = {
  default: "oklch(65% 0.2 240)", // primary blue
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
};

interface TerminalProps {
  terminalId: string;
}

export function Terminal({ terminalId }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeId, setActive, removeTerminal, updateTitle, updateColor, terminals } = useTerminalStore();
  const terminal = terminals.get(terminalId);
  const isActive = activeId === terminalId;

  const { fit, focus, kill } = useTerminal({
    terminalId,
    cwd: terminal?.cwd,
    containerRef,
    onReady: () => {
      if (isActive) {
        focus();
      }
    },
  });

  const handleClick = useCallback(() => {
    setActive(terminalId);
    focus();
  }, [terminalId, setActive, focus]);

  const handleClose = useCallback(() => {
    kill();
    removeTerminal(terminalId);
  }, [kill, removeTerminal, terminalId]);

  const handleRename = useCallback((newTitle: string) => {
    updateTitle(terminalId, newTitle);
  }, [terminalId, updateTitle]);

  const handleColorChange = useCallback((newColor: TerminalColor) => {
    updateColor(terminalId, newColor);
  }, [terminalId, updateColor]);

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive) {
      focus();
    }
  }, [isActive, focus]);

  // Fit terminal when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      fit();
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [fit]);

  // Compute the active highlight style based on terminal color
  const activeStyle = useMemo(() => {
    if (!isActive || !terminal) return undefined;
    return {
      boxShadow: `0 0 0 2px ${highlightColors[terminal.color]}`,
    };
  }, [isActive, terminal?.color]);

  if (!terminal) return null;

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-lg border bg-card overflow-hidden transition-shadow"
      )}
      style={activeStyle}
      onClick={handleClick}
    >
      <TerminalHeader
        title={terminal.title}
        status={terminal.status}
        color={terminal.color}
        onClose={handleClose}
        onRename={handleRename}
        onColorChange={handleColorChange}
      />
      <div
        ref={containerRef}
        className="terminal-container flex-1 min-h-0"
      />
    </div>
  );
}
