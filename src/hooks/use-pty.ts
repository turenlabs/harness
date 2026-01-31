import { useCallback, useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminal-store";
import {
  getOrCreatePty,
  writeToPty,
  resizePty,
  disconnectCallbacks,
  killPty,
  hasPty,
} from "../services/pty-manager";

interface UsePtyOptions {
  terminalId: string;
  cwd?: string;
  onData?: (data: string) => void;
  onExit?: () => void;
}

export function usePty({
  terminalId,
  cwd,
  onData: onDataCallback,
  onExit,
}: UsePtyOptions) {
  const onDataRef = useRef(onDataCallback);
  const onExitRef = useRef(onExit);
  const spawnedRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    onDataRef.current = onDataCallback;
    onExitRef.current = onExit;
  }, [onDataCallback, onExit]);

  const updateStatus = useTerminalStore((state) => state.updateStatus);
  const appendOutput = useTerminalStore((state) => state.appendOutput);

  // Stable callback wrappers that use refs
  const handleData = useCallback(
    (data: string) => {
      appendOutput(terminalId, data);
      onDataRef.current?.(data);
    },
    [terminalId, appendOutput]
  );

  const handleExit = useCallback(() => {
    updateStatus(terminalId, "idle");
    onExitRef.current?.();
  }, [terminalId, updateStatus]);

  const spawnPty = useCallback(async () => {
    if (spawnedRef.current && hasPty(terminalId)) {
      console.log("PTY already exists, reconnecting");
      // Reconnect to existing PTY
      await getOrCreatePty(terminalId, {
        cwd,
        onData: handleData,
        onExit: handleExit,
      });
      updateStatus(terminalId, "running");
      return;
    }

    try {
      console.log("Spawning PTY for terminal:", terminalId, "cwd:", cwd);

      await getOrCreatePty(terminalId, {
        cwd,
        args: ["-l", "-c", "claude --dangerously-skip-permissions"],
        onData: handleData,
        onExit: handleExit,
      });

      spawnedRef.current = true;
      updateStatus(terminalId, "running");
      console.log("PTY spawned successfully");
    } catch (error) {
      console.error("Failed to spawn PTY:", error);
      updateStatus(terminalId, "error");
    }
  }, [terminalId, cwd, updateStatus, handleData, handleExit]);

  const write = useCallback(
    (data: string) => {
      writeToPty(terminalId, data);
    },
    [terminalId]
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      resizePty(terminalId, cols, rows);
    },
    [terminalId]
  );

  const kill = useCallback(() => {
    console.log("Killing PTY for terminal:", terminalId);
    killPty(terminalId);
    spawnedRef.current = false;
  }, [terminalId]);

  // Cleanup on unmount - only disconnect callbacks, DON'T kill PTY
  useEffect(() => {
    return () => {
      console.log("Disconnecting PTY callbacks for:", terminalId);
      disconnectCallbacks(terminalId, handleData, handleExit);
    };
  }, [terminalId, handleData, handleExit]);

  return {
    spawn: spawnPty,
    write,
    resize,
    kill,
    hasPty: () => hasPty(terminalId),
  };
}
