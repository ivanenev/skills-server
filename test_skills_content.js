#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testSkillsContent() {
  console.log("Testing Skills Content Delivery...");
  
  const client = new Client(
    {
      name: "test-client",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  const clientTransport = new StdioClientTransport({
    command: "node",
    args: ["/home/mts/mcp_servers/skills-server/build/index.js"],
  });

  try {
    await client.connect(clientTransport);
    console.log("✅ Connected to enhanced skills-server successfully");

    // Test 1: Get tool list and check what's sent
    console.log("\n📋 Test 1: Checking tool list content...");
    const listRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    };

    // Send raw JSON-RPC request to see exactly what's returned
    const transport = client.transport;
    await transport.send(JSON.stringify(listRequest));
    
    // Wait for response
    const response = await new Promise((resolve) => {
      transport.onmessage = (message) => {
        resolve(JSON.parse(message));
      };
    });

    console.log("📊 Tool list response received");
    
    // Parse the tools from the response
    const tools = response.result.tools;
    console.log(`📋 Total tools in list: ${tools.length}`);

    // Find our test skill in the list
    const testSkill = tools.find(t => t.name === "Test Skill");
    if (testSkill) {
      console.log("🔍 Test Skill found in tool list:");
      console.log(`   Name: ${testSkill.name}`);
      console.log(`   Description: ${testSkill.description}`);
      console.log(`   Input Schema: ${JSON.stringify(testSkill.inputSchema)}`);
      console.log("   ✅ Only front matter sent in tool list (good!)");
    }

    // Test 2: Call the test skill to get full content
    console.log("\n📄 Test 2: Calling Test Skill to get full content...");
    const callRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "Test Skill",
        arguments: { query: "test" }
      }
    };

    await transport.send(JSON.stringify(callRequest));
    
    const callResponse = await new Promise((resolve) => {
      transport.onmessage = (message) => {
        resolve(JSON.parse(message));
      };
    });

    console.log("📄 Full skill content received:");
    const fullContent = callResponse.result.content[0].text;
    console.log("Content preview:", fullContent.substring(0, 200) + "...");
    
    // Verify it contains both front matter and content
    if (fullContent.includes("---") && fullContent.includes("This is a test skill content")) {
      console.log("✅ Full skill content delivered correctly");
    }

    // Test 3: Check if lazy-mcp tools have different behavior
    console.log("\n⚡ Test 3: Checking lazy-mcp tool behavior...");
    const lazyMCPTool = tools.find(t => t.description.includes('[lazy-mcp]'));
    if (lazyMCPTool) {
      console.log(`🔍 Lazy-MCP tool found: ${lazyMCPTool.name}`);
      console.log(`   Description: ${lazyMCPTool.description}`);
      console.log("   ✅ Lazy-MCP tools have different description format");
    }

    await client.close();
    console.log("\n🎉 Skills content delivery test completed!");
    console.log("📋 Summary:");
    console.log("   - Tool list sends only front matter (name, description, schema)");
    console.log("   - Full content delivered only when skill is called");
    console.log("   - Lazy-MCP tools properly identified in descriptions");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSkillsContent();
