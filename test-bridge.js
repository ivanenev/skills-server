#!/usr/bin/env node

/**
 * Test script for Lazy-MCP Bridge functionality
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testBridge() {
  console.log('🧪 Testing Lazy-MCP Bridge...\n');

  // Test 1: Server startup without lazy-mcp
  console.log('Test 1: Server startup (Lazy-MCP disabled)');
  try {
    const server1 = spawn('node', ['build/index.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LAZY_MCP_ENABLED: 'false' }
    });

    let output1 = '';
    server1.stdout.on('data', (data) => output1 += data.toString());
    server1.stderr.on('data', (data) => output1 += data.toString());

    await new Promise((resolve) => setTimeout(resolve, 2000));
    server1.kill();

    if (output1.includes('Lazy-MCP integration: DISABLED')) {
      console.log('✅ Server starts correctly without lazy-mcp');
    } else {
      console.log('❌ Server startup test failed');
      console.log('Output:', output1);
    }
  } catch (error) {
    console.log('❌ Server startup test failed:', error.message);
  }

  console.log('');

  // Test 2: Server startup with lazy-mcp enabled
  console.log('Test 2: Server startup (Lazy-MCP enabled)');
  try {
    const server2 = spawn('node', ['build/index.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LAZY_MCP_ENABLED: 'true',
        LAZY_MCP_COMMAND: '/home/mts/mcp_servers/lazy-mcp/run-lazy-mcp.sh'
      }
    });

    let output2 = '';
    server2.stdout.on('data', (data) => output2 += data.toString());
    server2.stderr.on('data', (data) => output2 += data.toString());

    await new Promise((resolve) => setTimeout(resolve, 3000));
    server2.kill();

    if (output2.includes('Lazy-MCP integration: ENABLED')) {
      console.log('✅ Server starts correctly with lazy-mcp enabled');
    } else {
      console.log('❌ Server startup with lazy-mcp test failed');
      console.log('Output:', output2);
    }
  } catch (error) {
    console.log('❌ Server startup with lazy-mcp test failed:', error.message);
  }

  console.log('');
  console.log('🎉 Bridge testing complete!');
}

testBridge().catch(console.error);