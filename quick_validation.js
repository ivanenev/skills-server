#!/usr/bin/env node

/**
 * Quick Validation Script for Publishing
 * Runs essential tests to verify the skills server is working correctly
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function runQuickValidation() {
  console.log("🚀 Running Quick Validation for Publishing...");
  console.log("⏰ Timeout: 30 seconds per test\n");

  const essentialTests = [
    'test_skills_integration.js',
    'test_environment_variables.js', 
    'test_error_handling.js',
    'test_tool_execution.js'
  ];

  let passed = 0;
  let failed = 0;

  for (const testFile of essentialTests) {
    console.log(`🧪 Running: ${testFile}`);
    
    try {
      const result = await runTestWithTimeout(testFile, 30000);
      if (result.success) {
        console.log(`✅ ${testFile}: PASSED\n`);
        passed++;
      } else {
        console.log(`❌ ${testFile}: FAILED - ${result.error}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testFile}: ERROR - ${error.message}\n`);
      failed++;
    }
  }

  console.log("📊 Validation Summary:");
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / essentialTests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log("\n🎉 All essential tests passed! Ready for publishing.");
    console.log("💡 Additional tests available:");
    console.log("   - test_runner.js (comprehensive test suite)");
    console.log("   - test-comparison.js (performance benchmarks)");
    console.log("   - test_security.js (security validation)");
    process.exit(0);
  } else {
    console.log("\n⚠️ Some tests failed. Please fix issues before publishing.");
    process.exit(1);
  }
}

function runTestWithTimeout(testFile, timeoutMs) {
  return new Promise((resolve) => {
    const testProcess = spawn('node', [testFile], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timeoutId;

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        resolve({ 
          success: false, 
          error: `Exit code ${code}`,
          stdout,
          stderr
        });
      }
    });

    timeoutId = setTimeout(() => {
      testProcess.kill('SIGTERM');
      resolve({ 
        success: false, 
        error: `Timeout after ${timeoutMs}ms`,
        stdout,
        stderr
      });
    }, timeoutMs);
  });
}

// Check if essential test files exist
function validateTestFiles() {
  const requiredFiles = [
    'test_skills_integration.js',
    'test_environment_variables.js',
    'test_error_handling.js',
    'test_tool_execution.js'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.log("❌ Missing required test files:");
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }
  
  return true;
}

// Main execution
if (validateTestFiles()) {
  runQuickValidation().catch(error => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
} else {
  process.exit(1);
}