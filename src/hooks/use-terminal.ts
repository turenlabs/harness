import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { CanvasAddon } from "@xterm/addon-canvas";
import { usePty } from "./use-pty";
import { useTerminalStore } from "@/stores/terminal-store";
import { hasPty } from "@/services/pty-manager";

interface UseTerminalOptions {
  terminalId: string;
  cwd?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady?: () => void;
}

export function useTerminal({ terminalId, cwd, containerRef, onReady }: UseTerminalOptions) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const canvasAddonRef = useRef<CanvasAddon | null>(null);
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Store callbacks in refs to avoid effect re-runs
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Check if terminal is scrolled to (near) bottom
  const isAtBottom = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return true;
    const buffer = term.buffer.active;
    // Consider "at bottom" if within 3 lines of the bottom
    return buffer.viewportY >= buffer.baseY - 3;
  }, []);

  const { spawn, write, resize, kill } = usePty({
    terminalId,
    cwd,
    onData: (data) => {
      const wasAtBottom = isAtBottom();
      terminalRef.current?.write(data);
      // Auto-scroll to bottom if user was already at bottom
      if (wasAtBottom) {
        terminalRef.current?.scrollToBottom();
      }
    },
    onExit: () => {
      terminalRef.current?.write("\r\n[Process exited]\r\n");
      terminalRef.current?.scrollToBottom();
    },
  });

  // Store PTY functions in refs to avoid effect dependency issues
  const spawnRef = useRef(spawn);
  const writeRef = useRef(write);
  const resizeRef = useRef(resize);
  const killRef = useRef(kill);

  useEffect(() => {
    spawnRef.current = spawn;
    writeRef.current = write;
    resizeRef.current = resize;
    killRef.current = kill;
  }, [spawn, write, resize, kill]);

  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        const wasAtBottom = isAtBottom();
        fitAddonRef.current.fit();
        resizeRef.current(terminalRef.current.cols, terminalRef.current.rows);
        // Preserve scroll position - if user was at bottom, stay at bottom
        if (wasAtBottom) {
          terminalRef.current.scrollToBottom();
        }
      } catch (e) {
        // Ignore fit errors
      }
    }
  }, [isAtBottom]);

  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  // Get broadcast functions from store
  const registerBroadcastHandler = useTerminalStore((state) => state.registerBroadcastHandler);
  const unregisterBroadcastHandler = useTerminalStore((state) => state.unregisterBroadcastHandler);

  // Register broadcast handler when terminal is ready
  useEffect(() => {
    if (!isReady) return;

    // Register this terminal's write function for broadcast
    registerBroadcastHandler(terminalId, (data: string) => {
      writeRef.current(data);
    });

    return () => {
      unregisterBroadcastHandler(terminalId);
    };
  }, [isReady, terminalId, registerBroadcastHandler, unregisterBroadcastHandler]);

  // Initialize terminal - runs once when container is available
  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;

    initializedRef.current = true;
    const isReconnecting = hasPty(terminalId);
    console.log("Initializing terminal:", terminalId, isReconnecting ? "(reconnecting)" : "(new)");

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      theme: {
        background: "#0f1729",
        foreground: "#e2e8f0",
        cursor: "#60a5fa",
        cursorAccent: "#0f1729",
        selectionBackground: "#334155",
        selectionForeground: "#e2e8f0",
        black: "#1e293b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e2e8f0",
        brightBlack: "#475569",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#f8fafc",
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    terminalRef.current = terminal;

    // Add fit addon
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);

    // Open terminal in container
    terminal.open(containerRef.current);

    // Use Canvas addon instead of WebGL to avoid context limits
    // WebGL has a browser limit of ~8-16 contexts, Canvas has no such limit
    try {
      const canvasAddon = new CanvasAddon();
      canvasAddonRef.current = canvasAddon;
      terminal.loadAddon(canvasAddon);
    } catch (e) {
      console.warn("Canvas addon not available, using default renderer");
    }

    // Fit to container
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    // If reconnecting, replay buffered output first
    if (isReconnecting) {
      const storedTerminal = useTerminalStore.getState().terminals.get(terminalId);
      if (storedTerminal?.outputHistory?.length) {
        console.log(`Replaying ${storedTerminal.outputHistory.length} buffered outputs`);
        for (const output of storedTerminal.outputHistory) {
          terminal.write(output);
        }
        terminal.scrollToBottom();
      }
    }

    // Handle Shift+Enter to insert newline (for multi-line input in Claude)
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type === "keydown" && event.key === "Enter" && event.shiftKey) {
        // Send newline character for Shift+Enter
        const data = "\n";
        // Get current state directly from store to ensure we have latest broadcast mode
        const state = useTerminalStore.getState();
        if (state.broadcastMode) {
          state.broadcast(data);
        } else {
          writeRef.current(data);
        }
        return false; // Prevent default handling
      }
      return true; // Allow default handling for other keys
    });

    // Handle user input - forward to PTY (or broadcast to all if broadcast mode is on)
    terminal.onData((data) => {
      // Get current state directly from store to ensure we have latest broadcast mode
      const state = useTerminalStore.getState();
      if (state.broadcastMode) {
        // Broadcast mode: send to all visible terminals
        state.broadcast(data);
      } else {
        // Normal mode: send only to this terminal
        writeRef.current(data);
      }
    });

    // Handle terminal resize - forward to PTY
    terminal.onResize(({ cols, rows }) => {
      resizeRef.current(cols, rows);
    });

    // Spawn/reconnect PTY
    spawnRef.current().then(() => {
      console.log("PTY spawn/reconnect complete for terminal:", terminalId);
      // Send initial resize after PTY is ready
      setTimeout(() => {
        if (terminalRef.current) {
          resizeRef.current(terminalRef.current.cols, terminalRef.current.rows);
        }
      }, 100);
      setIsReady(true);
      onReadyRef.current?.();
    });

    return () => {
      console.log("Unmounting terminal UI:", terminalId);
      // DON'T kill PTY here - it will stay alive for reconnection
      // The usePty cleanup will handle disconnecting callbacks
      if (canvasAddonRef.current) {
        canvasAddonRef.current.dispose();
        canvasAddonRef.current = null;
      }
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
      setIsReady(false);
    };
  }, [terminalId, containerRef]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      fit();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fit]);

  return {
    terminal: terminalRef.current,
    isReady,
    fit,
    focus,
    write,
    kill,
  };
}
