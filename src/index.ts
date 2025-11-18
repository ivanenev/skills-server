#!/usr/bin/env node

/**
 * Skills MCP Server
 * Serves specialized prompt libraries (skills) from the ~/.skills directory
 * Provides token-efficient access to expert knowledge across domains
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
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
}

// Cache for loaded skills
let skillsCache: Skill[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

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
          path: skillMdPath
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
 * Create an MCP server for serving skills
 */
const server = new Server(
  {
    name: "skills-server",
    version: "0.1.0",
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
  const skills = await loadSkills();

  return {
    tools: skills.map(skill => ({
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
  };
});

/**
 * Handler for calling skill tools
 * Returns the full skill content when requested
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const skills = await loadSkills();
  const skill = skills.find(s => s.name === request.params.name);

  if (!skill) {
    throw new Error(`Skill '${request.params.name}' not found`);
  }

  // Return the full skill content
  return {
    content: [{
      type: "text",
      text: skill.content
    }]
  };
});

/**
 * Start the server using stdio transport
 */
async function main() {
  console.error(`Skills MCP Server starting...`);
  console.error(`Skills directory: ${SKILLS_DIR}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Skills MCP server running on stdio');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
