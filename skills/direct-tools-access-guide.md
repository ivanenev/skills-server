---
name: direct-tools-access-guide
description: Guide for accessing MCP tools through the progressive disclosure architecture of skills-server
---

# Progressive Tools Access Guide

## Architecture Overview

The skills-server implements a **progressive disclosure** architecture to provide token-efficient access to a large toolset. Instead of exposing all 143+ tools directly (which would consume excessive tokens), the server exposes only two navigation tools initially:

- **lazy_mcp_get_tools_in_category** – Browse the hierarchical tool structure
- **lazy_mcp_execute_tool** – Execute a tool after discovering its path

This design preserves the benefits of lazy-mcp's hierarchical organization while maintaining compatibility with MCP clients.

## Available Servers

- **skills-server**: ✅ Active – Provides skills and progressive tool navigation
- **lazy-mcp**: ✅ Integrated – Serves as the backend tool hierarchy; accessed via the two navigation tools

## How to Access Tools

### Correct Usage Pattern

```javascript
// Step 1: Browse available categories and tools
const browseResult = await use_mcp_tool("skills-server", "lazy_mcp_get_tools_in_category", {
  path: ""  // Start at root
});

// Step 2: Examine the response to find tool paths
// Response includes categories (e.g., "brave-search", "desktop-commander") and leaf tools

// Step 3: Execute a specific tool using its hierarchical path
const result = await use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  tool_path: "brave-search.brave_web_search",
  arguments: { query: "example search" }
});
```

### Incorrect Patterns to Avoid

```javascript
// ❌ Do NOT assume direct tool names are exposed
use_mcp_tool("skills-server", "brave_web_search", { query: "..." }); // Will fail

// ❌ Do NOT use lazy-mcp as a separate server (it's integrated)
use_mcp_tool("lazy-mcp", "execute_tool", { ... }); // Not configured
```

## Tool Categories Available

The hierarchical toolset includes the following categories (non‑exhaustive):

- **brave‑search** – Web and local search tools
- **desktop‑commander** – File system, process, and system management
- **filesystem** – File and directory operations
- **playwright** – Browser automation (Playwright)
- **puppeteer** – Browser automation (Puppeteer)
- **github** – Repository, issue, and PR management
- **memory** – Knowledge graph operations
- **whatsapp‑mcp** – WhatsApp messaging
- **fuse‑optimizer** – Multi‑agent orchestration
- **youtube** – YouTube video operations

Each category may contain sub‑categories and leaf tools. Use `lazy_mcp_get_tools_in_category` to explore the exact structure.

## Common Workflows

### File Operations

```javascript
// 1. Discover file system tools
const fsTools = await use_mcp_tool("skills-server", "lazy_mcp_get_tools_in_category", {
  path: "filesystem"
});

// 2. Execute a file read
const content = await use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  tool_path: "filesystem.read_file",
  arguments: { path: "package.json" }
});
```

### Browser Automation

```javascript
// 1. Navigate to a page
await use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  tool_path: "playwright.browser_navigate",
  arguments: { input: "https://example.com" }
});

// 2. Take a screenshot
await use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  tool_path: "playwright.browser_take_screenshot",
  arguments: { input: "" }
});
```

### System Monitoring

```javascript
const status = await use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  tool_path: "desktop-commander.system-monitoring",
  arguments: { query: "Check system health" }
});
```

## Error Handling

### Common Errors and Solutions

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `Tool 'X' not found` | Trying to call a tool directly instead of via `lazy_mcp_execute_tool` | Use the two‑step browse‑then‑execute pattern |
| `Invalid tool_path` | Incorrect hierarchical path | Browse the category first to verify the exact path |
| Timeout | Lazy‑MCP backend not running | Ensure lazy‑mcp is installed and the skills‑server has `LAZY_MCP_ENABLED=true` |
| `Server not configured` | MCP client points to wrong server | Configure client to use `skills-server` |

## Performance Notes

- **Token Efficiency**: Only two navigation tools appear in the initial tool list (~500 tokens vs. 25,000+ for full flattening).
- **Measured Savings**: 92.1% token reduction (7,298 tokens → 574 tokens) verified via `measure-progressive-tokens.js`.
- **Skill Token Savings**: 96.5% reduction (12,328 tokens → 430 tokens) measured via `measure-progressive-tokens.js`.
- **Progressive Loading**: Tool details are fetched on‑demand when browsing categories.
- **No Proxy Overhead**: Direct execution through lazy‑mcp maintains native performance.

## Migration from Direct‑Tool Assumptions

If you previously assumed all tools were directly accessible via `skills‑server`, update your code to the progressive pattern:

**Before (outdated):**
```javascript
use_mcp_tool("skills-server", "read_file", { path: "." });
```

**After (correct):**
```javascript
// First discover the tool path, then execute
use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  tool_path: "filesystem.read_file",
  arguments: { path: "." }
});
```

## Summary

- Use `lazy_mcp_get_tools_in_category` to explore the tool hierarchy.
- Use `lazy_mcp_execute_tool` with the full hierarchical path to run a tool.
- The skills‑server exposes **only these two navigation tools** initially, preserving token efficiency.
- All 143+ tools remain available through this progressive disclosure mechanism.

This architecture ensures reliable, token‑optimized access to the complete MCP toolset while maintaining full functionality.