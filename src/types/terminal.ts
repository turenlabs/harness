export type TerminalStatus = "starting" | "running" | "idle" | "error";

export type TerminalColor = "default" | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "pink";

export interface Terminal {
  id: string;
  status: TerminalStatus;
  title: string;
  color: TerminalColor;
  cwd?: string;
  createdAt: Date;
  outputHistory: string[];
  groupId: string; // Group this terminal belongs to
}

export interface TerminalGroup {
  id: string;
  name: string;
  createdAt: Date;
}

// Persisted session data saved to disk
export interface PersistedSession {
  id: string;
  title: string;
  color: TerminalColor;
  cwd?: string;
  createdAt: string;
  groupId?: string;
}

export interface PersistedGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface GridLayout {
  cols: number;
  rows: number;
}
