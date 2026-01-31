import { useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { TerminalGrid } from "./components/TerminalGrid";
import { GroupTabs } from "./components/GroupTabs";
import { useTerminalStore } from "./stores/terminal-store";
import { useEnvStore } from "./stores/env-store";

function App() {
  const { terminals, addTerminal, restoreSessions, persistSessions, initialized, getVisibleTerminals, toggleBroadcastMode } =
    useTerminalStore();
  const { loadEnvVars: loadEnv } = useEnvStore();
  const visibleTerminals = getVisibleTerminals();

  // Restore sessions and env vars on startup
  useEffect(() => {
    restoreSessions();
    loadEnv();
  }, [restoreSessions, loadEnv]);

  // Persist sessions before app closes
  // Note: Sessions are already persisted on every change (addTerminal, updateTitle, etc.)
  // This is just a safety backup - beforeunload can't reliably await async operations
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Fire and forget - sessions should already be persisted from earlier changes
      persistSessions();
    };

    // Also persist when the window loses visibility (e.g., switching tabs, minimizing)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistSessions();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persistSessions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+T or Ctrl+T to create new terminal
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        addTerminal();
      }
      // Cmd+B or Ctrl+B to toggle broadcast mode
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleBroadcastMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addTerminal, toggleBroadcastMode]);

  // Show loading state while restoring sessions
  if (!initialized) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <TopBar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Restoring sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TopBar />
      <GroupTabs />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {visibleTerminals.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                {terminals.size === 0 ? (
                  <>
                    <p className="text-lg mb-2">No terminals running</p>
                    <p className="text-sm">
                      Press <kbd className="px-2 py-1 bg-secondary rounded text-xs">Cmd+T</kbd> or click "New Terminal" to start
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg mb-2">No terminals in this group</p>
                    <p className="text-sm">
                      Switch groups or create a new terminal
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <TerminalGrid />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
