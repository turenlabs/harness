import { create } from "zustand";
import type { Terminal, TerminalStatus, TerminalColor, GridLayout, PersistedSession, TerminalGroup, PersistedGroup } from "../types/terminal";
import {
  saveSessions,
  loadSessions,
  saveGroups,
  loadGroups,
} from "../services/session-service";

const DEFAULT_GROUP_ID = "default";
const DEFAULT_GROUP: TerminalGroup = {
  id: DEFAULT_GROUP_ID,
  name: "Default",
  createdAt: new Date(),
};

interface TerminalState {
  terminals: Map<string, Terminal>;
  groups: Map<string, TerminalGroup>;
  activeId: string | null;
  activeGroupId: string | null; // null = show all terminals
  broadcastMode: boolean;
  layout: GridLayout;
  initialized: boolean;

  // Broadcast handlers - set by terminals to receive broadcast input
  broadcastHandlers: Map<string, (data: string) => void>;

  // Terminal actions
  addTerminal: (cwd?: string, groupId?: string) => string;
  removeTerminal: (id: string) => void;
  setActive: (id: string | null) => void;
  updateStatus: (id: string, status: TerminalStatus) => void;
  updateTitle: (id: string, title: string) => void;
  updateColor: (id: string, color: TerminalColor) => void;
  appendOutput: (id: string, data: string) => void;
  setLayout: (cols: number, rows: number) => void;
  setTerminalGroup: (terminalId: string, groupId: string) => void;

  // Group actions
  addGroup: (name: string) => string;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  setActiveGroup: (id: string | null) => void;

  // Broadcast actions
  setBroadcastMode: (enabled: boolean) => void;
  toggleBroadcastMode: () => void;
  registerBroadcastHandler: (terminalId: string, handler: (data: string) => void) => void;
  unregisterBroadcastHandler: (terminalId: string) => void;
  broadcast: (data: string) => void;

  // Persistence
  restoreSessions: () => Promise<void>;
  persistSessions: () => Promise<void>;
  getPersistedSessions: () => PersistedSession[];
  getPersistedGroups: () => PersistedGroup[];

