# MCP Tool Parameter Formats Guide

This document provides the correct parameter formats for MCP tools available through the skills-server and its Lazy-MCP bridge.

## Tool Categories and Parameter Formats

### 1. Skills Server Tools
**Server**: `skills-server`
**Parameter Format**: Use `{"query": "your query string"}`

**Working Tools**:
- `system-monitoring` - Returns system monitoring skill content
- `system-testing` - Returns system testing skill content  
- `docker-compose-manager` - Returns docker compose management skill content
- `backup-restore` - Returns backup/restore skill content
- `postgres` - Returns PostgreSQL skill content
- `redis` - Returns Redis skill content
- `qdrant` - Returns Qdrant skill content

**Example**:
```json
{
  "query": "test system monitoring"
}
```

### 2. Lazy-MCP Bridge Tools (via Progressive Disclosure)
**Server**: `skills-server` (using `lazy_mcp_execute_tool`)
**Parameter Format**: Varies by tool category

To access Lazy-MCP tools, you must first browse the hierarchy with `lazy_mcp_get_tools_in_category`, then execute a tool using its hierarchical path.

#### 2.1 Desktop Commander Tools
**Tool Path**: `desktop-commander.tool_name`
**Parameter Format**: Direct parameter names (no "input" wrapper)

**Working Tools**:
- `list_directory` - Use `{"path": "/absolute/path"}`
- `get_config` - Use `{}` (no parameters needed)

**Example**:
```json
{
  "path": "/home/mts/mcp_servers/skills-server"
}
```

#### 2.2 Brave Search Tools
**Tool Path**: `brave-search.tool_name`
**Parameter Format**: Use `{"query": "search query"}`

**Working Tools**:
- `brave_web_search` - Web search with query parameter
- `brave_local_search` - Local business search with query parameter

**Example**:
```json
{
  "query": "test search query"
}
```

#### 2.3 Memory Tools
**Tool Path**: `memory.tool_name`
**Parameter Format**: Use `{"query": "search term"}` or empty object

**Working Tools**:
- `read_graph` - Use `{}` (no parameters)
- `search_nodes` - Use `{"query": "search term"}`

**Example**:
```json
{
  "query": "test"
}
```

#### 2.4 Filesystem Tools
**Tool Path**: `filesystem.tool_name`
**Parameter Format**: Direct parameter names, but has access restrictions

**Working Tools**:
- Limited access - only works within allowed directories

#### 2.5 Browser Automation Tools
**Tool Path**: `playwright.tool_name` or `puppeteer.tool_name`
**Parameter Format**: Direct parameter names, but requires Chrome installation

**Status**: Currently not working due to Chrome installation requirements

## Common Error Patterns and Solutions

### Error: `"path": ["path"], "message": "Required"`
**Cause**: Missing required path parameter
**Solution**: Add `"path": "/absolute/path"` parameter

### Error: `"input": ["input"], "message": "Required"`  
**Cause**: Using wrong parameter format
**Solution**: Use direct parameter names instead of "input" wrapper

### Error: `Access denied - path outside allowed directories`
**Cause**: Filesystem access restrictions
**Solution**: Use desktop-commander tools instead

### Error: `Chromium distribution 'chrome' is not found`
**Cause**: Browser tools need Chrome installation
**Solution**: Install Chrome in the expected location

## Best Practices

1. **Always use absolute paths** for file operations
2. **Test tools individually** to understand their parameter requirements
3. **Use desktop-commander** for file operations instead of filesystem tools
4. **Check tool descriptions** using `lazy_mcp_get_tools_in_category` for parameter hints
5. **Start with simple queries** and add parameters as needed

## Quick Reference

| Tool Category | Parameter Format | Example |
|---------------|------------------|---------|
| Skills Server | `{"query": "..."}` | `{"query": "test"}` |
| Desktop Commander | Direct parameters | `{"path": "/path"}` |
| Brave Search | `{"query": "..."}` | `{"query": "search"}` |
| Memory | `{"query": "..."}` or `{}` | `{"query": "test"}` |
| Filesystem | Direct parameters | `{"path": "/path"}` |
| Browser | Direct parameters | `{"url": "https://..."}` |

## Testing Commands

To test any tool, use the progressive disclosure workflow:

```javascript
// 1. Browse categories (optional)
const categories = await use_mcp_tool("skills-server", "lazy_mcp_get_tools_in_category", {
  "path": ""
});

// 2. Execute a tool via its hierarchical path
const result = await use_mcp_tool("skills-server", "lazy_mcp_execute_tool", {
  "tool_path": "brave-search.brave_web_search",
  "arguments": { "query": "test search" }
});

// For skills server tools directly
const skillResult = await use_mcp_tool("skills-server", "system-monitoring", {
  "query": "test"
});
```

**Note:** Lazy-MCP integration is optional. If disabled, only skills server tools are available.

This documentation should eliminate parameter format confusion and ensure consistent tool usage.