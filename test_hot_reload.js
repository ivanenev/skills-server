#!/usr/bin/env node

/**
 * Hot-Reload Testing for Skills Server
 * Tests dynamic skill loading, updates, and real-time changes
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Test configuration
const SKILLS_TEST_DIR = path.join(__dirname, 'test-skills');
const TEST_TIMEOUT = 30000; // 30 seconds

/**
 * Ensure test skills directory exists
 */
function ensureTestSkillsDir() {
  if (!fs.existsSync(SKILLS_TEST_DIR)) {
    fs.mkdirSync(SKILLS_TEST_DIR, { recursive: true });
  }
}

/**
 * Create a test skill
 */
function createTestSkill(name, description, content) {
  const skillDir = path.join(SKILLS_TEST_DIR, name);
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
  
  const skillContent = `---
name: ${name}
description: ${description}
---

# ${name}

${content}
`;
  
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);
  return skillDir;
}

/**
 * Update a test skill
 */
function updateTestSkill(name, newDescription, newContent) {
  const skillDir = path.join(SKILLS_TEST_DIR, name);
  const skillContent = `---
name: ${name}
description: ${newDescription}
---

# ${name} (Updated)

${newContent}
`;
  
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);
}

/**
 * Delete a test skill
 */
function deleteTestSkill(name) {
  const skillDir = path.join(SKILLS_TEST_DIR, name);
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });
  }
}

/**
 * Start skills server with test directory
 */
