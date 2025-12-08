# Skills Server Troubleshooting Guide

This guide helps you diagnose and resolve common issues when installing and running the Skills MCP Server.

## Table of Contents

- [General Troubleshooting Steps](#general-troubleshooting-steps)
- [Installation Issues](#installation-issues)
  - [Node.js/npm Problems](#nodejsnpm-problems)
  - [Global Installation Failures](#global-installation-failures)
  - [Build Errors](#build-errors)
- [Platform-Specific Issues](#platform-specific-issues)
  - [Linux](#linux)
  - [macOS](#macos)
  - [Windows](#windows)
- [Permission Problems](#permission-problems)
  - [Skills Directory Permissions](#skills-directory-permissions)
  - [Script Execution Permissions](#script-execution-permissions)
- [Path Resolution Issues](#path-resolution-issues)
  - [Hardcoded Paths](#hardcoded-paths)
  - [Environment Variable Paths](#environment-variable-paths)
  - [Home Directory Expansion](#home-directory-expansion)
- [Lazy-MCP Integration Problems](#lazy-mcp-integration-problems)
  - [Connection Failures](#connection-failures)
  - [Tool Discovery Issues](#tool-discovery-issues)
  - [Performance Problems](#performance-problems)
- [Server Startup Errors](#server-startup-errors)
- [MCP Client Integration Issues](#mcp-client-integration-issues)
- [Logging and Debugging](#logging-and-debugging)

## General Troubleshooting Steps

1. **Check versions**: Ensure Node.js >=18 and npm are installed.
2. **Verify installation**: Run `skills-server --version` (global) or `node build/index.js` (local).
3. **Review logs**: The server logs to stderr; examine output for error messages.
4. **Test with minimal configuration**: Disable Lazy-MCP (set `LAZY_MCP_ENABLED=false`) and use default skills directory to isolate issues.

## Installation Issues

### Node.js/npm Problems

**Symptoms:**
- `node: command not found`
- `npm: command not found`
- Version mismatch errors

**Solutions:**
- Install Node.js from [nodejs.org](https://nodejs.org/) (LTS recommended).
- On Linux/macOS, use a version manager like `nvm`.
- On Windows, ensure Node.js is added to PATH during installation.

### Global Installation Failures

**Symptoms:**
- `npm install -g` fails with permission errors.
- `skills-server` command not found after installation.

**Solutions:**
- Use `sudo` on Linux/macOS (not recommended) or configure npm to install globally without sudo:
  ```bash
  mkdir ~/.npm-global
  npm config set prefix '~/.npm-global'
  export PATH=~/.npm-global/bin:$PATH
  ```
- On Windows, run Command Prompt as Administrator or adjust npm permissions.
- Verify global bin directory is in PATH:
  ```bash
  echo $PATH
  which skills-server
  ```

### Build Errors

**Symptoms:**
- `npm run build` fails with TypeScript errors.
- Missing dependencies.

**Solutions:**
- Ensure TypeScript is installed (`npm install` should install dev dependencies).
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Check TypeScript version compatibility (see `package.json`).

## Platform-Specific Issues

### Linux

**Common issues:**
- **Missing system dependencies**: Ensure `python3`, `git`, `make`, `g++` are installed.
- **Hardcoded paths**: The default Lazy-MCP command path (`/home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh`) may not exist. Set `LAZY_MCP_COMMAND` environment variable.
- **Permission denied on `/home/mts`**: If you're not user `mts`, you cannot access that directory. Change the path.

**Solutions:**
- Install missing packages via your package manager.
- Use absolute paths that exist on your system.

### macOS

**Common issues:**
- **Homebrew conflicts**: If Node.js installed via Homebrew and also from official package, PATH may be incorrect.
- **Gatekeeper blocking scripts**: Scripts from untrusted sources may be blocked.

**Solutions:**
- Use `brew doctor` to diagnose Homebrew issues.
- If a script is blocked, right-click it in Finder, select Open, and confirm.
- For command line, run `xattr -d com.apple.quarantine /path/to/script.sh`.

### Windows

**Common issues:**
- **Path separators**: Backslashes vs forward slashes cause issues.
- **Shell script execution**: `.sh` files are not executable by default.
- **Python not in PATH**: Lazy-MCP requires Python.

**Solutions:**
- Use forward slashes in paths or double backslashes in environment variables.
- Create a batch file wrapper for shell scripts (see [INSTALLATION.md](INSTALLATION.md#windows)).
- Ensure Python is installed and added to PATH (restart terminal after installation).

## Permission Problems

### Skills Directory Permissions

**Symptoms:**
- Server cannot create or read `~/.skills`.
- "Permission denied" errors in logs.

**Solutions:**
- Manually create the directory with appropriate permissions:
  ```bash
  mkdir -p ~/.skills
  chmod 755 ~/.skills
  ```
- On Windows, ensure your user has write access to the directory.
- If using a custom path, verify the server process has read/write access.

### Script Execution Permissions

**Symptoms:**
- "Permission denied" when trying to run `run-lazy-mcp.sh` or `build/index.js`.

**Solutions:**
- Grant execute permission:
  ```bash
  chmod +x /path/to/script.sh
  chmod +x build/index.js
  ```
- On Windows, ensure the file extension is associated with an interpreter (e.g., `.bat` files with cmd).

## Path Resolution Issues

### Hardcoded Paths

The server contains a hardcoded default Lazy-MCP command path (`/home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh`). This will cause failures on systems where that path does not exist.

**Fix:**
Set the `LAZY_MCP_COMMAND` environment variable to the correct path.

### Environment Variable Paths

**Symptoms:**
- Environment variables not being picked up.
- Paths with spaces or special characters cause errors.

**Solutions:**
- Use absolute paths without spaces.
- Quote paths in shell commands:
  ```bash
  export SKILLS_DIR="/path/with spaces/.skills"
  ```
- On Windows, use `set` or `$env:` with proper escaping.

### Home Directory Expansion

**Symptoms:**
- `~/.skills` not expanding to the actual home directory.

**Solutions:**
- Use absolute paths instead of `~`.
- In configuration files, expand `~` manually (e.g., `/home/username/.skills`).

## Lazy-MCP Integration Problems

**Note:** Lazy‑MCP integration is optional. If you encounter persistent issues, you can disable it (`LAZY_MCP_ENABLED=false`) and still use the server’s core skills functionality.

### Connection Failures

**Symptoms:**
- "Failed to connect to lazy-mcp" in logs.
- Lazy-MCP tools not appearing.

**Diagnosis:**
1. Verify Lazy-MCP is installed and runs independently.
2. Check that `LAZY_MCP_COMMAND` points to a working executable.
3. Ensure Lazy-MCP server starts without errors.

**Solutions:**
- Test Lazy-MCP directly:
  ```bash
  /path/to/lazy-mcp/run-lazy-mcp.sh
  ```
- If Lazy-MCP fails, consult its documentation.
- Set `LAZY_MCP_ENABLED=false` to disable integration temporarily.

### Tool Discovery Issues

**Symptoms:**
- Lazy-MCP tools missing or incomplete.
- Categories filtered out.

**Solutions:**
- The server filters categories to avoid duplicates. You can modify the `universalCategories` array in `src/index.ts` to include desired categories.
- Ensure Lazy-MCP's `config.json` includes the MCP servers you expect.

### Performance Problems

**Symptoms:**
- Slow tool listing.
- High memory usage.

**Solutions:**
- Increase cache durations (`LAZY_MCP_CACHE_DURATION`, `CACHE_DURATION`).
- Disable Lazy-MCP if not needed.

## Server Startup Errors

**Common errors and fixes:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Error: Cannot find module '@modelcontextprotocol/sdk'` | Dependencies not installed. | Run `npm install`. |
| `Error: EACCES: permission denied` | Insufficient permissions to write to skills directory. | Change directory permissions or use a different path. |
| `Error: spawn /home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh ENOENT` | Hardcoded path not found. | Set `LAZY_MCP_COMMAND`. |
| `Error: connect ECONNREFUSED` | Lazy-MCP server not running. | Start Lazy-MCP manually. |

## MCP Client Integration Issues

**Symptoms:**
- Skills server not appearing in client.
- Tools not listed.

**Solutions:**
- Verify the client configuration points to the correct command and environment variables.
- For Claude Desktop, ensure `claude_desktop_config.json` is in the correct location (see [Claude Desktop documentation](https://modelcontextprotocol.io/quickstart/user#claude-desktop)).
- Restart the client after configuration changes.
- Check client logs for MCP server errors.

## Logging and Debugging

Enable verbose logging to diagnose issues:

1. **Set log level**:
   ```bash
   export LOG_LEVEL=debug
   skills-server
   ```
2. **Inspect stderr output** (the server logs to stderr).
3. **Use the MCP inspector**:
   ```bash
   npm run inspector
   ```
   This launches an interactive inspector that shows MCP protocol messages.

4. **Run tests**:
   ```bash
   npm test
   node test_lazy_mcp.js
   ```

If problems persist, open an issue on the [GitHub repository](https://github.com/ivanenev/skills-server/issues) with relevant logs and system information.

---

For additional help, refer to:
- [INSTALLATION.md](INSTALLATION.md)
- [CONFIGURATION.md](CONFIGURATION.md)
- [README.md](README.md)