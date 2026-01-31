# Claude Code Harness

A professional Tauri 2.0 desktop application for managing multiple Claude Code terminal instances simultaneously.

## Overview

Claude Code Harness allows you to spawn and manage multiple Claude Code sessions in a grid layout, perfect for parallel development workflows, comparing approaches, or running multiple agents on different tasks.

## Features

- **Multi-Terminal Management**: Spawn unlimited Claude Code instances
- **Auto-Start**: Terminals automatically run `claude --dangerously-skip-permissions`
- **Dynamic Grid Layout**: Automatically adjusts grid based on terminal count
  - 1 terminal: Full screen
  - 2 terminals: 1x2
  - 3-4 terminals: 2x2
  - 5-6 terminals: 3x2
  - 7-9 terminals: 3x3
- **Real-Time Status**: Visual indicators for terminal state (starting, running, idle, error)
- **Output History**: Full output buffer stored for each terminal
- **Professional UI**: Dark blue theme with shadcn-style components
- **Keyboard Shortcuts**: Cmd+T to create new terminal
- **Claude Max Session**: Inherits authentication from parent shell

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

## Project Structure

```
harness/
├── Makefile                  # Build commands
├── package.json              # Node dependencies
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── index.html                # Entry HTML
├── public/
│   └── vite.svg              # App icon source
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main application component
│   ├── index.css             # Tailwind + dark blue theme variables
│   ├── lib/
│   │   └── utils.ts          # Utility functions (cn helper)
│   ├── types/
│   │   └── terminal.ts       # TypeScript interfaces
│   ├── stores/
│   │   └── terminal-store.ts # Zustand state management
│   ├── hooks/
│   │   ├── use-pty.ts        # PTY communication hook
│   │   └── use-terminal.ts   # xterm.js integration hook
│   └── components/
│       ├── Terminal.tsx      # Individual terminal component
│       ├── TerminalGrid.tsx  # Grid layout manager
│       ├── TerminalHeader.tsx# Terminal title bar
│       ├── Sidebar.tsx       # Terminal list sidebar
│       ├── TopBar.tsx        # Application header
│       └── ui/               # Reusable UI components
│           ├── button.tsx
│           ├── card.tsx
│           ├── badge.tsx
│           ├── input.tsx
│           └── scroll-area.tsx
└── src-tauri/
    ├── Cargo.toml            # Rust dependencies
    ├── tauri.conf.json       # Tauri configuration
    ├── build.rs              # Build script
    ├── capabilities/
    │   └── default.json      # PTY permissions
    ├── icons/                # Generated app icons
    └── src/
        ├── main.rs           # Application entry point
        └── lib.rs            # Plugin initialization
```

## Build Commands

Use the Makefile for common operations:

```bash
# Show all available commands
make help

# First-time setup (installs dependencies + Rust targets)
make setup

# Development with hot reload
make dev

# Build for current architecture
make build

# Build universal DMG for distribution (Intel + Apple Silicon)
make dmg

# Check TypeScript and Rust compilation
make check

# Clean build artifacts
make clean
```

## Quick Start

```bash
# Clone and setup
cd harness
make setup

# Run in development mode
make dev

# Build distributable DMG
make dmg
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Terminal 1 │  │  Terminal 2 │  │  Terminal N │     │
│  │  (xterm.js) │  │  (xterm.js) │  │  (xterm.js) │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│              ┌───────────▼───────────┐                 │
│              │   Terminal Manager    │                 │
│              │   (Zustand Store)     │                 │
│              └───────────┬───────────┘                 │
└──────────────────────────┼──────────────────────────────┘
                           │ Tauri IPC
┌──────────────────────────┼──────────────────────────────┐
│                  Rust Backend                           │
│              ┌───────────▼───────────┐                 │
│              │   tauri-plugin-pty    │                 │
│              │   (PTY Management)    │                 │
│              └───────────┬───────────┘                 │
│                          │                              │
│              ┌───────────▼───────────┐                 │
│              │   Claude Code Process │                 │
│              │   --dangerously-skip  │                 │
│              │   -permissions        │                 │
│              └───────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## Terminal Store API

The Zustand store manages all terminal state:

```typescript
interface TerminalState {
  terminals: Map<string, Terminal>;
  activeId: string | null;
  layout: { cols: number; rows: number };

  addTerminal: () => string;      // Creates and auto-spawns Claude
  removeTerminal: (id: string) => void;
  setActive: (id: string | null) => void;
  updateStatus: (id: string, status: TerminalStatus) => void;
  appendOutput: (id: string, data: string) => void;
}
```

## Theme Customization

The dark blue theme is defined in `src/index.css` using CSS custom properties:

```css
@theme {
  --color-background: oklch(15% 0.03 240);    /* Deep blue-black */
  --color-foreground: oklch(95% 0.01 240);
  --color-primary: oklch(65% 0.2 240);        /* Bright blue */
  --color-secondary: oklch(25% 0.05 240);
  /* ... */
}
```

## Claude Max Authentication

The app inherits environment variables from your shell, including:
- `ANTHROPIC_API_KEY`
- `CLAUDE_CODE_*` variables
- Claude's session tokens from `~/.claude/`

All spawned terminals share your Claude Max subscription automatically.

## Requirements

- macOS 10.15+ (Catalina or later)
- Node.js 18+
- Rust 1.70+
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)

## Development Notes

- The app uses xterm.js with WebGL rendering for optimal performance
- PTY communication is handled via `tauri-plugin-pty` using portable-pty
- Terminal resize events are automatically propagated to the PTY
- Output history is capped at 10,000 entries per terminal to prevent memory issues

## License

MIT
