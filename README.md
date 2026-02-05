# Claude Code Harness

<img width="1398" height="898" alt="image" src="https://github.com/user-attachments/assets/48a02c81-0d34-44bf-a528-63c3bbb4b204" />

A Tauri 2.0 desktop application for managing multiple Claude Code terminal instances simultaneously.

## Features

- **Multi-Terminal Management**: Spawn unlimited Claude Code instances
- **Auto-Start**: Terminals automatically run `claude --dangerously-skip-permissions`
- **Dynamic Grid Layout**: Automatically adjusts grid based on terminal count
- **Broadcast Mode**: Send input to all terminals simultaneously
- **Terminal Groups**: Organize terminals into logical groups
- **Environment Variables UI**: Configure custom env vars passed to all terminals
- **Real-Time Status**: Visual indicators for terminal state
- **Session Persistence**: Terminal metadata persists across restarts
- **Professional UI**: Dark blue theme with shadcn-style components

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Tauri 2.0 |
| Frontend | React 19 + TypeScript + Vite 6 |
| Terminal | xterm.js (WebGL renderer) |
| PTY | tauri-plugin-pty (portable-pty) |
| Styling | Tailwind CSS v4 |
| State | Zustand v5 |
| Icons | Lucide React |

## Quick Start

```bash
# Clone and setup
git clone https://github.com/turenlabs/harness.git
cd harness
make setup

# Run in development mode
make dev

# Build distributable DMG
make dmg
```

## Build Commands

```bash
make help     # Show all available commands
make setup    # First-time setup (installs dependencies + Rust targets)
make dev      # Development with hot reload
make build    # Build for current architecture
make dmg      # Build universal DMG for distribution
make check    # Check TypeScript and Rust compilation
make clean    # Clean build artifacts
```

## Keyboard Shortcuts

- `Cmd+T` - Create new terminal
- `Cmd+B` - Toggle broadcast mode

## Requirements

- macOS 10.15+ (Catalina or later)
- Node.js 18+
- Rust 1.70+
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)

## Architecture

```
React Frontend (xterm.js terminals)
         |
    Zustand Store (state management)
         |
    Tauri IPC
         |
    Rust Backend (tauri-plugin-pty)
         |
    Claude Code Process
```

## License

MIT

---

Built by [Turen Labs](https://github.com/turenlabs)
