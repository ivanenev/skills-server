#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Skills Server
 * Executes all tests sequentially with timeout handling and generates reports
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds per test
const TEST_FILES = [
  'test_skills_integration.js',
  'test_skills_content.js', 
  'test-comparison.js',
  'test_environment_variables.js',
  'test_error_handling.js',
  'test_concurrency.js',
  'test_memory_leaks.js',
  'test_hot_reload.js',
  'test_security.js',
  'test_tool_execution.js',
  'test_content_delivery.js',
  'test_bridge_reliability.js',
  'test_tool_discovery.js'
];

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  timedOut: 0,
  startTime: Date.now(),
  tests: []
};

/**
 * Run a single test with timeout handling
 */
function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running: ${testFile}`);
    
    const testProcess = spawn('node', [testFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TEST_TIMEOUT
    });

    let output = '';
    let errorOutput = '';
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      testProcess.kill('SIGTERM');
      console.log(`⏰ ${testFile} timed out after ${TEST_TIMEOUT}ms`);
    }, TEST_TIMEOUT);

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      
      const result = {
        testFile,
        passed: code === 0 && !timedOut,
        timedOut,
        exitCode: code,
        output: output.trim(),
        errorOutput: errorOutput.trim(),
        duration: Date.now() - testResults.startTime
      };

      testResults.tests.push(result);
      testResults.total++;
      
      if (timedOut) {
        testResults.timedOut++;
        console.log(`❌ ${testFile} - TIMEOUT`);
      } else if (code === 0) {
        testResults.passed++;
        console.log(`✅ ${testFile} - PASSED`);
      } else {
        testResults.failed++;
        console.log(`❌ ${testFile} - FAILED (code: ${code})`);
      }

      resolve(result);
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeoutId);
      console.log(`💥 ${testFile} - ERROR: ${error.message}`);
      
      const result = {
        testFile,
        passed: false,
        timedOut: false,
        exitCode: -1,
        output: '',
        errorOutput: error.message,
        duration: Date.now() - testResults.startTime
      };
      
      testResults.tests.push(result);
      testResults.total++;
      testResults.failed++;
      resolve(result);
    });
  });
}

/**
 * Generate comprehensive test report
 */
function generateReport() {
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      timedOut: testResults.timedOut,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(2),
      totalDuration: Date.now() - testResults.startTime
    },
    details: testResults.tests.map(test => ({
      testFile: test.testFile,
      status: test.timedOut ? 'TIMEOUT' : (test.passed ? 'PASSED' : 'FAILED'),
      exitCode: test.exitCode,
      duration: test.duration,
      output: test.output.substring(0, 500) + (test.output.length > 500 ? '...' : ''),
      errorOutput: test.errorOutput.substring(0, 500) + (test.errorOutput.length > 500 ? '...' : '')
    }))
  };

  // Write JSON report
  fs.writeFileSync('test-runner-report.json', JSON.stringify(report, null, 2));
  
  // Write human-readable report
  const humanReport = `
📊 COMPREHENSIVE TEST RUNNER REPORT
===================================

Summary:
--------
Total Tests: ${report.summary.total}
✅ Passed: ${report.summary.passed}
❌ Failed: ${report.summary.failed}
⏰ Timed Out: ${report.summary.timedOut}
📈 Success Rate: ${report.summary.successRate}%
⏱️ Total Duration: ${report.summary.totalDuration}ms

Test Details:
------------
${report.details.map(test => `
${test.testFile}
  Status: ${test.status}
  Exit Code: ${test.exitCode}
  Duration: ${test.duration}ms
  ${test.errorOutput ? `Error: ${test.errorOutput}` : 'No errors'}
`).join('')}

Generated: ${new Date().toISOString()}
  `.trim();

  fs.writeFileSync('test-runner-report.txt', humanReport);
  console.log('\n' + humanReport);
}

/**
 * Main test runner function
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Test Runner...');
  console.log(`⏰ Timeout per test: ${TEST_TIMEOUT}ms`);
  console.log(`📁 Total test files: ${TEST_FILES.length}`);
  
  // Filter to only existing test files
  const existingTests = TEST_FILES.filter(testFile => fs.existsSync(testFile));
  console.log(`📋 Existing test files: ${existingTests.length}`);
  
  if (existingTests.length === 0) {
    console.log('❌ No test files found!');
    process.exit(1);
  }

  // Run tests sequentially
  for (const testFile of existingTests) {
    await runTest(testFile);
  }

  // Generate reports
  generateReport();

  // Exit with appropriate code
  if (testResults.failed > 0 || testResults.timedOut > 0) {
    console.log(`\n❌ Test run completed with ${testResults.failed} failures and ${testResults.timedOut} timeouts`);
    process.exit(1);
  } else {
    console.log(`\n✅ All tests passed!`);
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test runner interrupted by user');
  generateReport();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test runner terminated');
  generateReport();
  process.exit(1);
});

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test runner fatal error:', error);
  process.exit(1);
});