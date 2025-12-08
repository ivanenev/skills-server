# Enhanced Skills MCP Server

A Model Context Protocol (MCP) server that serves specialized prompt libraries (skills) from a local directory AND provides a **Lazy-MCP Bridge** for compatibility with hierarchical tool systems. Provides token-efficient access to expert knowledge across domains for any MCP-compatible client.

> **⚠️ Platform Compatibility Note**: This server has been **tested and developed on Linux**. While the core skills functionality should work cross-platform, the Lazy-MCP Bridge integration contains Linux-specific paths and assumptions. Windows and macOS users may need to modify configuration or use alternative lazy-mcp setups.

## Features

- **Progressive Disclosure**: Only skill metadata in context (~50 tokens/skill), full content loaded on-demand
- **Token Efficient**: 95%+ reduction in token usage during tool discovery
- **Auto-Discovery**: Automatically scans and loads skills from configurable directory
- **Hot Reload**: Skills update immediately without server restart
- **Configurable**: Environment variable controls skills directory location
- **Lazy-MCP Bridge**: Seamlessly integrates lazy-mcp hierarchical tools via progressive disclosure (only 2 navigation tools exposed initially)
- **Universal**: Works with any MCP client (Cline, Claude Desktop, etc.)
- **Skill Validation**: Enforces naming conventions and content rules
- **Executable Skills**: Dynamic instruction generation with tool orchestration
- **Dynamic Behavior**: Context-aware skill execution with parameter support
- **Tool Orchestration**: Skills can specify and use available tools

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Global Installation (Recommended)
```bash
npm install -g @skills-server/mcp
```

This installs the `skills-server` command globally and makes it available in your PATH.

### Local Installation (Development)
```bash
git clone <repository-url>
cd skills-server
npm install
npm run build
```

## Configuration

### Environment Variables
- `SKILLS_DIR`: Path to skills directory (default: `~/.skills`)
- `LAZY_MCP_ENABLED`: Enable Lazy-MCP Bridge integration (default: `false`)
- `LAZY_MCP_COMMAND`: Command to run lazy-mcp server (default: lazy-mcp script path)

### MCP Client Setup

Add to your MCP client configuration:

#### For VS Code Extensions
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

#### For Claude Desktop
Add to your `claude_desktop_config.json`:

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

#### For Other MCP Clients
Use the `skills-server` command in your MCP server configuration.

### Local Development Setup
If running locally, use the full path to the built binary:

```json
{
  "mcpServers": {
    "skills-server": {
      "command": "node",
      "args": ["/path/to/skills-server/build/index.js"],
      "env": {
        "SKILLS_DIR": "/path/to/your/skills"
      }
    }
  }
}
```

## Lazy-MCP Bridge

