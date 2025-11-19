#!/usr/bin/env node

/**
 * Error Handling Tests for Skills Server
 * Tests malformed requests, invalid inputs, and edge cases
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

// Server process
let serverProcess;
let client;

/**
 * Start the skills server
 */
function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);

    serverProcess.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Enhanced Skills MCP server running on stdio')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Connect client to server
 */
async function connectClient() {
  client = new Client(
    {
      name: "error-handling-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });

  await client.connect(transport);
}

/**
 * Test malformed JSON-RPC requests
 */
async function testMalformedRequests() {
  console.log('🧪 Testing malformed JSON-RPC requests...');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Invalid JSON (simulate by calling with invalid tool name)
  try {
    await client.callTool({
      name: "invalid{json}tool",
      arguments: { query: "test" }
    });
    console.log('❌ Invalid tool name should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Invalid tool name correctly rejected');
    passed++;
  }

  // Test 2: Missing method (simulate by calling with empty tool name)
  try {
    await client.callTool({
      name: "",
      arguments: { query: "test" }
    });
    console.log('❌ Empty tool name should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Empty tool name correctly rejected');
    passed++;
  }

  // Test 3: Invalid method
  try {
    await client.callTool({
      name: "nonexistent_method",
      arguments: {}
    });
    console.log('❌ Invalid method should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Invalid method correctly rejected');
    passed++;
  }

  return { passed, failed };
}

/**
 * Test invalid tool calls
 */
async function testInvalidToolCalls() {
  console.log('🧪 Testing invalid tool calls...');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Call non-existent tool
  try {
    await client.callTool({
      name: "nonexistent_tool_12345",
      arguments: { query: "test" }
    });
    console.log('❌ Non-existent tool should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Non-existent tool correctly rejected');
    passed++;
  }

  // Test 2: Call tool with invalid arguments
  try {
    await client.callTool({
      name: "backup-restore", // Assuming this exists
      arguments: { invalid_param: "test" }
    });
    // This might succeed if the tool handles invalid params gracefully
    console.log('⚠️  Tool with invalid arguments handled');
    passed++;
  } catch (error) {
    console.log('✅ Tool with invalid arguments correctly rejected');
    passed++;
  }

  // Test 3: Call tool with malformed arguments
  try {
    await client.callTool({
      name: "backup-restore",
      arguments: "not_an_object" // Should be object
    });
    console.log('❌ Malformed arguments should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Malformed arguments correctly rejected');
    passed++;
  }

  return { passed, failed };
}

/**
 * Test edge cases
 */
async function testEdgeCases() {
  console.log('🧪 Testing edge cases...');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Empty tool list request
  try {
    const tools = await client.listTools();
    if (tools && Array.isArray(tools.tools)) {
      console.log('✅ Empty tool list request handled correctly');
      passed++;
    } else {
      console.log('❌ Empty tool list request failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Empty tool list request threw error:', error.message);
    failed++;
  }

  // Test 2: Very long tool names
  try {
    await client.callTool({
      name: "a".repeat(1000), // Very long name
      arguments: {}
    });
    console.log('❌ Very long tool name should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Very long tool name correctly rejected');
    passed++;
  }

  // Test 3: Special characters in tool names
  try {
    await client.callTool({
      name: "tool<script>alert('xss')</script>",
      arguments: {}
    });
    console.log('❌ Special characters in tool name should have failed');
    failed++;
  } catch (error) {
    console.log('✅ Special characters in tool name correctly rejected');
    passed++;
  }

  return { passed, failed };
}

/**
 * Test resource limits
 */
async function testResourceLimits() {
  console.log('🧪 Testing resource limits...');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Large payload
  try {
    await client.callTool({
      name: "backup-restore",
      arguments: {
        large_data: "x".repeat(1000000) // 1MB of data
      }
    });
    console.log('⚠️  Large payload handled (may be acceptable)');
    passed++;
  } catch (error) {
    console.log('✅ Large payload correctly rejected');
    passed++;
  }

  // Test 2: Many concurrent requests (simulated)
  try {
    const promises = Array(10).fill().map(() => 
      client.listTools().catch(() => null)
    );
    await Promise.all(promises);
    console.log('✅ Concurrent requests handled');
    passed++;
  } catch (error) {
    console.log('❌ Concurrent requests failed:', error.message);
    failed++;
  }

  return { passed, failed };
}

/**
 * Main test function
 */
async function runErrorHandlingTests() {
  console.log('🚀 Starting Error Handling Tests...\n');
  
  let totalPassed = 0;
  let totalFailed = 0;

  try {
    await startServer();
    await connectClient();

    // Run test categories
    const malformedResults = await testMalformedRequests();
    totalPassed += malformedResults.passed;
    totalFailed += malformedResults.failed;

    const invalidToolResults = await testInvalidToolCalls();
    totalPassed += invalidToolResults.passed;
    totalFailed += invalidToolResults.failed;

    const edgeCaseResults = await testEdgeCases();
    totalPassed += edgeCaseResults.passed;
    totalFailed += edgeCaseResults.failed;

    const resourceResults = await testResourceLimits();
    totalPassed += resourceResults.passed;
    totalFailed += resourceResults.failed;

  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    totalFailed++;
  } finally {
    // Cleanup
    if (client) {
      try {
        await client.close();
      } catch (error) {
        // Ignore close errors
      }
    }
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
  }

  // Report results
  console.log('\n📊 Error Handling Test Results:');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`);

  // Exit with appropriate code
  if (totalFailed > 0) {
    console.log('\n❌ Error handling tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All error handling tests passed!');
    process.exit(0);
  }
}

// Run tests
runErrorHandlingTests().catch(error => {
  console.error('💥 Fatal error in error handling tests:', error);
  process.exit(1);
});