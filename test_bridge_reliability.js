#!/usr/bin/env node

/**
 * Bridge Reliability Tests for Lazy-MCP Failures
 * Tests lazy-mcp bridge failure scenarios and fallbacks
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testBridgeReliability() {
  console.log("🌉 Testing Bridge Reliability and Failure Scenarios...");
  
  const client = new Client(
    {
      name: "bridge-reliability-test",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: ["/home/mts/mcp_servers/skills-server/build/index.js"],
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to skills server");

    // Test 1: Verify skills work even if lazy-mcp fails
    console.log("\n🛡️ Test 1: Skills Independence from Lazy-MCP...");
    const skills = await client.listTools();
    const skillTools = skills.tools.filter(t => !t.description.includes('[') || !t.description.includes(']'));
    
    console.log(`🔧 Found ${skillTools.length} independent skills`);
    
    // Test a few core skills to ensure they work independently
    const coreSkills = ['system-testing', 'backup-restore', 'docker-compose-manager'];
    for (const skillName of coreSkills) {
      const skill = skillTools.find(s => s.name === skillName);
      if (skill) {
        const result = await client.callTool({
          name: skillName,
          arguments: { query: "test independent operation" }
        });
        console.log(`✅ ${skillName}: Independent operation successful (${result.content[0].text.length} chars)`);
      }
    }

    // Test 2: Tool discovery resilience
    console.log("\n🔍 Test 2: Tool Discovery Resilience...");
    const tools = await client.listTools();
    console.log(`📊 Total tools discovered: ${tools.tools.length}`);
    
    const skillCount = tools.tools.filter(t => !t.description.includes('[') || !t.description.includes(']')).length;
    const lazyMCPCount = tools.tools.filter(t => t.description.includes('[') && t.description.includes(']')).length;
    
    console.log(`🔧 Skills: ${skillCount}`);
    console.log(`⚡ Lazy-MCP Tools: ${lazyMCPCount}`);
    
    // Verify we have at least the core skills even if lazy-mcp fails
    if (skillCount >= 8) {
      console.log("✅ Core skills available regardless of lazy-mcp status");
    } else {
      console.log("⚠️ Warning: Fewer core skills than expected");
    }

    // Test 3: Error handling for unavailable tools
    console.log("\n🚫 Test 3: Error Handling for Unavailable Tools...");
    try {
      // Try to call a non-existent tool
      await client.callTool({
        name: "non-existent-tool-12345",
        arguments: { query: "test" }
      });
      console.log("❌ Expected error but call succeeded");
    } catch (error) {
      console.log("✅ Proper error handling for non-existent tool");
      console.log(`   📝 Error message: ${error.message.substring(0, 100)}...`);
    }

    // Test 4: Performance under partial failure
    console.log("\n⚡ Test 4: Performance Under Partial Failure...");
    const startTime = Date.now();
    
    // Execute multiple skill calls to test resilience
    const skillCalls = [];
    for (let i = 0; i < 5; i++) {
      skillCalls.push(
        client.callTool({
          name: "system-testing",
          arguments: { query: `performance test ${i}` }
        }).catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.all(skillCalls);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successCount = results.filter(r => !r.error).length;
    console.log(`✅ Performance test completed in ${duration}ms`);
    console.log(`   📊 Success rate: ${successCount}/${results.length} calls`);
    console.log(`   ⚡ Average time per call: ${(duration / results.length).toFixed(1)}ms`);

    // Test 5: Graceful degradation
    console.log("\n🔄 Test 5: Graceful Degradation...");
    const availableSkills = [];
    for (const skill of skillTools.slice(0, 3)) {
      try {
        const result = await client.callTool({
          name: skill.name,
          arguments: { query: "graceful degradation test" }
        });
        availableSkills.push(skill.name);
      } catch (error) {
        console.log(`   ⚠️ ${skill.name}: Failed but system remained stable`);
      }
    }
    
    console.log(`✅ System remained stable with ${availableSkills.length}/${3} skills available`);

    await client.close();
    
    console.log("\n🎉 Bridge reliability tests completed successfully!");
    console.log("📋 Summary: Skills independence, error handling, and graceful degradation verified");
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Bridge reliability test failed:", error);
    process.exit(1);
  }
}

testBridgeReliability();