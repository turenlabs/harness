import { create } from "zustand";
import { saveEnvVars, loadEnvVars } from "../services/session-service";

interface EnvState {
  envVars: Record<string, string>;
  initialized: boolean;

  // Actions
  setEnvVar: (key: string, value: string) => void;
  removeEnvVar: (key: string) => void;
  loadEnvVars: () => Promise<void>;
  getEnvVars: () => Record<string, string>;
}

// Store subscribers for cache invalidation
const subscribers = new Set<() => void>();

export function subscribeToEnvChanges(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers() {
  for (const callback of subscribers) {
    callback();
  }
}

export const useEnvStore = create<EnvState>((set, get) => ({
  envVars: {},
  initialized: false,

  setEnvVar: (key: string, value: string) => {
    set((state) => {
      const newEnvVars = { ...state.envVars, [key]: value };
      // Persist asynchronously
      saveEnvVars(newEnvVars);
      // Notify subscribers (PTY manager) to invalidate cache
      notifySubscribers();
      return { envVars: newEnvVars };
    });
  },

  removeEnvVar: (key: string) => {
    set((state) => {
      const newEnvVars = { ...state.envVars };
      delete newEnvVars[key];
      // Persist asynchronously
      saveEnvVars(newEnvVars);
      // Notify subscribers (PTY manager) to invalidate cache
      notifySubscribers();
      return { envVars: newEnvVars };
    });
  },

  loadEnvVars: async () => {
    if (get().initialized) return;
    const envVars = await loadEnvVars();
    set({ envVars, initialized: true });
    console.log("Env store initialized with", Object.keys(envVars).length, "vars");
  },

  getEnvVars: () => get().envVars,
}));

/**
 * Get custom env vars for use outside of React components
 */
export function getCustomEnvVars(): Record<string, string> {
  return useEnvStore.getState().envVars;
}
