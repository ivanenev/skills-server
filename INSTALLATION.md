# Enhanced Skills Server Installation Guide

This guide provides comprehensive installation instructions for the Enhanced Skills MCP Server across different platforms (Windows, macOS, Linux). It addresses platform-specific considerations, configuration, and troubleshooting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Global Installation (Recommended)](#global-installation-recommended)
  - [Local Installation (Development)](#local-installation-development)
- [Platform-Specific Instructions](#platform-specific-instructions)
  - [Linux](#linux)
  - [macOS](#macos)
  - [Windows](#windows)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Skills Directory Setup](#skills-directory-setup)
  - [MCP Client Configuration](#mcp-client-configuration)
- [Lazy-MCP Integration](#lazy-mcp-integration)
  - [Installing Lazy-MCP](#installing-lazy-mcp)
  - [Platform-Specific Lazy-MCP Setup](#platform-specific-lazy-mcp-setup)
- [Testing the Installation](#testing-the-installation)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Platform-Specific Troubleshooting](#platform-specific-troubleshooting)
- [Updating](#updating)

## Prerequisites

Before installing the Enhanced Skills Server, ensure you have the following:

- **Node.js 18+** – Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (for cloning repositories)
- **Python 3.8+** (optional, required for Lazy-MCP integration)
- **pip** (Python package manager)

Verify your installation:

```bash
node --version
npm --version
git --version
python3 --version
```

## Installation Methods

### Global Installation (Recommended)

Install the server globally via npm to make the `skills-server` command available system-wide:

```bash
npm install -g @skills-server/mcp
```

After installation, verify:

```bash
skills-server --version
```

If the command is not found, ensure your npm global bin directory is in your PATH.

### Local Installation (Development)

For development or custom modifications, clone the repository and install dependencies:

```bash
git clone https://github.com/ivanenev/skills-server.git
cd skills-server
npm install
npm run build
```

This creates the built server in `build/index.js`. You can run it directly:

```bash
node build/index.js
```

## Platform-Specific Instructions

### Linux

#### Dependencies
- Most Linux distributions come with Node.js and npm available via package managers.
- For Debian/Ubuntu:
  ```bash
  sudo apt update
  sudo apt install nodejs npm git python3 python3-pip
  ```
- For Fedora/RHEL:
  ```bash
  sudo dnf install nodejs npm git python3 python3-pip
  ```

#### Path Considerations
- The default skills directory is `~/.skills` (expands to `/home/username/.skills`).
- The default Lazy-MCP command path is hardcoded to `/home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh`. You must set the `LAZY_MCP_COMMAND` environment variable to point to your lazy-mcp installation.

#### Permissions
Ensure you have execute permissions for the built server:
```bash
chmod +x build/index.js
```

### macOS

#### Dependencies
- Install Node.js via [Homebrew](https://brew.sh/):
  ```bash
  brew install node git python3
  ```
- Alternatively, download the Node.js installer from the official website.

#### Path Considerations
- The default skills directory is `~/.skills` (expands to `/Users/username/.skills`).
- The hardcoded Lazy-MCP path will not work; you must set `LAZY_MCP_COMMAND` to the correct path (e.g., `/usr/local/bin/lazy-mcp` or a custom location).

#### Homebrew Installation of Lazy-MCP
If lazy-mcp is available via Homebrew, you can install it:
```bash
brew tap voicetreelab/lazy-mcp
brew install lazy-mcp
```

### Windows

#### Dependencies
- Download and install Node.js from [nodejs.org](https://nodejs.org/) (choose the LTS version).
- Install Git for Windows from [git-scm.com](https://git-scm.com/).
- Install Python 3.8+ from [python.org](https://python.org/) and ensure it's added to PATH.

#### Path Handling
- Windows uses backslashes in paths. The server uses Node.js `path` module which handles cross-platform paths, but environment variables may need Windows-style paths.
- The default skills directory is `%USERPROFILE%\.skills` (C:\Users\Username\.skills).
- The hardcoded Lazy-MCP path is Linux-specific and will not work. You must set `LAZY_MCP_COMMAND` to the Windows path of your lazy-mcp executable (e.g., `C:\lazy-mcp\run-lazy-mcp.bat`).

#### Shell Script Alternatives
- The default Lazy-MCP command expects a shell script (`run-lazy-mcp.sh`). On Windows, you may need to create a batch file or use Python directly.
- Example batch file `run-lazy-mcp.bat`:
  ```batch
  @echo off
  python C:\path\to\lazy-mcp\src\main.py
  ```

#### Permissions
- Ensure Node.js has read/write access to the skills directory.
- If you encounter permission errors, run your terminal as Administrator or adjust folder permissions.

## Configuration

### Environment Variables

The server can be configured via the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SKILLS_DIR` | Path to skills directory | `~/.skills` |
| `LAZY_MCP_ENABLED` | Enable Lazy-MCP Bridge integration | `false` (auto-detects if command exists) |
| `LAZY_MCP_COMMAND` | Command to run lazy-mcp server | `/home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh` (Linux-specific) |
| `CACHE_DURATION` | Skill cache duration in milliseconds | `5000` |

Set environment variables before running the server:

**Linux/macOS:**
```bash
export SKILLS_DIR="/path/to/your/skills"
export LAZY_MCP_COMMAND="/path/to/lazy-mcp/run-lazy-mcp.sh"
export LAZY_MCP_ENABLED=true
skills-server
```

**Windows (Command Prompt):**
```cmd
set SKILLS_DIR=C:\path\to\your\skills
set LAZY_MCP_COMMAND=C:\lazy-mcp\run-lazy-mcp.bat
set LAZY_MCP_ENABLED=true
skills-server
```

**Windows (PowerShell):**
```powershell
$env:SKILLS_DIR = "C:\path\to\your\skills"
$env:LAZY_MCP_COMMAND = "C:\lazy-mcp\run-lazy-mcp.bat"
$env:LAZY_MCP_ENABLED = "true"
skills-server
```

### Skills Directory Setup

The server automatically creates the skills directory if it doesn't exist. However, you can manually create it and populate it with skills.

1. Create the directory:
   ```bash
   mkdir -p ~/.skills
   ```
2. Add a skill by creating a subdirectory with a `SKILL.md` file:
   ```bash
   mkdir -p ~/.skills/my-skill
   echo '---
   name: my-skill
   description: A sample skill
   ---
   # My Skill Content
   This is a sample skill.' > ~/.skills/my-skill/SKILL.md
   ```

For more details on skill format, see the [README.md](README.md#skills-format).

### MCP Client Configuration

To use the server with an MCP client (e.g., Claude Desktop, Cline), add it to your client configuration.

#### Claude Desktop
Edit `claude_desktop_config.json` (location varies by OS):

```json
{
  "mcpServers": {
    "skills-server": {
      "command": "skills-server",
      "env": {
        "SKILLS_DIR": "~/.skills",
        "LAZY_MCP_ENABLED": "true"
      }
    }
  }
}
```

#### VS Code Extensions (Cline)
Add to your extension config.json:

```json
{
  "mcpServers": {
    "skills-server": {
      "command": "skills-server",
      "env": {
        "SKILLS_DIR": "~/.skills"
      }
    }
  }
}
```

#### Other MCP Clients
Refer to your client's documentation for adding MCP servers. Use the `skills-server` command with appropriate environment variables.

## Lazy-MCP Integration

The Enhanced Skills Server includes a bridge to [lazy-mcp](https://github.com/voicetreelab/lazy-mcp), a hierarchical tool system. This integration provides progressive disclosure of tools, significantly reducing token usage.

### Installing Lazy-MCP

1. Clone the lazy-mcp repository:
   ```bash
   git clone https://github.com/voicetreelab/lazy-mcp.git
   cd lazy-mcp
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Make the run script executable (Linux/macOS):
   ```bash
   chmod +x run-lazy-mcp.sh
   ```
4. Configure lazy-mcp by editing `config.json` to point to your MCP servers.

### Platform-Specific Lazy-MCP Setup

#### Linux/macOS
- The default script `run-lazy-mcp.sh` should work if Python is in PATH.
- Set `LAZY_MCP_COMMAND` to the absolute path of `run-lazy-mcp.sh`.

#### Windows
- Create a batch file `run-lazy-mcp.bat` that calls Python with the lazy-mcp main script.
- Example content:
  ```batch
  @echo off
  python C:\path\to\lazy-mcp\src\main.py
  ```
- Set `LAZY_MCP_COMMAND` to the full path of this batch file.

### Enabling the Bridge

Set `LAZY_MCP_ENABLED=true` or ensure the lazy-mcp command exists at the path specified by `LAZY_MCP_COMMAND`. The server will automatically detect and connect to lazy-mcp.

## Testing the Installation

After installation, verify that the server works correctly.

1. **Test the server directly:**
   ```bash
   skills-server
   ```
   You should see output like:
   ```
   Enhanced Skills MCP Server v0.2.0 starting...
   Skills directory: /home/user/.skills
   Lazy-MCP integration: ENABLED/DISABLED
   Enhanced Skills MCP server running on stdio
   ```
   Press Ctrl+C to stop.

2. **Run the test suite:**
   ```bash
   npm test
   ```
   This runs basic functionality tests.

3. **Test Lazy-MCP integration (if enabled):**
   ```bash
   node test_lazy_mcp.js
   ```
   Note: You may need to update the hardcoded path in `test_lazy_mcp.js` to match your lazy-mcp location.

4. **Test with an MCP client:**
   Configure your MCP client and verify that skills and lazy-mcp tools appear.

## Troubleshooting

### Common Issues

#### "Command not found: skills-server"
- Ensure npm global bin directory is in your PATH.
- On Linux/macOS, add `export PATH=$PATH:$HOME/.npm-global/bin` to your shell profile.
- On Windows, check that `%APPDATA%\npm` is in PATH.

#### Skills directory not found or not created
- The server creates the directory automatically, but if permissions are insufficient, it may fail.
- Manually create the directory and ensure it's readable/writable.

#### Lazy-MCP connection failures
- Verify that lazy-mcp is installed and the command path is correct.
- Check that `LAZY_MCP_COMMAND` is set to an executable file.
- Test lazy-mcp independently by running its command.

#### Permission denied on shell script
- On Linux/macOS, ensure the script has execute permissions: `chmod +x /path/to/script`.
- On Windows, ensure the script is associated with an appropriate interpreter.

#### Path resolution issues on Windows
- Use absolute paths with forward slashes or double backslashes in environment variables.
- Avoid using `~` in paths on Windows; use `%USERPROFILE%` or full path.

### Platform-Specific Troubleshooting

#### Linux
- If you encounter "ENOENT" errors, check that directories exist and permissions are correct.
- For systemd service setup, see example service file in `docs/` (if available).

#### macOS
- If Homebrew-installed Node.js is not found, ensure `/usr/local/bin` is in PATH.
- Gatekeeper may block execution of scripts; you may need to allow them in Security & Privacy settings.

#### Windows
- Windows Defender may block execution of scripts. Add an exception or run in an elevated terminal.
- If Python is not found, ensure it's installed and added to PATH (restart terminal after installation).
- Batch files may require `@echo off` and proper line endings (CRLF).

## Updating

To update the Enhanced Skills Server:

**Global installation:**
```bash
npm update -g @skills-server/mcp
```

**Local installation:**
```bash
cd skills-server
git pull
npm install
npm run build
```

Check the [CHANGELOG.md](CHANGELOG.md) (if available) for breaking changes and new features.

---

For further assistance, refer to the [README.md](README.md) or open an issue on the [GitHub repository](https://github.com/ivanenev/skills-server/issues).