#!/usr/bin/env node

/**
 * Enhanced Skills MCP Server
 * Serves specialized prompt libraries (skills) from the ~/.skills directory
 * Provides token-efficient access to expert knowledge across domains
 * Now includes Lazy-MCP Bridge for compatibility with hierarchical tool systems
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import matter from 'gray-matter';

// Skill directory - can be overridden with SKILLS_DIR env var
const SKILLS_DIR = process.env.SKILLS_DIR || path.join(os.homedir(), '.skills');

// Interface for parsed skill data
interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
  type?: string; // 'static' | 'executable'
  allowed_tools?: string[];
  execution_logic?: string;
  parameters?: Record<string, any>;
  skill_id?: string; // For container parameter support
  version?: string; // For container parameter support
}

// Interface for container parameter support (Anthropic-compatible)
interface SkillContainer {
  skills: Array<{
    type: 'anthropic' | 'custom';
    skill_id: string;
    version: string;
  }>;
}

// Interface for lazy-mcp tool mapping
interface LazyMCPTool {
  name: string;           // Traditional MCP tool name
  tool_path: string;      // Lazy-mcp hierarchical path
  description: string;
  inputSchema: any;
  category: string;
  source: 'lazy-mcp';     // Identifier for lazy-mcp tools
}

// Cache for loaded skills
let skillsCache: Skill[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Lazy-MCP configuration
// Respect LAZY_MCP_ENABLED environment variable first, then check if command exists
const LAZY_MCP_COMMAND = process.env.LAZY_MCP_COMMAND || '../lazy-mcp/run-lazy-mcp.sh';

// Check environment variable first, then fall back to command existence
function isLazyMCPEnabled(): boolean {
  if (process.env.LAZY_MCP_ENABLED !== undefined) {
    return process.env.LAZY_MCP_ENABLED === 'true';
  }
  // If not set, default to enabled if command exists
  return fs.existsSync(LAZY_MCP_COMMAND);
}

// Make LAZY_MCP_ENABLED a function to check dynamically
function getLazyMCPEnabled(): boolean {
  return isLazyMCPEnabled();
}

// Lazy-MCP client instance
let lazyMCPClient: Client | null = null;

// Cache for lazy-mcp tools
let lazyMCPToolsCache: LazyMCPTool[] = [];
let lastLazyMCPCacheTime = 0;
const LAZY_MCP_CACHE_DURATION = 300000; // 5 minutes

/**
 * Load and parse all skills from the skills directory
 */
async function loadSkills(): Promise<Skill[]> {
  const now = Date.now();

  // Return cached skills if still fresh
  if (skillsCache.length > 0 && (now - lastCacheTime) < CACHE_DURATION) {
    return skillsCache;
  }

  const skills: Skill[] = [];

  try {
    // Check if skills directory exists, create if not
    if (!fs.existsSync(SKILLS_DIR)) {
      try {
        fs.mkdirSync(SKILLS_DIR, { recursive: true });
        console.error(`Created skills directory: ${SKILLS_DIR}`);
      } catch (error) {
        console.error(`Failed to create skills directory: ${SKILLS_DIR}`, error);
        return skills;
      }
    }

    // Read all skill directories
    const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const skillDir of skillDirs) {
      // Validate skill directory name to prevent directory traversal
      if (skillDir.includes('..') || skillDir.includes('/') || skillDir.includes('\\')) {
        console.warn(`Invalid skill directory name: ${skillDir}, skipping`);
        continue;
      }
      const skillPath = path.join(SKILLS_DIR, skillDir);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      try {
        // Check if SKILL.md exists
        if (!fs.existsSync(skillMdPath)) {
          console.warn(`SKILL.md not found in ${skillDir}, skipping`);
          continue;
        }

        // Read and parse the skill file
        const skillContent = fs.readFileSync(skillMdPath, 'utf-8');
        const parsed = matter(skillContent);

        // Validate required frontmatter
        if (!parsed.data.name || !parsed.data.description) {
          console.warn(`Invalid frontmatter in ${skillDir}, missing name or description`);
          continue;
        }

        skills.push({
          name: parsed.data.name,
          description: parsed.data.description,
          content: parsed.content,
          path: skillMdPath,
          type: parsed.data.type || 'static',
          allowed_tools: parsed.data.allowed_tools || [],
          execution_logic: parsed.data.execution_logic || 'static',
          parameters: parsed.data.parameters || {},
          skill_id: parsed.data.skill_id || parsed.data.name,
          version: parsed.data.version || 'latest'
        });

      } catch (error) {
        console.error(`Error loading skill ${skillDir}:`, error);
      }
    }

  } catch (error) {
    console.error('Error loading skills directory:', error);
  }

  // Update cache
  skillsCache = skills;
  lastCacheTime = now;

  console.error(`Loaded ${skills.length} skills from ${SKILLS_DIR}`);
  return skills;
}

