#!/usr/bin/env node

/**
 * Skills MCP Server Installer
 * Interactive installer for the Skills MCP Server
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ Error: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Detect the current MCP client and config location
function detectMCPConfig() {
  const home = process.env.HOME || process.env.USERPROFILE;

  // Check for different MCP clients
  const configs = [
    {
      name: 'Roo Code',
      path: path.join(home, '.config', 'Code - OSS', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json'),
      display: '~/.config/Code - OSS/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json'
    },
    {
      name: 'VS Code (Cline)',
      path: path.join(home, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.cline', 'settings', 'mcp_settings.json'),
      display: '~/.config/Code/User/globalStorage/saoudrizwan.cline/settings/mcp_settings.json'
    },
    {
      name: 'Claude Desktop (macOS)',
      path: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      display: '~/Library/Application Support/Claude/claude_desktop_config.json'
    }
  ];

  for (const config of configs) {
    if (fs.existsSync(config.path)) {
      return config;
    }
  }

  return null;
}

// Prompt user for input
function prompt(question, defaultValue = '') {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

// Main installation function
async function install() {
  log('🚀 Skills MCP Server Installer', 'cyan');
  log('================================', 'cyan');

  // Check if we're in the right directory
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    error('Please run this installer from the skills-server directory');
    process.exit(1);
  }

  // Build the server
  info('Building the MCP server...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    success('Server built successfully');
  } catch (err) {
    error('Failed to build server');
    process.exit(1);
  }

  // Detect MCP config
  const mcpConfig = detectMCPConfig();
  if (!mcpConfig) {
    warning('No MCP client configuration found');
    log('Supported clients: Roo Code, VS Code (Cline), Claude Desktop (macOS)');
    log('Please configure manually using the instructions in README.md');
    return;
  }

  success(`Detected ${mcpConfig.name} configuration`);

  // Prompt for skills directory
  const defaultSkillsDir = path.join(process.env.HOME || '', '.skillz');
  const skillsDir = await prompt('Enter skills directory path', defaultSkillsDir);

  // Validate skills directory
  if (!fs.existsSync(skillsDir)) {
    info(`Creating skills directory: ${skillsDir}`);
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  // Read current MCP config
  let mcpSettings = {};
  try {
    const configContent = fs.readFileSync(mcpConfig.path, 'utf-8');
    mcpSettings = JSON.parse(configContent);
  } catch (err) {
    warning('Could not read existing MCP config, creating new one');
  }

  // Ensure mcpServers exists
  if (!mcpSettings.mcpServers) {
    mcpSettings.mcpServers = {};
  }

  // Add skills-server configuration
  const serverPath = path.join(__dirname, 'build', 'index.js');
  mcpSettings.mcpServers['skills-server'] = {
    command: 'node',
    args: [serverPath],
    env: {
      SKILLS_DIR: skillsDir
    },
    disabled: false,
    timeout: 60,
    type: 'stdio'
  };

  // Write updated config
  try {
    fs.writeFileSync(mcpConfig.path, JSON.stringify(mcpSettings, null, 2));
    success('MCP configuration updated');
  } catch (err) {
    error(`Failed to update MCP config: ${err.message}`);
    log(`Please manually add the following to ${mcpConfig.display}:`);
    console.log(JSON.stringify({
      "skills-server": mcpSettings.mcpServers['skills-server']
    }, null, 2));
    return;
  }

  // Create example skill if directory is empty
  const skillDirs = fs.readdirSync(skillsDir).filter(file =>
    fs.statSync(path.join(skillsDir, file)).isDirectory()
  );

  if (skillDirs.length === 0) {
    info('Creating example skill...');
    const exampleSkillDir = path.join(skillsDir, 'example-skill');
    fs.mkdirSync(exampleSkillDir, { recursive: true });

    const exampleSkill = `---
name: example-skill
description: Example skill demonstrating the format. Use when learning how skills work.
---

# Example Skill

This is an example skill to demonstrate the format.

## Usage

Replace this content with your actual skill instructions.

## Guidelines

- Be specific about when to use the skill
- Include practical examples
- Provide step-by-step instructions
`;

    fs.writeFileSync(path.join(exampleSkillDir, 'SKILL.md'), exampleSkill);
    success('Example skill created');
  }

  // Final instructions
  log('\n🎉 Installation Complete!', 'green');
  log('==========================', 'green');
  success(`Skills directory: ${skillsDir}`);
  success(`MCP config updated: ${mcpConfig.display}`);
  info('Restart your MCP client to load the skills server');
  info('Skills will be automatically discovered and made available as tools');
}

// Run installer
install().catch((err) => {
  error(`Installation failed: ${err.message}`);
  process.exit(1);
});