  // Computed helpers
  getTerminalsInGroup: (groupId: string | null) => Terminal[];
  getVisibleTerminals: () => Terminal[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function calculateLayout(count: number): GridLayout {
  if (count === 0) return { cols: 1, rows: 1 };
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 };
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  groups: new Map([[DEFAULT_GROUP_ID, DEFAULT_GROUP]]),
  activeId: null,
  activeGroupId: null, // null = show all
  broadcastMode: false,
  layout: { cols: 1, rows: 1 },
  initialized: false,
  broadcastHandlers: new Map(),

  addTerminal: (cwd?: string, groupId?: string) => {
    const id = generateId();
    const folderName = cwd ? cwd.split("/").pop() || cwd : undefined;
    const effectiveGroupId = groupId || get().activeGroupId || DEFAULT_GROUP_ID;

    const terminal: Terminal = {
      id,
      status: "starting",
      title: folderName || `Terminal ${get().terminals.size + 1}`,
      color: "default",
      cwd,
      createdAt: new Date(),
      outputHistory: [],
      groupId: effectiveGroupId,
    };

    set((state) => {
      const newTerminals = new Map(state.terminals);
      newTerminals.set(id, terminal);
      const visibleCount = state.activeGroupId === null
        ? newTerminals.size
        : Array.from(newTerminals.values()).filter(t => t.groupId === state.activeGroupId).length;
      const layout = calculateLayout(visibleCount);
      return {
        terminals: newTerminals,
        activeId: id,
        layout,
      };
    });

    setTimeout(() => get().persistSessions(), 100);
    return id;
  },

  removeTerminal: (id: string) => {
    set((state) => {
      const newTerminals = new Map(state.terminals);
      newTerminals.delete(id);
      const visibleCount = state.activeGroupId === null
        ? newTerminals.size
        : Array.from(newTerminals.values()).filter(t => t.groupId === state.activeGroupId).length;
      const layout = calculateLayout(visibleCount);

      let newActiveId = state.activeId;
      if (state.activeId === id) {
        const remaining = Array.from(newTerminals.keys());
        newActiveId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
      }

      return {
        terminals: newTerminals,
        activeId: newActiveId,
        layout,
      };
    });

    get().persistSessions();
  },

  setActive: (id: string | null) => {
    set({ activeId: id });
  },

  updateStatus: (id: string, status: TerminalStatus) => {
    set((state) => {
      const terminal = state.terminals.get(id);
      if (!terminal) return state;

      const newTerminals = new Map(state.terminals);
      newTerminals.set(id, { ...terminal, status });
      return { terminals: newTerminals };
    });
  },

  updateTitle: (id: string, title: string) => {
    set((state) => {
      const terminal = state.terminals.get(id);
      if (!terminal) return state;

      const newTerminals = new Map(state.terminals);
      newTerminals.set(id, { ...terminal, title });
      return { terminals: newTerminals };
    });

    get().persistSessions();
  },

  updateColor: (id: string, color: TerminalColor) => {
    set((state) => {
      const terminal = state.terminals.get(id);
      if (!terminal) return state;

      const newTerminals = new Map(state.terminals);
      newTerminals.set(id, { ...terminal, color });
      return { terminals: newTerminals };
    });

    get().persistSessions();
  },

  setTerminalGroup: (terminalId: string, groupId: string) => {
    set((state) => {
      const terminal = state.terminals.get(terminalId);
      if (!terminal) return state;

      const newTerminals = new Map(state.terminals);
      newTerminals.set(terminalId, { ...terminal, groupId });

      // Recalculate layout for visible terminals
      const visibleCount = state.activeGroupId === null
        ? newTerminals.size
        : Array.from(newTerminals.values()).filter(t => t.groupId === state.activeGroupId).length;
      const layout = calculateLayout(visibleCount);

      return { terminals: newTerminals, layout };
    });

    get().persistSessions();
  },

  appendOutput: (id: string, data: string) => {
    set((state) => {
      const terminal = state.terminals.get(id);
      if (!terminal) return state;

      const newTerminals = new Map(state.terminals);
      const newHistory = [...terminal.outputHistory, data];
      if (newHistory.length > 10000) {
        newHistory.splice(0, newHistory.length - 10000);
      }
      newTerminals.set(id, { ...terminal, outputHistory: newHistory });
      return { terminals: newTerminals };
    });
  },

  setLayout: (cols: number, rows: number) => {
    set({ layout: { cols, rows } });
  },

  // Group actions
  addGroup: (name: string) => {
    const id = generateId();
    const group: TerminalGroup = {
      id,
      name,
      createdAt: new Date(),
    };

    set((state) => {
      const newGroups = new Map(state.groups);
      newGroups.set(id, group);
      return { groups: newGroups };
    });

    get().persistSessions();
    return id;
  },

  removeGroup: (id: string) => {
    if (id === DEFAULT_GROUP_ID) return; // Can't remove default group

    set((state) => {
      const newGroups = new Map(state.groups);
      newGroups.delete(id);

      // Move terminals from deleted group to default
      const newTerminals = new Map(state.terminals);
      for (const [terminalId, terminal] of newTerminals) {
        if (terminal.groupId === id) {
          newTerminals.set(terminalId, { ...terminal, groupId: DEFAULT_GROUP_ID });
        }
      }

      // If active group was deleted, switch to all
      const newActiveGroupId = state.activeGroupId === id ? null : state.activeGroupId;

      const visibleCount = newActiveGroupId === null
        ? newTerminals.size
        : Array.from(newTerminals.values()).filter(t => t.groupId === newActiveGroupId).length;
      const layout = calculateLayout(visibleCount);

      return {
        groups: newGroups,
        terminals: newTerminals,
        activeGroupId: newActiveGroupId,
        layout,
      };
    });

    get().persistSessions();
  },

  renameGroup: (id: string, name: string) => {
    set((state) => {
      const group = state.groups.get(id);
      if (!group) return state;

      const newGroups = new Map(state.groups);
      newGroups.set(id, { ...group, name });
      return { groups: newGroups };
    });

    get().persistSessions();
  },

  setActiveGroup: (id: string | null) => {
    set((state) => {
      const visibleTerminals = id === null
        ? Array.from(state.terminals.values())
        : Array.from(state.terminals.values()).filter(t => t.groupId === id);
      const layout = calculateLayout(visibleTerminals.length);

      return { activeGroupId: id, layout };
    });
  },

  // Broadcast actions
  setBroadcastMode: (enabled: boolean) => {
    set({ broadcastMode: enabled });
  },

  toggleBroadcastMode: () => {
    set((state) => ({ broadcastMode: !state.broadcastMode }));
  },

  registerBroadcastHandler: (terminalId: string, handler: (data: string) => void) => {
    set((state) => {
      const newHandlers = new Map(state.broadcastHandlers);
      newHandlers.set(terminalId, handler);
      return { broadcastHandlers: newHandlers };
    });
  },

  unregisterBroadcastHandler: (terminalId: string) => {
    set((state) => {
      const newHandlers = new Map(state.broadcastHandlers);
      newHandlers.delete(terminalId);
      return { broadcastHandlers: newHandlers };
    });
  },

  broadcast: (data: string) => {
    const state = get();
    const visibleTerminals = state.getVisibleTerminals();

    for (const terminal of visibleTerminals) {
      const handler = state.broadcastHandlers.get(terminal.id);
      if (handler) {
        handler(data);
      }
    }
  },

  // Computed helpers
  getTerminalsInGroup: (groupId: string | null) => {
    const terminals = Array.from(get().terminals.values());
    if (groupId === null) return terminals;
    return terminals.filter(t => t.groupId === groupId);
  },

  getVisibleTerminals: () => {
    return get().getTerminalsInGroup(get().activeGroupId);
  },

  getPersistedSessions: () => {
    const terminals = get().terminals;
    const sessions: PersistedSession[] = [];

    for (const [, terminal] of terminals) {
      sessions.push({
        id: terminal.id,
        title: terminal.title,
        color: terminal.color,
        cwd: terminal.cwd,
        createdAt: terminal.createdAt.toISOString(),
        groupId: terminal.groupId,
      });
    }

    return sessions;
  },

  getPersistedGroups: () => {
    const groups = get().groups;
    const persistedGroups: PersistedGroup[] = [];

    for (const [, group] of groups) {
      persistedGroups.push({
        id: group.id,
        name: group.name,
        createdAt: group.createdAt.toISOString(),
      });
    }

    return persistedGroups;
  },

  persistSessions: async () => {
    const sessions = get().getPersistedSessions();
    const groups = get().getPersistedGroups();
    await saveSessions(sessions);
    await saveGroups(groups);
  },

  restoreSessions: async () => {
    if (get().initialized) return;

    console.log("Restoring sessions...");

    // Load persisted groups
    const persistedGroups = await loadGroups();
    console.log("Persisted groups:", persistedGroups);

    // Restore groups
    const groupsMap = new Map<string, TerminalGroup>([[DEFAULT_GROUP_ID, DEFAULT_GROUP]]);
    for (const pg of persistedGroups) {
      if (pg.id !== DEFAULT_GROUP_ID) {
        groupsMap.set(pg.id, {
          id: pg.id,
          name: pg.name,
          createdAt: new Date(pg.createdAt),
        });
      }
    }

    // Load persisted session metadata (for reference, but PTY sessions don't persist across app restarts)
    const persistedSessions = await loadSessions();
    console.log("Persisted sessions (metadata only):", persistedSessions);

    // Note: PTY processes don't persist across app restarts
    // Sessions are stored for metadata (title, color, group) but terminals need to be recreated
    // The persisted sessions can be used if we want to show "recent sessions" or restore metadata

    set({ groups: groupsMap, initialized: true });

    console.log("Session restore complete");
  },
}));
