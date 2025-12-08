#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function diagnosticTest() {
  console.log('Running Tool Execution Diagnostic (Progressive Disclosure)...');
  
  const client = new Client({ name: 'diagnostic', version: '0.1.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['/home/mts/mcp_servers/skills-server/build/index.js'],
  });

  try {
    await client.connect(transport);
    console.log('Connected to skills server');

    // Get all tools
    const tools = await client.listTools();
    console.log(`Total tools: ${tools.tools.length}`);

    // Test skills directly (they are not part of lazy-mcp)
    const skillTools = [
      'system-testing',
      'backup-restore',
      'docker-compose-manager',
      'postgres',
      'redis',
      'qdrant',
      'system-monitoring',
    ];

    console.log('\n=== Testing Skills (Direct) ===');
    let successCount = 0;
    let failCount = 0;

    for (const toolName of skillTools) {
      try {
        console.log(`\nTesting: ${toolName}`);
        const result = await client.callTool({
          name: toolName,
          arguments: { query: 'test' }
        });
        console.log(`SUCCESS - ${toolName} (${result.content[0].text.length} chars)`);
        successCount++;
      } catch (error) {
        console.log(`FAILED - ${toolName}: ${error.message}`);
        failCount++;
      }
    }

    // Test lazy-mcp tools via progressive disclosure
    console.log('\n=== Testing Lazy-MCP Tools (Progressive Disclosure) ===');
    
    // Define tool paths and appropriate arguments
    const lazyTools = [
      {
        path: 'brave-search.brave_local_search',
        args: { query: 'coffee shop' }
      },
      {
        path: 'brave-search.brave_web_search',
        args: { query: 'test' }
      },
      {
        path: 'desktop-commander.list_directory',
        args: { path: '/home/mts/mcp_servers/skills-server' }
      },
      {
        path: 'filesystem.list_directory',
        args: { path: '/home/mts/mcp_servers/skills-server' }
      },
      {
        path: 'memory.read_graph',
        args: {}
      },
      {
        path: 'github.search_repositories',
        args: { query: 'test' }
      }
    ];

    for (const { path, args } of lazyTools) {
      try {
        console.log(`\nTesting: ${path}`);
        const result = await client.callTool({
          name: 'lazy_mcp_execute_tool',
          arguments: {
            tool_path: path,
            arguments: args
          }
        });
        console.log(`SUCCESS - ${path} (${result.content[0].text.length} chars)`);
        successCount++;
      } catch (error) {
        console.log(`FAILED - ${path}: ${error.message}`);
        failCount++;
      }
    }

    // Optional: Demonstrate progressive disclosure by exploring categories
    console.log('\n=== Demonstrating Progressive Disclosure ===');
    try {
      const categories = await client.callTool({
        name: 'lazy_mcp_get_tools_in_category',
        arguments: { path: '' }
      });
      console.log('Root categories retrieved successfully');
      console.log(`Overview: ${categories.content[0].text.substring(0, 200)}...`);
    } catch (error) {
      console.log(`Failed to get categories: ${error.message}`);
    }

    console.log(`\n=== Diagnostic Summary ===`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    const totalTests = skillTools.length + lazyTools.length;
    console.log(`  Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  }
}

diagnosticTest();