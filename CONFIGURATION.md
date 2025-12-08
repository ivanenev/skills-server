# Skills Server Configuration Guide

This document details configuration options for the Skills MCP Server, including environment variables, configuration files, and path customization.

## Table of Contents

- [Environment Variables](#environment-variables)
  - [Core Variables](#core-variables)
  - [Lazy-MCP Integration Variables](#lazy-mcp-integration-variables)
  - [Cache Configuration](#cache-configuration)
- [Configuration Files](#configuration-files)
  - [Universal MCP Configuration](#universal-mcp-configuration)
  - [Skills Directory Structure](#skills-directory-structure)
- [Path Customization](#path-customization)
  - [Skills Directory Path](#skills-directory-path)
  - [Lazy-MCP Command Path](#lazy-mcp-command-path)
  - [Platform-Specific Path Examples](#platform-specific-path-examples)
- [MCP Client Configuration](#mcp-client-configuration)
  - [Claude Desktop](#claude-desktop)
  - [VS Code Extensions (Cline)](#vs-code-extensions-cline)
  - [Other MCP Clients](#other-mcp-clients)
- [Advanced Configuration](#advanced-configuration)
  - [Custom Skill Validation](#custom-skill-validation)
  - [Tool Filtering](#tool-filtering)
  - [Cache Tuning](#cache-tuning)

## Environment Variables

The server uses environment variables for runtime configuration. These can be set in your shell, in a `.env` file (if supported), or in your MCP client configuration.

### Core Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SKILLS_DIR` | Path to the directory containing skill subdirectories. | `~/.skills` | `/home/user/.skills` |
| `CACHE_DURATION` | Duration in milliseconds to cache skill metadata. | `5000` (5 seconds) | `10000` |
| `LOG_LEVEL` | Logging verbosity (`error`, `warn`, `info`, `debug`). | `info` | `debug` |

### Lazy-MCP Integration Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LAZY_MCP_ENABLED` | Enable Lazy-MCP Bridge integration. If not set, the server auto-detects by checking if the command exists. | `false` (auto‑detect) | `true` |
| `LAZY_MCP_COMMAND` | Command to run the lazy‑mcp server. Must be an executable script or binary. | `/home/mts/mcp_servers/lazy‑mcp/run‑lazy‑mcp.sh` (Linux‑specific) | `/path/to/lazy‑mcp/run‑lazy‑mcp.sh` |
| `LAZY_MCP_CACHE_DURATION` | Cache duration for lazy‑mcp tool hierarchy (milliseconds). | `300000` (5 minutes) | `600000` |

**Note:** Lazy‑MCP integration is optional but recommended for token savings when accessing large tool sets. The server works perfectly without it.

### Cache Configuration

Caching improves performance by reducing filesystem reads and lazy‑mcp scans.

- **Skill metadata cache**: Controlled by `CACHE_DURATION`. Set to `0` to disable caching (not recommended).
- **Lazy‑mcp tool cache**: Controlled by `LAZY_MCP_CACHE_DURATION`. Increase if tool hierarchy rarely changes.

## Configuration Files

The server does not require a configuration file; all settings are via environment variables. However, you can use a `.env` file if you run the server directly (not through an MCP client). Place a `.env` file in the same directory as the server with key‑value pairs:

```dotenv
SKILLS_DIR=/custom/path/to/skills
LAZY_MCP_ENABLED=true
LAZY_MCP_COMMAND=/usr/local/bin/lazy-mcp
CACHE_DURATION=10000
```

### Universal MCP Configuration

The project includes a `universal_mcp_config.json` file that provides a template for configuring MCP tools across different categories. This file is not used by the skills server directly but can be referenced for setting up lazy‑mcp or other MCP servers.

Example snippet:

```json
{
  "universal_mcp_config": {
    "description": "Universal configuration for all 122 MCP tools",
    "playwright_config": {
      "browser_automation": {
        "enabled": true,
        "browser_type": "chromium",
        "executable_path": "/usr/bin/chromium"
      }
    },
    "tool_categories": {
      "brave-search": { ... },
      "desktop-commander": { ... }
    }
  }
}
```

You can adapt this configuration for your lazy‑mcp `config.json`. See the [lazy‑mcp documentation](https://github.com/voicetreelab/lazy-mcp) for details.

### Skills Directory Structure

The skills directory must follow a specific structure:

```
~/.skills/
├── skill‑name‑1/
│   └── SKILL.md
├── skill‑name‑2/
│   └── SKILL.md
└── ...
```

Each `SKILL.md` file contains YAML frontmatter with metadata and markdown content. For details, refer to [Skills Format in README.md](README.md#skills-format).

## Path Customization

### Skills Directory Path

By default, the server uses `~/.skills`. You can change this by setting `SKILLS_DIR` to an absolute path.

**Examples:**

- Linux/macOS: `/home/alice/my‑skills`
- Windows: `C:\Users\Alice\my‑skills`

The server will create the directory if it does not exist (provided it has write permissions).

### Lazy-MCP Command Path

The default Lazy‑MCP command path is hardcoded to a Linux‑specific location. You **must** set `LAZY_MCP_COMMAND` to the correct path for your system.

**Finding your lazy‑mcp command:**

1. Locate the lazy‑mcp installation directory.
2. Identify the executable script (usually `run‑lazy‑mcp.sh` on Unix, `run‑lazy‑mcp.bat` on Windows).
3. Use the absolute path.

**Examples:**

- Linux: `/home/user/lazy‑mcp/run‑lazy‑mcp.sh`
- macOS: `/usr/local/bin/lazy‑mcp` (if installed via Homebrew)
- Windows: `C:\lazy‑mcp\run‑lazy‑mcp.bat`

### Platform-Specific Path Examples

| Platform | Example SKILLS_DIR | Example LAZY_MCP_COMMAND |
|----------|-------------------|--------------------------|
| Linux | `/home/alice/.skills` | `/home/alice/lazy‑mcp/run‑lazy‑mcp.sh` |
| macOS | `/Users/alice/.skills` | `/usr/local/bin/lazy‑mcp` |
| Windows | `C:\Users\Alice\.skills` | `C:\lazy‑mcp\run‑lazy‑mcp.bat` |

## MCP Client Configuration

To use the skills server with an MCP client, you need to add it to the client’s configuration. The configuration includes the command and environment variables.

### Claude Desktop

Edit `claude_desktop_config.json` (location varies by OS):

```json
{
  "mcpServers": {
    "skills‑server": {
      "command": "skills‑server",
      "env": {
        "SKILLS_DIR": "~/.skills",
        "LAZY_MCP_ENABLED": "true",
        "LAZY_MCP_COMMAND": "/path/to/lazy‑mcp/run‑lazy‑mcp.sh"
      }
    }
  }
}
```

### VS Code Extensions (Cline)

Add to your extension config.json:

```json
{
  "mcpServers": {
    "skills‑server": {
      "command": "skills‑server",
      "env": {
        "SKILLS_DIR": "~/.skills"
      }
    }
  }
}
```

### Other MCP Clients

Refer to your client’s documentation for adding MCP servers. The command is `skills‑server` (if installed globally) or the full path to `build/index.js` for local installations.

Example for a local build:

```json
{
  "mcpServers": {
    "skills‑server": {
      "command": "node",
      "args": ["/path/to/skills‑server/build/index.js"],
      "env": {
        "SKILLS_DIR": "/path/to/your/skills"
      }
    }
  }
}
```

## Advanced Configuration

### Custom Skill Validation

The server validates skill directories and frontmatter. You can extend validation by modifying the source code (`src/index.ts`, function `loadSkills`). Validation rules include:

- Directory name must not contain `..`, `/`, or `\`.
- `SKILL.md` must exist.
- Frontmatter must contain `name` and `description`.

### Tool Filtering

The Lazy‑MCP Bridge filters tool categories to avoid duplicates with VS Code extension internal tools. The filtered categories are defined in `src/index.ts` (lines 261‑265):

```typescript
const universalCategories = [
  'brave‑search', 'playwright', 'puppeteer', 'filesystem',
  'desktop‑commander', 'memory', 'youtube', 'fuse‑optimizer',
  'brave‑search‑marketplace', 'playwright‑marketplace', 'puppeteer‑marketplace', 'whatsapp‑mcp'
];
```

You can modify this array to include or exclude categories based on your MCP server setup.

### Cache Tuning

If you experience stale skill content or tool listings, adjust cache durations:

- **Short cache** (`CACHE_DURATION=1000`): More up‑to‑date but higher filesystem I/O.
- **Long cache** (`CACHE_DURATION=30000`): Better performance but changes may not appear immediately.

Hot reload is still effective within the cache window; the server will detect changes to `SKILL.md` files when the cache expires.

---

For further configuration questions, consult the [README.md](README.md) or open an issue on the [GitHub repository](https://github.com/ivanenev/skills‑server/issues).