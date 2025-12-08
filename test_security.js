
/**
 * Test 3: Malformed JSON-RPC requests
 */
async function testMalformedRequests() {
  console.log('\n🧪 Test 3: Malformed JSON-RPC Requests');
  console.log('='.repeat(50));
  
  const server = await startSecurityTestServer();
  
  try {
    const malformedRequests = [
      // Invalid JSON
      '{"invalid": "json", missing: "quotes"}\n',
      'not json at all\n',
      '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"\n', // Missing closing brace
      
      // Missing required fields
      '{"jsonrpc": "2.0", "id": 1}\n', // No method
      '{"jsonrpc": "2.0", "method": "tools/list"}\n', // No id
      '{"id": 1, "method": "tools/list"}\n', // No jsonrpc
      
      // Wrong data types
      '{"jsonrpc": 2.0, "id": "1", "method": "tools/list"}\n', // jsonrpc as number
      '{"jsonrpc": "2.0", "id": [1], "method": "tools/list"}\n', // id as array
      '{"jsonrpc": "2.0", "id": 1, "method": ["tools", "list"]}\n', // method as array
      
      // Extremely large values
      `{"jsonrpc": "2.0", "id": 1, "method": "${'a'.repeat(10000)}"}\n`, // Huge method name
      `{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {"data": "${'x'.repeat(50000)}"}}\n`, // Huge params
      
      // Deeply nested objects
      '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {"a": {"b": {"c": {"d": {"e": "f"}}}}} }\n',
    ];
    
    let handledCount = 0;
    
    for (const request of malformedRequests) {
      try {
        // Send raw malformed request
        server.stdin.write(request);
        
        // Give server time to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // If server is still running, it handled the request
        if (server.exitCode === null) {
          console.log(`   ✅ Malformed request - HANDLED WITHOUT CRASH`);
          handledCount++;
        } else {
          console.log(`   ❌ Malformed request - SERVER CRASHED`);
        }
      } catch (error) {
        console.log(`   ⚠️  Malformed request - ERROR: ${error.message}`);
      }
    }
    
    const successRate = handledCount / malformedRequests.length;
    
    if (successRate >= 0.8) { // 80% success rate
      console.log(`✅ SUCCESS: Malformed requests handled (${handledCount}/${malformedRequests.length})`);
      return true;
    } else {
      console.log(`❌ FAILURE: Malformed request handling insufficient (${handledCount}/${malformedRequests.length})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ FAILURE: ${error.message}`);
    return false;
  } finally {
    server.kill();
  }
}

/**
 * Test 4: Resource exhaustion attacks
 */
async function testResourceExhaustion() {
  console.log('\n🧪 Test 4: Resource Exhaustion Attacks');
  console.log('='.repeat(50));
  
  const server = await startSecurityTestServer();
  const startTime = Date.now();
  
  try {
    const rapidRequests = 100;
    let completedRequests = 0;
    let errors = 0;
    
    // Send rapid fire requests
    for (let i = 0; i < rapidRequests; i++) {
      const request = {
        jsonrpc: '2.0',
        id: `rapid-${i}`,
        method: 'tools/list',
        params: {}
      };
      
      try {
        await sendMCPRequest(server, request);
        completedRequests++;
      } catch (error) {
        errors++;
        // Some errors are expected under heavy load
      }
      
      // Small delay to avoid overwhelming the system too quickly
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    const duration = Date.now() - startTime;
    const successRate = completedRequests / rapidRequests;
    
    console.log(`   Completed: ${completedRequests}/${rapidRequests} requests`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Success rate: ${(successRate * 100).toFixed(1)}%`);
    
    // Check if server is still responsive
    const finalRequest = {
      jsonrpc: '2.0',
      id: 'final-check',
      method: 'tools/list',
      params: {}
    };
    
    try {
      const finalResponse = await sendMCPRequest(server, finalRequest);
      if (finalResponse.result && finalResponse.result.tools) {
        console.log('   Server remains responsive after load');
        
        if (successRate >= 0.7) { // 70% success rate under load
          console.log('✅ SUCCESS: Resource exhaustion handled reasonably');
          return true;
        } else {
          console.log('❌ FAILURE: Resource exhaustion protection insufficient');
          return false;
        }
      } else {
        console.log('❌ FAILURE: Server unresponsive after load');
        return false;
      }
    } catch (error) {
      console.log(`❌ FAILURE: Server crashed under load: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ FAILURE: ${error.message}`);
    return false;
  } finally {
    server.kill();
  }
}

/**
 * Test 5: Skill validation and sanitization
 */
async function testSkillValidation() {
  console.log('\n🧪 Test 5: Skill Validation and Sanitization');
  console.log('='.repeat(50));
  
  ensureSecurityTestDir();
  
  // Test various invalid skill configurations
  const invalidSkills = [
    {
      name: 'skill-with-../',
      description: 'Skill with path traversal in name',
      shouldBeRejected: true
    },
    {
      name: 'skill with spaces',
      description: 'Skill with spaces in name',
      shouldBeRejected: false // This might be acceptable
    },
    {
      name: 'skill/with/slashes',
      description: 'Skill with slashes in name', 
      shouldBeRejected: true
    },
    {
      name: '',
      description: 'Empty skill name',
      shouldBeRejected: true
    },
    {
      name: 'valid-skill',
      description: '', // Empty description
      shouldBeRejected: false // This might be acceptable
    }
  ];
  
  let validationCount = 0;
  
  for (const skill of invalidSkills) {
    const skillDir = path.join(SECURITY_TEST_DIR, skill.name);
    
    try {
      if (!fs.existsSync(skillDir)) {
        fs.mkdirSync(skillDir, { recursive: true });
      }
      
      const skillContent = `---
name: ${skill.name}
description: ${skill.description}
---

# Test Skill
`;
      
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);
      
      // Start server and check if skill is loaded
      const server = await startSecurityTestServer();
      
      try {
        const request = {
          jsonrpc: '2.0',
          id: `validation-${skill.name}`,
          method: 'tools/list',
          params: {}
        };
        
        const response = await sendMCPRequest(server, request);
        const skillNames = response.result.tools.map(tool => tool.name);
        
        const skillLoaded = skillNames.includes(skill.name);
        
        if (skill.shouldBeRejected && !skillLoaded) {
          console.log(`   ✅ "${skill.name}" - CORRECTLY REJECTED`);
          validationCount++;
        } else if (!skill.shouldBeRejected && skillLoaded) {
          console.log(`   ✅ "${skill.name}" - CORRECTLY ACCEPTED`);
          validationCount++;
        } else if (skill.shouldBeRejected && skillLoaded) {
          console.log(`   ❌ "${skill.name}" - INCORRECTLY ACCEPTED`);
        } else {
          console.log(`   ❌ "${skill.name}" - INCORRECTLY REJECTED`);
        }
        
        server.kill();
      } catch (error) {
        console.log(`   ⚠️  "${skill.name}" - TEST ERROR: ${error.message}`);
        server.kill();
      }
      
      // Clean up test skill
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.log(`   ⚠️  "${skill.name}" - SETUP ERROR: ${error.message}`);
    }
  }
  
  const successRate = validationCount / invalidSkills.length;
  
  if (successRate >= 0.7) { // 70% success rate
    console.log(`✅ SUCCESS: Skill validation working (${validationCount}/${invalidSkills.length})`);
    return true;
  } else {
    console.log(`❌ FAILURE: Skill validation insufficient (${validationCount}/${invalidSkills.length})`);
    return false;
  }
}

/**
 * Run all security tests
 */
async function runSecurityTests() {
  console.log('🛡️ Security Test Suite');
  console.log('='.repeat(50));
  
  // Clean up test directory before starting
  if (fs.existsSync(SECURITY_TEST_DIR)) {
    fs.rmSync(SECURITY_TEST_DIR, { recursive: true, force: true });
  }
  
  const results = {
    pathTraversal: await testPathTraversal(),
    injectionAttacks: await testInjectionAttacks(),
    malformedRequests: await testMalformedRequests(),
    resourceExhaustion: await testResourceExhaustion(),
    skillValidation: await testSkillValidation()
  };
  
  console.log('\n🎉 Security Test Results:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  // Clean up test directory
  if (fs.existsSync(SECURITY_TEST_DIR)) {
    fs.rmSync(SECURITY_TEST_DIR, { recursive: true, force: true });
  }
  
  // Save results
  const testResults = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalTests: Object.keys(results).length,
      passed: Object.values(results).filter(Boolean).length,
      failed: Object.values(results).filter(r => !r).length
    }
  };
  
  fs.writeFileSync('security-results.json', JSON.stringify(testResults, null, 2));
  
  console.log(`\n📊 Summary: ${testResults.summary.passed}/${testResults.summary.totalTests} tests passed`);
  console.log(`📁 Results saved to: security-results.json`);
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSecurityTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Security test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runSecurityTests
};