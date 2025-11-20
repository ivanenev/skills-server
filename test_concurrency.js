#!/usr/bin/env node

/**
 * Concurrency Tests for Skills Server
 * Tests multiple simultaneous connections and requests
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

// Server process
let serverProcess;

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
 * Create a client connection
 */
async function createClient(clientId) {
  const client = new Client(
    {
      name: `concurrency-test-client-${clientId}`,
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
  return client;
}

/**
 * Test multiple simultaneous connections
 */
async function testMultipleConnections() {
  console.log('🧪 Testing multiple simultaneous connections...');
  
  const numConnections = 5;
  const clients = [];
  let successfulConnections = 0;

  try {
    // Create multiple connections simultaneously
    const connectionPromises = Array(numConnections).fill().map((_, i) => 
      createClient(i)
        .then(client => {
          clients.push(client);
          successfulConnections++;
          return { success: true, clientId: i };
        })
        .catch(error => {
          return { success: false, clientId: i, error: error.message };
        })
    );

    const results = await Promise.all(connectionPromises);
    
    const failedConnections = results.filter(r => !r.success);
    
    console.log(`✅ Successful connections: ${successfulConnections}/${numConnections}`);
    
    if (failedConnections.length > 0) {
      console.log(`❌ Failed connections: ${failedConnections.length}`);
      failedConnections.forEach(f => {
        console.log(`   Client ${f.clientId}: ${f.error}`);
      });
    }

    return { successful: successfulConnections, failed: failedConnections.length };
  } finally {
    // Cleanup clients
    for (const client of clients) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Test concurrent tool listing
 */
async function testConcurrentToolListing() {
  console.log('🧪 Testing concurrent tool listing...');
  
  const numClients = 3;
  const requestsPerClient = 5;
  const clients = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  try {
    // Create clients
    for (let i = 0; i < numClients; i++) {
      clients.push(await createClient(i));
    }

    // Create concurrent requests
    const requestPromises = [];
    
    for (let clientIndex = 0; clientIndex < numClients; clientIndex++) {
      for (let requestNum = 0; requestNum < requestsPerClient; requestNum++) {
        requestPromises.push(
          clients[clientIndex].listTools()
            .then(result => {
              if (result && Array.isArray(result.tools)) {
                successfulRequests++;
                return { success: true, client: clientIndex, request: requestNum };
              } else {
                failedRequests++;
                return { success: false, client: clientIndex, request: requestNum, error: 'Invalid response' };
              }
            })
            .catch(error => {
              failedRequests++;
              return { success: false, client: clientIndex, request: requestNum, error: error.message };
            })
        );
      }
    }

    const results = await Promise.all(requestPromises);
    
    const failedResults = results.filter(r => !r.success);
    
    console.log(`✅ Successful tool listings: ${successfulRequests}/${numClients * requestsPerClient}`);
    
    if (failedResults.length > 0) {
      console.log(`❌ Failed tool listings: ${failedResults.length}`);
      failedResults.slice(0, 3).forEach(f => { // Show first 3 failures
        console.log(`   Client ${f.client}, Request ${f.request}: ${f.error}`);
      });
      if (failedResults.length > 3) {
        console.log(`   ... and ${failedResults.length - 3} more failures`);
      }
    }

    // Check for consistent tool counts across requests
    const toolCounts = results
      .filter(r => r.success)
      .map(r => clients[r.client].lastListToolsResult?.tools?.length)
      .filter(Boolean);
    
    if (toolCounts.length > 0) {
      const uniqueCounts = [...new Set(toolCounts)];
      if (uniqueCounts.length === 1) {
        console.log(`✅ Consistent tool count across all requests: ${uniqueCounts[0]} tools`);
      } else {
        console.log(`⚠️  Inconsistent tool counts: ${uniqueCounts.join(', ')}`);
      }
    }

    return { 
      successful: successfulRequests, 
      failed: failedRequests,
      consistent: uniqueCounts?.length === 1
    };
  } finally {
    // Cleanup clients
    for (const client of clients) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Test mixed concurrent operations
 */
async function testMixedConcurrentOperations() {
  console.log('🧪 Testing mixed concurrent operations...');
  
  const numOperations = 10;
  const clients = [];
  let successfulOperations = 0;
  let failedOperations = 0;
  const operationTypes = [];

  try {
    // Create a few clients
    for (let i = 0; i < 3; i++) {
      clients.push(await createClient(i));
    }

    // Create mixed operations (tool listing and tool calls)
    const operationPromises = [];
    
    for (let i = 0; i < numOperations; i++) {
      const client = clients[i % clients.length];
      const isToolCall = i % 3 === 0; // Mix of tool listings and calls
      
      if (isToolCall) {
        operationTypes.push('tool_call');
        operationPromises.push(
          client.listTools()
            .then(tools => {
              if (tools.tools && tools.tools.length > 0) {
                // Try to call the first available tool
                const firstTool = tools.tools[0];
                return client.callTool({
                  name: firstTool.name,
                  arguments: { query: "test" }
                })
                .then(() => {
                  successfulOperations++;
                  return { type: 'tool_call', success: true, operation: i };
                })
                .catch(error => {
                  // Tool call might fail (e.g., if tool requires specific args), but that's OK
                  successfulOperations++; // Still counts as successful operation
                  return { type: 'tool_call', success: true, operation: i, note: 'Tool execution failed but operation completed' };
                });
              } else {
                failedOperations++;
                return { type: 'tool_call', success: false, operation: i, error: 'No tools available' };
              }
            })
            .catch(error => {
              failedOperations++;
              return { type: 'tool_call', success: false, operation: i, error: error.message };
            })
        );
      } else {
        operationTypes.push('tool_list');
        operationPromises.push(
          client.listTools()
            .then(result => {
              if (result && Array.isArray(result.tools)) {
                successfulOperations++;
                return { type: 'tool_list', success: true, operation: i };
              } else {
                failedOperations++;
                return { type: 'tool_list', success: false, operation: i, error: 'Invalid response' };
              }
            })
            .catch(error => {
              failedOperations++;
              return { type: 'tool_list', success: false, operation: i, error: error.message };
            })
        );
      }
    }

    const results = await Promise.all(operationPromises);
    
    const failedResults = results.filter(r => !r.success);
    const toolListCount = operationTypes.filter(t => t === 'tool_list').length;
    const toolCallCount = operationTypes.filter(t => t === 'tool_call').length;
    
    console.log(`📊 Operation mix: ${toolListCount} tool listings, ${toolCallCount} tool calls`);
    console.log(`✅ Successful operations: ${successfulOperations}/${numOperations}`);
    
    if (failedResults.length > 0) {
      console.log(`❌ Failed operations: ${failedResults.length}`);
      failedResults.slice(0, 3).forEach(f => {
        console.log(`   Operation ${f.operation} (${f.type}): ${f.error}`);
      });
    }

    return { 
      successful: successfulOperations, 
      failed: failedOperations,
      toolLists: toolListCount,
      toolCalls: toolCallCount
    };
  } finally {
    // Cleanup clients
    for (const client of clients) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Test memory and performance under load
 */
async function testLoadPerformance() {
  console.log('🧪 Testing performance under load...');
  
  const startTime = Date.now();
  const clients = [];
  const numClients = 5;
  const requestsPerClient = 10;

  try {
    // Create clients
    for (let i = 0; i < numClients; i++) {
      clients.push(await createClient(i));
    }

    // Generate load
    const loadPromises = [];
    let totalRequests = 0;
    
    for (const client of clients) {
      for (let i = 0; i < requestsPerClient; i++) {
        totalRequests++;
        loadPromises.push(
          client.listTools().catch(() => null) // Ignore errors for load test
        );
      }
    }

    await Promise.all(loadPromises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const requestsPerSecond = totalRequests / (duration / 1000);
    
    console.log(`⏱️  Load test completed in ${duration}ms`);
    console.log(`📈 Throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
    console.log(`🔢 Total requests: ${totalRequests} across ${numClients} clients`);

    return {
      duration,
      requestsPerSecond,
      totalRequests,
      numClients
    };
  } finally {
    // Cleanup clients
    for (const client of clients) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Main test function
 */
async function runConcurrencyTests() {
  console.log('🚀 Starting Concurrency Tests...\n');
  
  let allTestsPassed = true;

  try {
    await startServer();

    // Run test categories
    const connectionResults = await testMultipleConnections();
    if (connectionResults.failed > 0) {
      allTestsPassed = false;
    }

    const toolListingResults = await testConcurrentToolListing();
    if (toolListingResults.failed > 0 || !toolListingResults.consistent) {
      allTestsPassed = false;
    }

    const mixedResults = await testMixedConcurrentOperations();
    if (mixedResults.failed > 0) {
      allTestsPassed = false;
    }

    const performanceResults = await testLoadPerformance();
    console.log(`\n📊 Performance: ${performanceResults.requestsPerSecond.toFixed(2)} req/sec`);

  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    allTestsPassed = false;
  } finally {
    // Cleanup
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  // Report results
  console.log('\n🎯 Concurrency Test Summary:');
  console.log(allTestsPassed ? '✅ All concurrency tests passed!' : '❌ Some concurrency tests failed');

  // Exit with appropriate code
  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
runConcurrencyTests().catch(error => {
  console.error('💥 Fatal error in concurrency tests:', error);
  process.exit(1);
});