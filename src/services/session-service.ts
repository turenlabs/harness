import { mkdir, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";
import type { PersistedSession, PersistedGroup } from "../types/terminal";

const CONFIG_DIR = ".config/harness";
const SESSIONS_FILE = "sessions.json";
const GROUPS_FILE = "groups.json";
const ENV_FILE = "env.json";

/**
 * Get the config directory path
 */
async function getConfigPath(): Promise<string> {
  const home = await homeDir();
  return `${home}/${CONFIG_DIR}`;
}

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    const configPath = await getConfigPath();
    const dirExists = await exists(configPath);
    if (!dirExists) {
      // Create .config first if needed
      const home = await homeDir();
      const dotConfigPath = `${home}/.config`;
      const dotConfigExists = await exists(dotConfigPath);
      if (!dotConfigExists) {
        await mkdir(dotConfigPath);
      }
      await mkdir(configPath);
    }
  } catch (err) {
    console.error("Failed to create config directory:", err);
  }
}

/**
 * Save sessions to disk
 */
export async function saveSessions(sessions: PersistedSession[]): Promise<void> {
  try {
    await ensureConfigDir();
    const configPath = await getConfigPath();
    const filePath = `${configPath}/${SESSIONS_FILE}`;
    const data = JSON.stringify(sessions, null, 2);
    await writeTextFile(filePath, data);
    console.log("Sessions saved:", sessions.length);
  } catch (err) {
    console.error("Failed to save sessions:", err);
  }
}

/**
 * Load sessions from disk
 */
export async function loadSessions(): Promise<PersistedSession[]> {
  try {
    const configPath = await getConfigPath();
    const filePath = `${configPath}/${SESSIONS_FILE}`;
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return [];
    }
    const data = await readTextFile(filePath);
    const sessions = JSON.parse(data) as PersistedSession[];
    console.log("Sessions loaded:", sessions.length);
    return sessions;
  } catch (err) {
    console.error("Failed to load sessions:", err);
    return [];
  }
}

/**
 * Find a persisted session by ID
 */
export function findPersistedSession(
  sessions: PersistedSession[],
  id: string
): PersistedSession | undefined {
  return sessions.find((s) => s.id === id);
}

/**
 * Save groups to disk
 */
export async function saveGroups(groups: PersistedGroup[]): Promise<void> {
  try {
    await ensureConfigDir();
    const configPath = await getConfigPath();
    const filePath = `${configPath}/${GROUPS_FILE}`;
    const data = JSON.stringify(groups, null, 2);
    await writeTextFile(filePath, data);
    console.log("Groups saved:", groups.length);
  } catch (err) {
    console.error("Failed to save groups:", err);
  }
}

/**
 * Load groups from disk
 */
export async function loadGroups(): Promise<PersistedGroup[]> {
  try {
    const configPath = await getConfigPath();
    const filePath = `${configPath}/${GROUPS_FILE}`;
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return [];
    }
    const data = await readTextFile(filePath);
    const groups = JSON.parse(data) as PersistedGroup[];
    console.log("Groups loaded:", groups.length);
    return groups;
  } catch (err) {
    console.error("Failed to load groups:", err);
    return [];
  }
}

/**
 * Save environment variables to disk
 */
export async function saveEnvVars(envVars: Record<string, string>): Promise<void> {
  try {
    await ensureConfigDir();
    const configPath = await getConfigPath();
    const filePath = `${configPath}/${ENV_FILE}`;
    const data = JSON.stringify(envVars, null, 2);
    await writeTextFile(filePath, data);
    console.log("Env vars saved:", Object.keys(envVars).length);
  } catch (err) {
    console.error("Failed to save env vars:", err);
  }
}

/**
 * Load environment variables from disk
 */
export async function loadEnvVars(): Promise<Record<string, string>> {
  try {
    const configPath = await getConfigPath();
    const filePath = `${configPath}/${ENV_FILE}`;
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return {};
    }
    const data = await readTextFile(filePath);
    const envVars = JSON.parse(data) as Record<string, string>;
    console.log("Env vars loaded:", Object.keys(envVars).length);
    return envVars;
  } catch (err) {
    console.error("Failed to load env vars:", err);
    return {};
  }
}
