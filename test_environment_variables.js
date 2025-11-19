#!/usr/bin/env node

/**
 * Test environment variable handling for the skills server
 * Specifically tests LAZY_MCP_ENABLED=false functionality
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from 'child_process';

async function testEnvironmentVariables() {
  console.log("🧪 Testing Environment Variable Handling\n");
  
  // Test 1: Test with LAZY_MCP_ENABLED=false
  console.log("🔧 Test 1: LAZY_MCP_ENABLED=false");
  
  const env = { ...process.env, LAZY_MCP_ENABLED: 'false' };
  
  const serverProcess = spawn('node', ['/home/mts/mcp_servers/skills-server/build/index.js'], {
    env: env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  let errorOutput = '';

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    errorOutput += output;
  });

  // Wait for server to be ready (check stderr for startup message)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 5000);
    
    const checkReady = () => {
      if (serverOutput.includes('Enhanced Skills MCP Server') && serverOutput.includes('Lazy-MCP integration: DISABLED')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    
    // Check every 100ms
    const interval = setInterval(checkReady, 100);
    
    // Also check on each stderr output
    serverProcess.stderr.on('data', checkReady);
    
    // Clean up interval when done
    setTimeout(() => {
      clearInterval(interval);
    }, 5000);
  });

  const client = new Client(
    {
      name: "env-test-client",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: ["/home/mts/mcp_servers/skills-server/build/index.js"],
  }, env);

  try {
    await client.connect(transport);
    console.log("✅ Connected to skills-server with LAZY_MCP_ENABLED=false");

    // Test tool listing
    const listResult = await client.listTools();
    const tools = listResult.tools;
    
    const skills = tools.filter(t => !t.description.includes('[') || !t.description.includes(']'));
    const lazyMCPTools = tools.filter(t => t.description.includes('[') && t.description.includes(']'));
    
    console.log(`📊 Total Tools: ${tools.length}`);
    console.log(`🔧 Skills: ${skills.length}`);
    console.log(`⚡ Lazy-MCP Tools: ${lazyMCPTools.length}`);
    
    if (lazyMCPTools.length === 0) {
      console.log("✅ SUCCESS: Lazy-MCP tools correctly disabled when LAZY_MCP_ENABLED=false");
    } else {
      console.log("❌ FAILURE: Lazy-MCP tools still present when LAZY_MCP_ENABLED=false");
    }

    // Test calling a skill
    if (skills.length > 0) {
      const skillResult = await client.callTool({
        name: skills[0].name,
        arguments: { query: "test" }
      });
      console.log("✅ Skills still work when LAZY_MCP_ENABLED=false");
    }

    await client.close();
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  // Test 2: Test with LAZY_MCP_ENABLED=true (default behavior)
  console.log("\n🔧 Test 2: LAZY_MCP_ENABLED=true (default)");
  
  const client2 = new Client(
    {
      name: "env-test-client-2",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  const transport2 = new StdioClientTransport({
    command: "node",
    args: ["/home/mts/mcp_servers/skills-server/build/index.js"],
  });

  try {
    await client2.connect(transport2);
    console.log("✅ Connected to skills-server with LAZY_MCP_ENABLED=true");

    const listResult2 = await client2.listTools();
    const tools2 = listResult2.tools;
    
    const skills2 = tools2.filter(t => !t.description.includes('[') || !t.description.includes(']'));
    const lazyMCPTools2 = tools2.filter(t => t.description.includes('[') && t.description.includes(']'));
    
    console.log(`📊 Total Tools: ${tools2.length}`);
    console.log(`🔧 Skills: ${skills2.length}`);
    console.log(`⚡ Lazy-MCP Tools: ${lazyMCPTools2.length}`);
    
    if (lazyMCPTools2.length > 0) {
      console.log("✅ SUCCESS: Lazy-MCP tools correctly enabled when LAZY_MCP_ENABLED=true");
    } else {
      console.log("❌ FAILURE: Lazy-MCP tools missing when LAZY_MCP_ENABLED=true");
    }

    await client2.close();
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  // Test 3: Test with LAZY_MCP_ENABLED not set (should default to enabled if command exists)
  console.log("\n🔧 Test 3: LAZY_MCP_ENABLED not set (default behavior)");
  
  const env3 = { ...process.env };
  delete env3.LAZY_MCP_ENABLED;
  
  const client3 = new Client(
    {
      name: "env-test-client-3",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  const transport3 = new StdioClientTransport({
    command: "node",
    args: ["/home/mts/mcp_servers/skills-server/build/index.js"],
  }, env3);

  try {
    await client3.connect(transport3);
    console.log("✅ Connected to skills-server with LAZY_MCP_ENABLED not set");

    const listResult3 = await client3.listTools();
    const tools3 = listResult3.tools;
    
    const skills3 = tools3.filter(t => !t.description.includes('[') || !t.description.includes(']'));
    const lazyMCPTools3 = tools3.filter(t => t.description.includes('[') && t.description.includes(']'));
    
    console.log(`📊 Total Tools: ${tools3.length}`);
    console.log(`🔧 Skills: ${skills3.length}`);
    console.log(`⚡ Lazy-MCP Tools: ${lazyMCPTools3.length}`);
    
    // When LAZY_MCP_ENABLED is not set, it should default to enabled if the command exists
    const lazyMCPCommand = '/home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh';
    const commandExists = require('fs').existsSync(lazyMCPCommand);
    
    if (commandExists && lazyMCPTools3.length > 0) {
      console.log("✅ SUCCESS: Lazy-MCP tools correctly enabled by default when command exists");
    } else if (!commandExists && lazyMCPTools3.length === 0) {
      console.log("✅ SUCCESS: Lazy-MCP tools correctly disabled when command doesn't exist");
    } else {
      console.log("❌ FAILURE: Unexpected behavior with LAZY_MCP_ENABLED not set");
    }

    await client3.close();
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🎉 Environment variable testing completed!");
  
  // Clean up spawned processes
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
    
    // Wait for process to exit
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 1000);
      
      serverProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  
  // Force exit to prevent hanging
  process.exit(0);
}

// Run the test
testEnvironmentVariables().catch(console.error);