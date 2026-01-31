/**
 * Global PTY Manager
 *
 * Keeps PTY instances alive independently of React component lifecycle.
 * This allows terminals to persist when switching tabs/views.
 *
 * Architecture:
 * - PTY processes are stored in a global Map by terminal ID
 * - When a terminal component mounts, it connects to an existing PTY or creates one
 * - When a terminal component unmounts, the PTY stays alive
 * - Output is buffered in Zustand store and replayed on reconnect
 */

import { spawn as ptySpawn, type IPty, type IDisposable } from "tauri-pty";
import { invoke } from "@tauri-apps/api/core";
import { getCustomEnvVars, subscribeToEnvChanges } from "../stores/env-store";

// Cache the base environment so we don't fetch it repeatedly
let cachedBaseEnv: Record<string, string> | null = null;

// Subscribe to env changes to invalidate cache
// Note: We don't need to invalidate base env cache, only merge on each spawn
subscribeToEnvChanges(() => {
  console.log("[PTY Manager] Custom env vars changed - new terminals will use updated values");
});

/**
 * Get the base environment variables from the Rust side
 */
async function getBaseEnvironment(): Promise<Record<string, string>> {
  if (cachedBaseEnv) return cachedBaseEnv;
  try {
    cachedBaseEnv = await invoke<Record<string, string>>("get_environment");
    return cachedBaseEnv;
  } catch (e) {
    console.error("[PTY Manager] Failed to get environment:", e);
    // Fallback to minimal terminal-compatible env
    return {
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      LANG: "en_US.UTF-8",
    };
  }
}

/**
 * Get the merged environment (base + custom env vars)
 */
async function getEnvironment(): Promise<Record<string, string>> {
  const baseEnv = await getBaseEnvironment();
  const customEnv = getCustomEnvVars();
  // Custom env vars override base env vars
  return { ...baseEnv, ...customEnv };
}

interface ManagedPty {
  pty: IPty;
  disposables: IDisposable[];
  dataCallbacks: Set<(data: string) => void>;
  exitCallbacks: Set<() => void>;
}

// Global PTY storage - survives React component lifecycle
const ptyInstances = new Map<string, ManagedPty>();

/**
 * Normalize PTY data to string
 */
function normalizeData(data: unknown): string {
  if (typeof data === "string") {
    return data;
  } else if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  } else if (Array.isArray(data)) {
    return new TextDecoder().decode(new Uint8Array(data));
  } else if (data && typeof data === "object" && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) {
      return new TextDecoder().decode(new Uint8Array(inner));
    } else if (typeof inner === "string") {
      return inner;
    }
  }
  return String(data);
}

/**
 * Get or create a PTY for a terminal
 */
export async function getOrCreatePty(
  terminalId: string,
  options: {
    cwd?: string;
    command?: string;
    args?: string[];
    onData?: (data: string) => void;
    onExit?: () => void;
  }
): Promise<IPty> {
  const existing = ptyInstances.get(terminalId);

  if (existing) {
    console.log(`[PTY Manager] Reconnecting to existing PTY: ${terminalId}`);

    // Register new callbacks
    if (options.onData) {
      existing.dataCallbacks.add(options.onData);
    }
    if (options.onExit) {
      existing.exitCallbacks.add(options.onExit);
    }

    return existing.pty;
  }

  // Create new PTY
  console.log(`[PTY Manager] Creating new PTY: ${terminalId}`);

  const shellCmd = options.command || "/bin/zsh";
  const shellArgs = options.args || ["-l", "-c", "claude --dangerously-skip-permissions"];

  // Get environment from Rust side (includes TERM, COLORTERM, LANG, and all parent env vars)
  const env = await getEnvironment();

  const pty = ptySpawn(shellCmd, shellArgs, {
    cols: 80,
    rows: 24,
    cwd: options.cwd || undefined,
    env,
  });

  const managed: ManagedPty = {
    pty,
    disposables: [],
    dataCallbacks: new Set(),
    exitCallbacks: new Set(),
  };

  if (options.onData) {
    managed.dataCallbacks.add(options.onData);
  }
  if (options.onExit) {
    managed.exitCallbacks.add(options.onExit);
  }

  // Set up data listener that broadcasts to all registered callbacks
  const dataDisposable = pty.onData((data: unknown) => {
    const text = normalizeData(data);
    for (const callback of managed.dataCallbacks) {
      callback(text);
    }
  });

  // Set up exit listener
  const exitDisposable = pty.onExit(() => {
    console.log(`[PTY Manager] PTY exited: ${terminalId}`);
    for (const callback of managed.exitCallbacks) {
      callback();
    }
    // Clean up on exit
    ptyInstances.delete(terminalId);
  });

  managed.disposables = [dataDisposable, exitDisposable];
  ptyInstances.set(terminalId, managed);

  console.log(`[PTY Manager] PTY created with pid: ${pty.pid}`);
  return pty;
}

/**
 * Write data to a PTY
 */
export function writeToPty(terminalId: string, data: string): boolean {
  const managed = ptyInstances.get(terminalId);
  if (managed) {
    try {
      managed.pty.write(data);
      return true;
    } catch (error) {
      console.error(`[PTY Manager] Write error for ${terminalId}:`, error);
    }
  }
  return false;
}

/**
 * Resize a PTY
 */
export function resizePty(terminalId: string, cols: number, rows: number): boolean {
  const managed = ptyInstances.get(terminalId);
  if (managed) {
    try {
      managed.pty.resize(cols, rows);
      return true;
    } catch (error) {
      console.error(`[PTY Manager] Resize error for ${terminalId}:`, error);
    }
  }
  return false;
}

/**
 * Disconnect a terminal's callbacks (component unmounting)
 * The PTY stays alive for reconnection later
 */
export function disconnectCallbacks(
  terminalId: string,
  onData?: (data: string) => void,
  onExit?: () => void
): void {
  const managed = ptyInstances.get(terminalId);
  if (managed) {
    console.log(`[PTY Manager] Disconnecting callbacks for: ${terminalId}`);
    if (onData) {
      managed.dataCallbacks.delete(onData);
    }
    if (onExit) {
      managed.exitCallbacks.delete(onExit);
    }
  }
}

/**
 * Kill a PTY completely
 */
export function killPty(terminalId: string): void {
  const managed = ptyInstances.get(terminalId);
  if (managed) {
    console.log(`[PTY Manager] Killing PTY: ${terminalId}`);

    // Dispose listeners
    for (const disposable of managed.disposables) {
      disposable.dispose();
    }

    // Kill the process
    try {
      managed.pty.kill();
    } catch (error) {
      console.error(`[PTY Manager] Kill error for ${terminalId}:`, error);
    }

    ptyInstances.delete(terminalId);
  }
}

/**
 * Check if a PTY exists for a terminal
 */
export function hasPty(terminalId: string): boolean {
  return ptyInstances.has(terminalId);
}

/**
 * Get count of active PTYs
 */
export function getActivePtyCount(): number {
  return ptyInstances.size;
}

/**
 * Kill all PTYs (app shutdown)
 */
export function killAllPtys(): void {
  console.log(`[PTY Manager] Killing all ${ptyInstances.size} PTYs`);
  for (const terminalId of ptyInstances.keys()) {
    killPty(terminalId);
  }
}