/**
 * Ensure lazy-mcp client is connected
 */
async function ensureLazyMCPConnection(): Promise<boolean> {
  // Check environment variable dynamically on each call
  if (!getLazyMCPEnabled()) {
    // If disabled, ensure client is disconnected and cache is cleared
    if (lazyMCPClient) {
      try {
        await lazyMCPClient.close();
      } catch (error) {
        // Ignore close errors
      }
      lazyMCPClient = null;
    }
    // Clear the tools cache when disabled
    lazyMCPToolsCache = [];
    return false;
  }

  if (!lazyMCPClient) {
    try {
      lazyMCPClient = new Client(
        {
          name: "skills-server-lazy-mcp-client",
          version: "0.1.0",
        },
        {
          capabilities: {},
        }
      );

      const transport = new StdioClientTransport({
        command: LAZY_MCP_COMMAND,
        args: [],
      });

      await lazyMCPClient.connect(transport);
      console.error('Connected to lazy-mcp successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to lazy-mcp:', error);
      lazyMCPClient = null;
      return false;
    }
  }
  return true;
}

/**
 * Scan lazy-mcp hierarchy and create traditional MCP tools
 */
async function scanLazyMCPHierarchy(path: string = ""): Promise<LazyMCPTool[]> {
  const tools: LazyMCPTool[] = [];

  try {
    const result = await (lazyMCPClient as any).callTool({
      name: "get_tools_in_category",
      arguments: { path }
    });

    // Extract the actual data from MCP response
    let responseData: any = null;
    if ((result as any).content && (result as any).content.length > 0) {
      const content = (result as any).content[0];
      if (content.type === 'text') {
        responseData = JSON.parse(content.text);
      }
    }

    if (!responseData) return tools;

    // Process leaf tools at this level
    if (responseData.tools) {
      for (const [toolName, toolDef] of Object.entries(responseData.tools)) {
        const fullPath = path ? `${path}.${toolName}` : toolName;
        tools.push(createTraditionalTool(fullPath, toolDef as any));
      }
    }

        // Process children recursively - but only for universal, non-database categories
        if (responseData.children) {
          for (const childPath in responseData.children) {
            const child = responseData.children[childPath];
            // Only include universal categories that don't require specific databases
            const universalCategories = [
              'brave-search', 'playwright', 'puppeteer', 'filesystem',
              'desktop-commander', 'memory', 'youtube', 'fuse-optimizer',
              'brave-search-marketplace', 'playwright-marketplace', 'puppeteer-marketplace', 'whatsapp-mcp'
            ];
            
            if (universalCategories.includes(childPath)) {
              const childTools = await scanLazyMCPHierarchy(childPath);
              tools.push(...childTools);
            }
          }
        }
  } catch (error) {
    console.error(`Error scanning lazy-mcp hierarchy at path ${path}:`, error);
  }

  return tools;
}

/**
 * Create traditional MCP tool from lazy-mcp tool definition
 */
function createTraditionalTool(toolPath: string, toolDef: any): LazyMCPTool {
  // Handle name collisions by prefixing with category
  const parts = toolPath.split('.');
  const category = parts[0];
  const toolName = parts[parts.length - 1];

  // Use category prefix to avoid collisions
  const safeName = parts.length > 2 ? `${category}_${toolName}` : toolName;

  return {
    name: safeName,
    tool_path: toolPath,
    description: toolDef.description || 'No description available',
    inputSchema: inferInputSchema(toolDef),
    category: category,
    source: 'lazy-mcp'
  };
}

