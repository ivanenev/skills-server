# Skills MCP Server

A Model Context Protocol (MCP) server that serves specialized prompt libraries (skills) from a local directory. Provides token-efficient access to expert knowledge across domains for any MCP-compatible client.

## Features

- **🚀 Token Efficient**: Only skill names/descriptions in context (~50 tokens/skill), full content on-demand
- **🔄 Auto-Discovery**: Automatically scans and loads skills from configurable directory
- **⚡ Hot Reload**: Skills update immediately without server restart
- **🔧 Configurable**: Environment variable controls skills directory location

- **📦 Universal**: Works with any MCP client (Cline, Claude Desktop, etc.)

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

### MCP Client Setup

Add to your MCP client configuration:

#### For VS Code Exrensions
Add to your extension config.jason:

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
---

# Skill Title

[Comprehensive skill content with instructions, examples, and best practices]
```

### Example Skill
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

## Usage

### With VS Code extensions like Cline
After configuration, skills are automatically available as tools:

```
You: "Set up PostgreSQL database connection"
Cline: [Loads postgres skill automatically]

You: "Test the API endpoints"
Cline: [Loads system-testing skill automatically]
```

### With Other MCP Clients
Skills appear as tools that return comprehensive expert guidance for specific domains.

## Architecture

### How It Works
1. **Discovery**: Server scans `SKILLS_DIR` for skill directories
2. **Parsing**: Reads `SKILL.md` files and extracts YAML frontmatter
3. **Registration**: Creates MCP tools for each skill
4. **Serving**: Returns full skill content when tools are invoked

### Caching
- Skills are cached for 5 seconds to improve performance
- Changes to skill files are reflected immediately
- No server restart required for skill updates

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
node build/index.js
```

## API Reference

### Tools
- **get_skill**: Returns full content of requested skill
  - Input: `skill_name` (string)
  - Output: Complete skill markdown content

### Configuration Options
- `SKILLS_DIR`: Directory containing skill folders
- `CACHE_DURATION`: Skill cache duration in milliseconds (default: 5000)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Related Projects

- [local-skills-mcp](https://github.com/kdpa-llc/local-skills-mcp) - Alternative file-based skills server
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol specification



**Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)**