The server integrates with **[lazy-mcp](https://github.com/voicetreelab/lazy-mcp)** by [VoiceTreeLab](https://voicetreelab.com/) to provide access to hierarchical tool systems. This bridge enables seamless compatibility between traditional MCP tools and lazy-mcp's hierarchical architecture.

### Installing Lazy-MCP

**Prerequisites:**
- Python 3.8+
- pip package manager

**Installation:**
```bash
# Clone the repository
git clone https://github.com/voicetreelab/lazy-mcp.git
cd lazy-mcp

# Install dependencies
pip install -r requirements.txt

# Make the run script executable
chmod +x run-lazy-mcp.sh
```

**Configuration:**
The skills server automatically detects lazy-mcp when it's available in your system PATH or when the `LAZY_MCP_COMMAND` environment variable points to the lazy-mcp executable.

### Bridge Features

When enabled, the server automatically:

1. **Progressive Disclosure**: Exposes only two navigation tools (`lazy_mcp_get_tools_in_category` and `lazy_mcp_execute_tool`) instead of flattening all 143+ tools.
2. **Token Efficiency**: Preserves lazy-mcp's hierarchical token savings (~500 tokens vs. 25,000+ for full tool listing).
3. **Seamless Integration**: No changes needed to existing lazy-mcp setups.
4. **Error Resilience**: Graceful fallback if lazy-mcp is unavailable.

### Bridge Benefits

- **Universal Access**: All lazy-mcp tools available in any MCP client via progressive navigation.
- **Token Savings**: Hierarchical loading without client-side changes.
- **Backward Compatibility**: Works with MCP clients that expect direct tool access.
- **Preserved Hierarchy**: Maintains lazy-mcp's organizational structure.

## Customization

### Important Note for Users

**This package includes a pre-configured lazy-mcp setup optimized for the author's environment.** To get the full experience, you'll need to customize both the skills-server and your lazy-mcp configuration for your own setup.

### 1. Customizing Tool Categories

The skills-server filters lazy-mcp tools to prevent duplicates with VS Code extension internal tools. To customize which categories are included:

**Edit `src/index.ts` (lines 239-243):**
```typescript
const universalCategories = [
  'brave-search', 'playwright', 'puppeteer', 'filesystem',
  'desktop-commander', 'memory', 'youtube', 'fuse-optimizer',
  'brave-search-marketplace', 'playwright-marketplace', 'puppeteer-marketplace', 'whatsapp-mcp'
];
```

**Modify this array to include the categories that match your available MCP servers.**

### 2. Setting Up Your Own Lazy-MCP

Your lazy-mcp configuration needs to point to your own MCP server locations:

1. **Install lazy-mcp** following the [official documentation](https://github.com/voicetreelab/lazy-mcp)
2. **Configure your MCP servers** in lazy-mcp's `config.json`
3. **Update server paths** to match your installation locations
4. **Regenerate the hierarchy** using lazy-mcp's structure generator

### 3. Deployment Considerations

- **Core skills functionality** works without lazy-mcp.
- **Lazy-mcp integration** requires your own lazy-mcp setup.
- **Tool filtering** prevents conflicts with VS Code extension internal tools.
- **Customization is expected** for optimal performance in your environment.

## Skills Format

Each skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```
skill-name/
└── SKILL.md
```

### SKILL.md Structure
```markdown
---
name: skill-name
description: Brief description of what this skill does and when to use it
type: static | executable  # Optional: defines skill behavior
allowed_tools: [tool1, tool2]  # Optional: tools this skill can orchestrate
execution_logic: conditional  # Optional: dynamic behavior type
parameters:  # Optional: skill parameters
  param1: string
  param2: object
---

# Skill Title

[Comprehensive skill content with instructions, examples, and best practices]
```

### Example Skill

**Static Skill (Traditional):**
```markdown
---
name: docker-compose-manager
description: Manages Docker Compose services for containerized applications. Use when starting, stopping, or checking status of Docker services.
---

# Docker Compose Manager Skill

You are an expert at managing Docker Compose services...

## Core Operations
- **Start services**: Use `docker-compose up -d`
- **Stop services**: Use `docker-compose down`
- etc.
```

**Executable Skill (Advanced):**
```markdown
---
name: debug-agent
description: Dynamic debugging agent that analyzes errors and provides fixes using available tools
type: executable
allowed_tools: [list_directory, read_file, search_files, system-monitoring]
execution_logic: conditional
parameters:
  error_type: string
  context: object
---

# Debug Agent - Dynamic Problem Solver

You are an expert debugging agent that can analyze problems and provide solutions using available tools...

## Dynamic Decision Making

Based on the error type and context, select the appropriate tools and approach:

- **File-related issues**: Use file system tools to examine code and configuration
- **System problems**: Use monitoring tools to check health and performance
- **Integration errors**: Test connectivity and data flow
- **Logic errors**: Analyze code and test different scenarios

Always provide clear explanations of your findings and step-by-step solutions.
```

## Usage

### With VS Code extensions like Cline
After configuration, skills and lazy-mcp tools are automatically available via progressive disclosure:

```
You: "Search for React component libraries"
Cline: [Uses lazy_mcp_get_tools_in_category to find brave-search category,
        then lazy_mcp_execute_tool with tool_path "brave-search.brave_web_search"]

You: "Navigate to example.com and take a screenshot"
Cline: [Uses lazy_mcp_execute_tool with tool_path "playwright.browser_navigate",
        then lazy_mcp_execute_tool with tool_path "playwright.browser_take_screenshot"]

You: "Set up PostgreSQL database connection"
Cline: [Loads postgres skill automatically]
```

### With Other MCP Clients
Skills and lazy-mcp tools appear as standard MCP tools. **Note:** Integration with Claude Code and other CLI tools has not been tested but should work based on MCP protocol compatibility.

## Progressive Disclosure Architecture

### How It Works
1. **Discovery**: Server scans `SKILLS_DIR` for skill directories.
2. **Metadata Loading**: Reads only YAML frontmatter (name, description) for tool discovery.
3. **Tool Registration**: Creates MCP tools with metadata-only information.
4. **Lazy-MCP Integration**: When enabled, exposes only two navigation tools (`lazy_mcp_get_tools_in_category` and `lazy_mcp_execute_tool`) instead of flattening all 143+ tools.
5. **Progressive Loading**: Full tool details loaded only when browsing categories; full skill content loaded only when skills are actually called.
6. **Token Efficiency**: ~50 tokens per skill during discovery vs 1500+ tokens for full content; ~500 tokens for lazy-mcp navigation vs 25,000+ for full tool listing.

### Validated Performance Metrics
- **JSON Response Size**: 54% reduction (91KB → 42KB)
- **Token Efficiency**: 95%+ reduction during tool discovery
- **Tool Discovery**: ~50 tokens per skill (metadata only)
- **Skill Execution**: Full content (1500+ tokens) only when needed
- **Content Expansion**: 22x content ratio between discovery and execution
- **Real AI Validation**: Progressive disclosure working for both skills and lazy-mcp tools
- **Executable Skills**: Dynamic instruction generation with 89.2% token savings
- **Tool Orchestration**: Skills can dynamically use available MCP tools

### Caching
- **Metadata Cache**: 5 seconds for skill metadata
- **Full Content Cache**: 30 seconds for complete skill content
- **Hot Reload**: Changes reflected immediately without server restart

## Development

### Project Structure
```
skills-server/
├── src/
│   └── index.ts      # Main server implementation
├── build/
│   └── index.js      # Compiled server
├── package.json
└── README.md
```

### Adding Features
The server can be extended with:
- Additional skill metadata
- Skill validation
- Custom skill formats
- Integration with external APIs

### Testing
```bash
# Build and test
npm run build
npm test

# Run comprehensive test suite
node test_runner.js

# Validate progressive disclosure
node test-progressive-disclosure.js
```

### Progressive Disclosure Validation
The server includes comprehensive tests that validate:
- **Token Efficiency**: 95%+ reduction in discovery tokens
- **Metadata-Only Discovery**: Only skill names/descriptions during tool listing
- **Full Content Loading**: Complete skill content when tools are called
- **Skill Validation**: Proper naming conventions and content rules
- **Real AI Integration**: Ready for production use with actual models

## API Reference

### Tools
- **get_skill**: Returns full content of requested skill
  - Input: `skill_name` (string)
  - Output: Complete skill markdown content
- **lazy_mcp_get_tools_in_category**: Browse lazy-mcp tool hierarchy
  - Input: `path` (string) – category path using dot notation (empty string for root)
  - Output: JSON structure with child categories and tools at that path
- **lazy_mcp_execute_tool**: Execute a lazy-mcp tool by its hierarchical path
  - Input: `tool_path` (string), `arguments` (object)
  - Output: Tool execution result

### Configuration Options
- `SKILLS_DIR`: Directory containing skill folders
- `CACHE_DURATION`: Skill cache duration in milliseconds (default: 5000)
- `LAZY_MCP_ENABLED`: Enable lazy-mcp integration (default: false)
- `LAZY_MCP_COMMAND`: Path to lazy-mcp executable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

GPL-3.0 License - see LICENSE file for details.

## Related Projects

- [local-skills-mcp](https://github.com/kdpa-llc/local-skills-mcp) - Alternative file-based skills server
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol specification

**Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)**