function startSkillsServerWithTestDir() {
  const envVars = {
    ...process.env,
    SKILLS_DIR: SKILLS_TEST_DIR,
    LAZY_MCP_ENABLED: 'false' // Disable lazy-mcp for focused testing
  };
  
  const server = spawn('node', ['build/index.js'], {
    env: envVars,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);
    
    let serverReady = false;
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output.trim()}`);
      
      if (output.includes('Enhanced Skills MCP server running on stdio')) {
        clearTimeout(timeout);
        serverReady = true;
        resolve(server);
      }
    });
    
    server.on('error', reject);
    
    // Fallback: if we don't see the ready message but server is running
    setTimeout(() => {
      if (!serverReady && server.pid) {
        clearTimeout(timeout);
        console.log('Server started (fallback detection)');
        resolve(server);
      }
    }, 5000);
  });
}

/**
 * Send MCP request to server
 */
function sendMCPRequest(server, request) {
  return new Promise((resolve, reject) => {
    const requestStr = JSON.stringify(request) + '\n';
    
    // Set up response handler
    const responseHandler = (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === request.id) {
          server.stdout.removeListener('data', responseHandler);
          resolve(response);
        }
      } catch (error) {
        // Not JSON, ignore
      }
    };
    
    server.stdout.on('data', responseHandler);
    
    // Send request
    server.stdin.write(requestStr);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      server.stdout.removeListener('data', responseHandler);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

/**
 * Test 1: Initial skill loading
 */
async function testInitialSkillLoading() {
  console.log('\n🧪 Test 1: Initial Skill Loading');
  console.log('='.repeat(50));
  
  ensureTestSkillsDir();
  
  // Create initial test skills
  createTestSkill(
    'test-skill-1',
    'First test skill for hot-reload testing',
    'This is the initial content of test skill 1.'
  );
  
  createTestSkill(
    'test-skill-2', 
    'Second test skill for hot-reload testing',
    'This is the initial content of test skill 2.'
  );
  
  const server = await startSkillsServerWithTestDir();
  
  try {
    // Request tools list
    const listRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    const response = await sendMCPRequest(server, listRequest);
    
    if (response.result && response.result.tools) {
      const skillNames = response.result.tools.map(tool => tool.name);
      console.log(`   Loaded skills: ${skillNames.join(', ')}`);
      
      const hasTestSkills = skillNames.includes('test-skill-1') && skillNames.includes('test-skill-2');
      
      if (hasTestSkills) {
        console.log('✅ SUCCESS: Initial skills loaded correctly');
        return true;
      } else {
        console.log('❌ FAILURE: Test skills not found in initial load');
        return false;
      }
    } else {
      console.log('❌ FAILURE: No tools returned from server');
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
 * Test 2: Skill content updates
 */
async function testSkillContentUpdates() {
  console.log('\n🧪 Test 2: Skill Content Updates');
  console.log('='.repeat(50));
  
  const server = await startSkillsServerWithTestDir();
  
  try {
    // Get initial skill content
    const initialRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'test-skill-1',
        arguments: {}
      }
    };
    
    const initialResponse = await sendMCPRequest(server, initialRequest);
    const initialContent = initialResponse.result.content[0].text;
    
    console.log('   Initial content retrieved');
    
    // Update the skill
    console.log('   Updating skill content...');
    updateTestSkill(
      'test-skill-1',
      'Updated test skill for hot-reload testing',
      'This is the UPDATED content of test skill 1 with new information and improvements.'
    );
    
    // Wait for cache to expire (skills cache is 5 seconds)
    console.log('   Waiting for cache expiration (6 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Get updated skill content
    const updatedRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'test-skill-1',
        arguments: {}
      }
    };
    
    const updatedResponse = await sendMCPRequest(server, updatedRequest);
    const updatedContent = updatedResponse.result.content[0].text;
    
    console.log('   Updated content retrieved');
    
    // Check if content was updated
    if (updatedContent.includes('UPDATED') && updatedContent !== initialContent) {
      console.log('✅ SUCCESS: Skill content updated correctly');
      return true;
    } else {
      console.log('❌ FAILURE: Skill content not updated');
      console.log(`   Initial: ${initialContent.substring(0, 50)}...`);
      console.log(`   Updated: ${updatedContent.substring(0, 50)}...`);
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
 * Test 3: New skill addition
 */
async function testNewSkillAddition() {
  console.log('\n🧪 Test 3: New Skill Addition');
  console.log('='.repeat(50));
  
  const server = await startSkillsServerWithTestDir();
  
  try {
    // Get initial tools list
    const initialListRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/list',
      params: {}
    };
    
    const initialResponse = await sendMCPRequest(server, initialListRequest);
    const initialSkills = initialResponse.result.tools.map(tool => tool.name);
    
    console.log(`   Initial skills: ${initialSkills.join(', ')}`);
    
    // Add a new skill
    console.log('   Adding new skill...');
    createTestSkill(
      'test-skill-3',
      'Third test skill added dynamically',
      'This skill was added after server startup to test dynamic loading.'
    );
    
    // Wait for cache to expire
    console.log('   Waiting for cache expiration (6 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Get updated tools list
    const updatedListRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/list',
      params: {}
    };
    
    const updatedResponse = await sendMCPRequest(server, updatedListRequest);
    const updatedSkills = updatedResponse.result.tools.map(tool => tool.name);
    
    console.log(`   Updated skills: ${updatedSkills.join(', ')}`);
    
    // Check if new skill was added
    if (updatedSkills.includes('test-skill-3') && !initialSkills.includes('test-skill-3')) {
      console.log('✅ SUCCESS: New skill added dynamically');
      return true;
    } else {
      console.log('❌ FAILURE: New skill not detected');
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
 * Test 4: Skill removal
 */
async function testSkillRemoval() {
  console.log('\n🧪 Test 4: Skill Removal');
  console.log('='.repeat(50));
  
  const server = await startSkillsServerWithTestDir();
  
  try {
    // Get initial tools list
    const initialListRequest = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/list',
      params: {}
    };
    
    const initialResponse = await sendMCPRequest(server, initialListRequest);
    const initialSkills = initialResponse.result.tools.map(tool => tool.name);
    
    console.log(`   Initial skills: ${initialSkills.join(', ')}`);
    
    // Remove a skill
    console.log('   Removing test-skill-2...');
    deleteTestSkill('test-skill-2');
    
    // Wait for cache to expire
    console.log('   Waiting for cache expiration (6 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Get updated tools list
    const updatedListRequest = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/list',
      params: {}
    };
    
    const updatedResponse = await sendMCPRequest(server, updatedListRequest);
    const updatedSkills = updatedResponse.result.tools.map(tool => tool.name);
    
    console.log(`   Updated skills: ${updatedSkills.join(', ')}`);
    
    // Check if skill was removed
    if (!updatedSkills.includes('test-skill-2') && initialSkills.includes('test-skill-2')) {
      console.log('✅ SUCCESS: Skill removed correctly');
      return true;
    } else {
      console.log('❌ FAILURE: Skill not removed');
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
 * Test 5: Multiple rapid changes
 */
async function testMultipleRapidChanges() {
  console.log('\n🧪 Test 5: Multiple Rapid Changes');
  console.log('='.repeat(50));
  
  const server = await startSkillsServerWithTestDir();
  const startTime = performance.now();
  
  try {
    let successCount = 0;
    const changeCount = 5;
    
    for (let i = 0; i < changeCount; i++) {
      const skillName = `rapid-skill-${i}`;
      
      // Add skill
      createTestSkill(
        skillName,
        `Rapid change test skill ${i}`,
        `Content for rapid change test ${i}`
      );
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update skill
      updateTestSkill(
        skillName,
        `Updated rapid change test skill ${i}`,
        `UPDATED content for rapid change test ${i}`
      );
      
      // Verify update worked
      const verifyRequest = {
        jsonrpc: '2.0',
        id: 8 + i,
        method: 'tools/call',
        params: {
          name: skillName,
          arguments: {}
        }
      };
      
      try {
        const response = await sendMCPRequest(server, verifyRequest);
        const content = response.result.content[0].text;
        
        if (content.includes('UPDATED')) {
          successCount++;
          console.log(`   Change ${i + 1}/${changeCount}: ✅`);
        } else {
          console.log(`   Change ${i + 1}/${changeCount}: ❌`);
        }
      } catch (error) {
        console.log(`   Change ${i + 1}/${changeCount}: ❌ (${error.message})`);
      }
      
      // Clean up
      deleteTestSkill(skillName);
    }
    
    const successRate = successCount / changeCount;
    const duration = performance.now() - startTime;
    
    console.log(`   Success rate: ${successCount}/${changeCount} (${(successRate * 100).toFixed(1)}%)`);
    console.log(`   Total duration: ${(duration / 1000).toFixed(2)} seconds`);
    
    if (successRate >= 0.8) { // 80% success rate
      console.log('✅ SUCCESS: Multiple rapid changes handled well');
      return true;
    } else {
      console.log('❌ FAILURE: Multiple rapid changes problematic');
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
 * Run all hot-reload tests
 */
async function runHotReloadTests() {
  console.log('🔄 Hot-Reload Test Suite');
  console.log('='.repeat(50));
  
  // Clean up test directory before starting
  if (fs.existsSync(SKILLS_TEST_DIR)) {
    fs.rmSync(SKILLS_TEST_DIR, { recursive: true, force: true });
  }
  
  const results = {
    initialLoading: await testInitialSkillLoading(),
    contentUpdates: await testSkillContentUpdates(),
    newSkillAddition: await testNewSkillAddition(),
    skillRemoval: await testSkillRemoval(),
    rapidChanges: await testMultipleRapidChanges()
  };
  
  console.log('\n🎉 Hot-Reload Test Results:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  // Clean up test directory
  if (fs.existsSync(SKILLS_TEST_DIR)) {
    fs.rmSync(SKILLS_TEST_DIR, { recursive: true, force: true });
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
  
  fs.writeFileSync('hot-reload-results.json', JSON.stringify(testResults, null, 2));
  
  console.log(`\n📊 Summary: ${testResults.summary.passed}/${testResults.summary.totalTests} tests passed`);
  console.log(`📁 Results saved to: hot-reload-results.json`);
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runHotReloadTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Hot-reload test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runHotReloadTests
};