/**
 * Infer input schema from tool definition
 */
function inferInputSchema(toolDef: any): any {
  if (toolDef.inputSchema) {
    return toolDef.inputSchema;
  }

  // Fallback for tools without explicit schema
  return {
    type: "object",
    properties: {
      input: {
        type: "string",
        description: "Input for this tool"
      }
    },
    required: []
  };
}

/**
 * Generate dynamic instructions for executable skills
 */
function generateDynamicInstructions(skill: Skill, params: any): string {
  const query = params.query || '';
  const availableTools = skill.allowed_tools || [];
  
  let instructions = `# ${skill.name} - Dynamic Execution\n\n`;
  instructions += `${skill.description}\n\n`;
  
  // Add context-aware instructions based on query
  if (query) {
    instructions += `## Task Context\n${query}\n\n`;
  }
  
  // Add tool orchestration instructions
  if (availableTools.length > 0) {
    instructions += `## Available Tools\nYou have access to these tools: ${availableTools.join(', ')}\n\n`;
    instructions += `## Tool Usage Strategy\n`;
    instructions += `- Analyze the task and select appropriate tools\n`;
    instructions += `- Use tools in sequence to accomplish the task\n`;
    instructions += `- Combine tool outputs for comprehensive solutions\n`;
    instructions += `- Handle errors gracefully and provide alternatives\n\n`;
  }
  
  // Add skill-specific execution logic
  instructions += `## Execution Instructions\n${skill.content}\n\n`;
  
  // Add dynamic behavior based on skill type
  switch (skill.execution_logic) {
    case 'conditional':
      instructions += `## Conditional Logic\n`;
      instructions += `- Analyze the input and context\n`;
      instructions += `- Make decisions based on available information\n`;
      instructions += `- Adapt your approach based on results\n`;
      break;
    case 'sequential':
      instructions += `## Sequential Execution\n`;
      instructions += `- Follow steps in logical order\n`;
      instructions += `- Use output from previous steps as input to next\n`;
      instructions += `- Validate each step before proceeding\n`;
      break;
    case 'parallel':
      instructions += `## Parallel Execution\n`;
      instructions += `- Execute multiple operations simultaneously\n`;
      instructions += `- Coordinate results from parallel operations\n`;
      instructions += `- Handle dependencies between operations\n`;
      break;
    default:
      instructions += `## Standard Execution\n`;
      instructions += `- Follow the provided instructions systematically\n`;
      instructions += `- Use available tools as needed\n`;
      instructions += `- Provide comprehensive solutions\n`;
  }
  
  return instructions;
}

/**
 * Get lazy-mcp's native navigation tools (preserves progressive disclosure)
 * Instead of flattening 166 tools → Only expose 2 navigation tools
 * Token savings: ~25,000 tokens → ~500 tokens
 */
async function getLazyMCPNavigationTools(): Promise<any[]> {
  // Ensure connection
  if (!(await ensureLazyMCPConnection())) {
    console.error('Lazy-MCP not available');
    return [];
  }

  console.error('Exposing lazy-mcp native navigation tools (progressive disclosure preserved)');

  // Return lazy-mcp's native navigation tools as-is
  // This preserves the hierarchical, token-efficient design
  return [
    {
      name: "lazy_mcp_get_tools_in_category",
      description: "Browse the lazy-mcp tool hierarchy progressively. You have 166 MCP tools across 15 categories available through progressive disclosure. Use this to explore available tools by category.\n\nCall with empty path \"\" to see root categories (brave-search, desktop-commander, filesystem, github, playwright, etc.).\n\nReturns children categories and tools at the specified path.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Category path using dot notation (e.g., 'brave-search' or 'desktop-commander'). Use empty string \"\" for root."
          }
        },
        required: ["path"]
      }
    },
    {
      name: "lazy_mcp_execute_tool",
      description: "Execute a lazy-mcp tool by its full hierarchical path. First use lazy_mcp_get_tools_in_category to browse and find the tool path, then execute it with this tool.",
      inputSchema: {
        type: "object",
        properties: {
          tool_path: {
            type: "string",
            description: "Full tool path using dot notation (e.g., 'brave-search.brave_web_search' or 'desktop-commander.read_file')"
          },
          arguments: {
            type: "object",
            additionalProperties: true,
            description: "Arguments to pass to the tool"
          }
        },
        required: ["tool_path", "arguments"]
      }
    }
  ];
}

