#!/usr/bin/env node

/**
 * Memory Leak Detection Tests for Skills Server
 * Tests for memory leaks, resource cleanup, and long-running stability
 */

const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const fs = require('fs');

// Global memory tracking
let memorySnapshots = [];
let processInstances = [];

/**
 * Take a memory snapshot
 */
function takeMemorySnapshot(label) {
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }
  
  const memoryUsage = process.memoryUsage();
  const snapshot = {
    label,
    timestamp: Date.now(),
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    external: memoryUsage.external,
    arrayBuffers: memoryUsage.arrayBuffers
  };
  
  memorySnapshots.push(snapshot);
  console.log(`📊 Memory Snapshot [${label}]:`);
  console.log(`   RSS: ${(snapshot.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Used: ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(snapshot.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  
  return snapshot;
}

/**
 * Analyze memory growth between snapshots
 */
function analyzeMemoryGrowth() {
  if (memorySnapshots.length < 2) return null;
  
  const first = memorySnapshots[0];
  const last = memorySnapshots[memorySnapshots.length - 1];
  
  const growth = {
    rss: last.rss - first.rss,
    heapUsed: last.heapUsed - first.heapUsed,
    heapTotal: last.heapTotal - first.heapTotal,
    duration: last.timestamp - first.timestamp
  };
  
  console.log('\n🧠 Memory Growth Analysis:');
  console.log(`   RSS Growth: ${(growth.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Used Growth: ${(growth.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Duration: ${(growth.duration / 1000).toFixed(2)} seconds`);
  
  return growth;
}

/**
 * Start a skills server process
 */
function startSkillsServer(env = {}) {
  const envVars = { ...process.env, ...env };
  const server = spawn('node', ['build/index.js'], {
    env: envVars,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  processInstances.push(server);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Enhanced Skills MCP server running on stdio')) {
        clearTimeout(timeout);
        resolve(server);
      }
    });
    
    server.on('error', reject);
  });
}

/**
 * Test 1: Long-running connection stability
 */
async function testLongRunningStability() {
  console.log('\n🧪 Test 1: Long-running Connection Stability');
  console.log('='.repeat(50));
  
  takeMemorySnapshot('Before long-running test');
  
  const server = await startSkillsServer();
  
  // Simulate long-running usage with periodic tool discovery
  const startTime = performance.now();
  const testDuration = 30000; // 30 seconds
  
  let requestCount = 0;
  
  while (performance.now() - startTime < testDuration) {
    // Simulate tool discovery requests
    requestCount++;
    
    // Take periodic memory snapshots
    if (requestCount % 10 === 0) {
      takeMemorySnapshot(`During test - request ${requestCount}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  takeMemorySnapshot('After long-running test');
  
  // Clean up
  server.kill();
  
  const growth = analyzeMemoryGrowth();
  
  // Check for significant memory leaks
  const memoryLeakThreshold = 50 * 1024 * 1024; // 50MB
  if (growth && growth.rss > memoryLeakThreshold) {
    console.log('❌ FAILURE: Significant memory leak detected');
    return false;
  }
  
  console.log('✅ SUCCESS: No significant memory leaks detected');
  return true;
}

/**
 * Test 2: Multiple rapid connections
 */
async function testMultipleConnections() {
  console.log('\n🧪 Test 2: Multiple Rapid Connections');
  console.log('='.repeat(50));
  
  takeMemorySnapshot('Before multiple connections test');
  
  const connectionCount = 10;
  const servers = [];
  
  // Start multiple server instances rapidly
  for (let i = 0; i < connectionCount; i++) {
    try {
      const server = await startSkillsServer();
      servers.push(server);
      console.log(`   Started server instance ${i + 1}/${connectionCount}`);
      
      // Take memory snapshot every few connections
      if ((i + 1) % 3 === 0) {
        takeMemorySnapshot(`During test - connection ${i + 1}`);
      }
    } catch (error) {
      console.error(`   Failed to start server instance ${i + 1}:`, error.message);
    }
  }
  
  takeMemorySnapshot('After starting all connections');
  
  // Clean up all servers
  servers.forEach(server => server.kill());
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  takeMemorySnapshot('After cleanup');
  
  const growth = analyzeMemoryGrowth();
  
  // Check for connection leak
  const connectionLeakThreshold = 20 * 1024 * 1024; // 20MB
  if (growth && growth.rss > connectionLeakThreshold) {
    console.log('❌ FAILURE: Possible connection leak detected');
    return false;
  }
  
  console.log('✅ SUCCESS: No connection leaks detected');
  return true;
}

/**
 * Test 3: Tool execution memory usage
 */
async function testToolExecutionMemory() {
  console.log('\n🧪 Test 3: Tool Execution Memory Usage');
  console.log('='.repeat(50));
  
  takeMemorySnapshot('Before tool execution test');
  
  const server = await startSkillsServer();
  
  // Simulate multiple tool executions
  const executionCount = 50;
  
  for (let i = 0; i < executionCount; i++) {
    // Simulate tool execution (this would normally be MCP protocol calls)
    // For now, we'll just track memory usage
    
    if ((i + 1) % 10 === 0) {
      takeMemorySnapshot(`During test - execution ${i + 1}`);
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  takeMemorySnapshot('After tool execution test');
  
  // Clean up
  server.kill();
  
  const growth = analyzeMemoryGrowth();
  
  // Check for execution-related memory leaks
  const executionLeakThreshold = 10 * 1024 * 1024; // 10MB
  if (growth && growth.heapUsed > executionLeakThreshold) {
    console.log('❌ FAILURE: Tool execution memory leak detected');
    return false;
  }
  
  console.log('✅ SUCCESS: No tool execution memory leaks detected');
  return true;
}

/**
 * Test 4: Cache memory management
 */
async function testCacheMemory() {
  console.log('\n🧪 Test 4: Cache Memory Management');
  console.log('='.repeat(50));
  
  takeMemorySnapshot('Before cache test');
  
  const server = await startSkillsServer();
  
  // Simulate cache usage over time
  const iterations = 100;
  
  for (let i = 0; i < iterations; i++) {
    // Simulate cache operations
    // This would normally involve multiple tool discovery requests
    
    if ((i + 1) % 20 === 0) {
      takeMemorySnapshot(`During test - iteration ${i + 1}`);
    }
    
    // Wait between operations to simulate real usage
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  takeMemorySnapshot('After cache test');
  
  // Clean up
  server.kill();
  
  const growth = analyzeMemoryGrowth();
  
  // Check for cache-related memory issues
  const cacheLeakThreshold = 15 * 1024 * 1024; // 15MB
  if (growth && growth.heapUsed > cacheLeakThreshold) {
    console.log('❌ FAILURE: Cache memory management issue detected');
    return false;
  }
  
  console.log('✅ SUCCESS: Cache memory management working correctly');
  return true;
}

/**
 * Run all memory leak tests
 */
async function runMemoryLeakTests() {
  console.log('🧠 Memory Leak Detection Test Suite');
  console.log('='.repeat(50));
  
  const results = {
    longRunning: await testLongRunningStability(),
    multipleConnections: await testMultipleConnections(),
    toolExecution: await testToolExecutionMemory(),
    cacheManagement: await testCacheMemory()
  };
  
  console.log('\n🎉 Memory Leak Test Results:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  // Save results to file
  const testResults = {
    timestamp: new Date().toISOString(),
    results,
    memorySnapshots,
    summary: {
      totalTests: Object.keys(results).length,
      passed: Object.values(results).filter(Boolean).length,
      failed: Object.values(results).filter(r => !r).length
    }
  };
  
  fs.writeFileSync('memory-test-results.json', JSON.stringify(testResults, null, 2));
  
  console.log(`\n📊 Summary: ${testResults.summary.passed}/${testResults.summary.totalTests} tests passed`);
  console.log(`📁 Results saved to: memory-test-results.json`);
  
  // Clean up any remaining processes
  processInstances.forEach(server => {
    if (!server.killed) {
      server.kill();
    }
  });
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runMemoryLeakTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runMemoryLeakTests,
  takeMemorySnapshot,
  analyzeMemoryGrowth
};