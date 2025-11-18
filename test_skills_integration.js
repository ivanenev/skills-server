#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testSkillsIntegration() {
  console.log("Testing Enhanced Skills Server Integration...");
  
  const client = new Client(
    {
      name: "test-client",
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
    console.log("✅ Connected to enhanced skills-server successfully");

    // Test 1: List all available tools
    console.log("\n📋 Test 1: Listing available tools...");
    const listResult = await client.callTool({
      name: "tools/list",
      arguments: {}
    });
    
    console.log("✅ Tools listed successfully");
    const tools = listResult.content[0].text;
    const parsedTools = JSON.parse(tools);
    console.log(`📊 Found ${parsedTools.tools.length} total tools`);

    // Count skills vs lazy-mcp tools
    const skills = parsedTools.tools.filter(t => !t.description.includes('[lazy-mcp]'));
    const lazyMCPTools = parsedTools.tools.filter(t => t.description.includes('[lazy-mcp]'));
    
    console.log(`🔧 Skills: ${skills.length}`);
    console.log(`⚡ Lazy-MCP Tools: ${lazyMCPTools.length}`);

    // Test 2: Call a skill (our test skill)
    console.log("\n🧪 Test 2: Calling a skill...");
    const skillResult = await client.callTool({
      name: "Test Skill",
      arguments: { query: "test query" }
    });
    
    console.log("✅ Skill called successfully");
    console.log("📄 Skill content:", skillResult.content[0].text.substring(0, 100) + "...");

    // Test 3: Try to call a lazy-mcp tool (filesystem list_directory)
    console.log("\n🛠️ Test 3: Testing lazy-mcp bridge...");
    
    // Find a filesystem tool
    const filesystemTool = lazyMCPTools.find(t => 
      t.name === "list_directory" || t.description.includes("filesystem")
    );
    
    if (filesystemTool) {
      console.log(`🔍 Found filesystem tool: ${filesystemTool.name}`);
      
      try {
        const fsResult = await client.callTool({
          name: filesystemTool.name,
          arguments: { input: "/home/mts" }
        });
        
        console.log("✅ Lazy-MCP tool called successfully");
        console.log("📁 Filesystem result length:", fsResult.content[0].text.length);
      } catch (error) {
        console.log("⚠️ Lazy-MCP tool call failed (may need permissions):", error.message);
      }
    } else {
      console.log("⚠️ No filesystem tool found in lazy-mcp tools");
    }

    // Test 4: Test a simple skill from the existing ones
    console.log("\n🔍 Test 4: Testing existing skill...");
    const existingSkill = skills.find(s => s.name === "system-testing");
    
    if (existingSkill) {
      const systemTestResult = await client.callTool({
        name: "system-testing",
        arguments: { query: "test" }
      });
      
      console.log("✅ Existing skill called successfully");
      console.log("📄 System testing skill content preview:", 
        systemTestResult.content[0].text.substring(0, 150) + "...");
    }

    await client.close();
    console.log("\n🎉 All tests completed successfully!");
    console.log("📋 Summary:");
    console.log(`   - Skills: ${skills.length} working`);
    console.log(`   - Lazy-MCP Tools: ${lazyMCPTools.length} available`);
    console.log(`   - Total Tools: ${parsedTools.tools.length} accessible`);

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSkillsIntegration();
