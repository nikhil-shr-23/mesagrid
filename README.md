# MesaGrid

> A lightweight, secure, cross-platform database GUI built with Tauri (Rust + Web UI).

**Fast. Native. Secure. No Chromium tax.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

---

## Why MesaGrid?

Most database GUIs ship a full Chromium browser just to render tables. **MesaGrid doesn't.**

|               | MesaGrid    | Electron Apps |
| ------------- | ----------- | ------------- |
| ⚡ Startup    | Instant     | 2-5 seconds   |
| 🧠 Memory     | ~50MB       | 200-500MB     |
| � Binary Size | ~15MB       | 150MB+        |
| 🔐 Security   | OS Keychain | Varies        |

---

## Features

### 🔌 Database Connections

**Supported:**

- PostgreSQL
- MySQL

**Planned:**

- SQLite
- MongoDB (optional)

**Capabilities:**

- Save multiple connections
- TLS / SSL support
- Encrypted credentials (OS keychain)
- SSH tunneling (Phase 2)

> 🔒 Passwords are **never** stored in plain text.

---

### ✏️ Query Editor

- SQL editor with syntax highlighting (Monaco)
- Multiple query tabs
- Run selection / run full query
- Query history
- Execution time display

**Coming Soon:**

- `EXPLAIN` plan visualization
- SQL auto-format
- Schema-aware autocomplete

---

### 📊 Table Viewer

- Browse tables and views
- Paginated rows (cursor-based)
- Inline cell editing
- Add / delete rows
- Column metadata panel

> ⚠️ **Critical Design Rule:** MesaGrid never loads entire tables into memory.

---

### 📋 Result Grid

- Sort columns
- Copy rows as JSON
- Export CSV / JSON
- Execution time per query

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MesaGrid App                         │
├──────────────────────┬──────────────────────────────────┤
│   Frontend (React)   │        Backend (Rust)            │
│                      │                                  │
│  • Monaco Editor     │  • Connection pooling (sqlx)     │
│  • TanStack Table    │  • Query execution               │
│  • Tailwind + shadcn │  • OS Keychain integration       │
│  • Zustand state     │  • Result streaming              │
│                      │                                  │
│        IPC ◄─────────┼───────────► Databases            │
└──────────────────────┴──────────────────────────────────┘
```

### IPC Contract

Frontend talks to Rust only via IPC:

```typescript
// Request
execute_query({
  connection_id: "uuid",
  sql: "SELECT * FROM users",
  limit: 100,
  offset: 0
})

// Response
{
  "columns": [...],
  "rows": [...],
  "executionTimeMs": 32
}
```

> 🔒 Raw database drivers are never exposed to the frontend.

---

## Security

### Credential Storage

Passwords are stored securely using OS facilities:

| Platform | Storage          |
| -------- | ---------------- |
| macOS    | Keychain         |
| Windows  | Credential Vault |
| Linux    | Secret Service   |

Only connection IDs are stored in config files.

### Query Safety

- ⚠️ Warns on `DROP`, `TRUNCATE`
- 🔐 Read-only mode toggle
- ✅ Confirmation dialogs for destructive queries

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/) or Node.js
- PostgreSQL or MySQL instance for testing

### Development

```bash
# Clone the repo
git clone https://github.com/nikhil-shr-23/mesagrid.git
cd mesagrid

# Install dependencies
bun install

# Run in development mode
bun run tauri dev
```

### Build for Production

```bash
bun run tauri build
```

**Output:**

- macOS → `.dmg` (notarized)
- Windows → `.msi`
- Linux → `.AppImage`

---

## Roadmap

- [x] **Phase 1** - App shell, connection manager, query editor
- [ ] **Phase 2** - Table viewer, cursor pagination, inline editing
- [ ] **Phase 3** - SSH tunneling, SQLite, import/export
- [ ] **Phase 4** - MongoDB, auto-updates, plugin system

---

## Tech Stack

| Layer       | Technology                      |
| ----------- | ------------------------------- |
| Framework   | [Tauri 2.0](https://tauri.app/) |
| Frontend    | React 19, Vite, TypeScript      |
| Styling     | Tailwind CSS v4, shadcn/ui      |
| Editor      | Monaco Editor                   |
| Data Grid   | TanStack Table                  |
| State       | Zustand                         |
| Backend     | Rust, sqlx, tokio               |
| Credentials | keyring (OS keychain)           |

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

---

## License

MIT © MesaGrid