/**
 * Create an MCP server for serving skills
 */
const server = new Server(
  {
    name: "enhanced-skills-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler for listing available skills as tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('ListToolsRequest: Starting tool discovery...');

  const skills = await loadSkills();
  console.error(`ListToolsRequest: Found ${skills.length} skills`);

  let lazyMCPTools: any[] = [];
  const lazyMcpEnabled = getLazyMCPEnabled();
  if (lazyMcpEnabled) {
    console.error('ListToolsRequest: Lazy-MCP enabled, exposing navigation tools...');
    try {
      lazyMCPTools = await getLazyMCPNavigationTools();
      console.error(`ListToolsRequest: Exposed ${lazyMCPTools.length} lazy-mcp navigation tools (progressive disclosure)`);
    } catch (error) {
      console.error('ListToolsRequest: Failed to get lazy-mcp navigation tools:', error);
    }
  } else {
    console.error('ListToolsRequest: Lazy-MCP disabled - only returning skills for token efficiency');
  }

  const allTools = [
    // Skills tools
    ...skills.map(skill => ({
      name: skill.name,
      description: skill.description,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional query or context for using this skill"
          }
        }
      }
    }))
  ];

  // Add lazy-mcp navigation tools if enabled (preserves progressive disclosure)
  if (lazyMcpEnabled) {
    allTools.push(...lazyMCPTools);
  }

  console.error(`ListToolsRequest: Returning ${allTools.length} total tools (${skills.length} skills + ${lazyMcpEnabled ? lazyMCPTools.length : 0} lazy-mcp)`);

  return { tools: allTools };
});

/**
 * Handler for calling skill tools and lazy-mcp tools
 * Returns the full skill content or proxies lazy-mcp tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  // First check if it's a skill
  const skills = await loadSkills();
  const skill = skills.find(s => s.name === name);

  if (skill) {
    // Check if it's an executable skill
    if (skill.type === 'executable') {
      // Generate dynamic instructions based on context and available tools
      const dynamicInstructions = generateDynamicInstructions(skill, request.params.arguments || {});
      return {
        content: [{
          type: "text",
          text: dynamicInstructions
        }]
      };
    } else {
      // Return the full static skill content
      return {
        content: [{
          type: "text",
          text: skill.content
        }]
      };
    }
  }

  // Check if it's a lazy-mcp navigation tool
  const lazyMcpEnabled = getLazyMCPEnabled();
  if (lazyMcpEnabled) {
    if (name === 'lazy_mcp_get_tools_in_category') {
      // Proxy to lazy-mcp's get_tools_in_category
      try {
        const result = await (lazyMCPClient as any).callTool({
          name: "get_tools_in_category",
          arguments: request.params.arguments || {}
        });
        return result;
      } catch (error) {
        console.error(`Error calling get_tools_in_category:`, error);
        throw new Error(`Failed to browse lazy-mcp categories: ${error}`);
      }
    } else if (name === 'lazy_mcp_execute_tool') {
      // Proxy to lazy-mcp's execute_tool
      try {
        const result = await (lazyMCPClient as any).callTool({
          name: "execute_tool",
          arguments: request.params.arguments || {}
        });
        return result;
      } catch (error) {
        console.error(`Error executing lazy-mcp tool:`, error);
        throw new Error(`Failed to execute lazy-mcp tool: ${error}`);
      }
    }
  }

  throw new Error(`Tool '${name}' not found`);
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const lazyMcpEnabled = getLazyMCPEnabled();
  console.error(`Enhanced Skills MCP Server v0.2.0 starting...`);
  console.error(`Skills directory: ${SKILLS_DIR}`);
  console.error(`Lazy-MCP integration: ${lazyMcpEnabled ? 'ENABLED' : 'DISABLED'}`);

  if (lazyMcpEnabled) {
    console.error(`Lazy-MCP command: ${LAZY_MCP_COMMAND}`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Enhanced Skills MCP server running on stdio');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
