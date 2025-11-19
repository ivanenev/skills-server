#!/usr/bin/env node

/**
 * Test tool execution for actual skill calls
 * Tests real skill execution scenarios and tool functionality
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testToolExecution() {
  console.log("🧪 Testing Tool Execution Scenarios...");
  
  const client = new Client(
    {
      name: "tool-execution-test",
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

    // Test 1: Execute system-testing skill
    console.log("\n🔧 Test 1: Executing system-testing skill...");
    const systemTestResult = await client.callTool({
      name: "system-testing",
      arguments: { query: "unit testing" }
    });
    
    console.log("✅ System testing skill executed");
    console.log("📄 Content length:", systemTestResult.content[0].text.length);
    console.log("📝 Content preview:", systemTestResult.content[0].text.substring(0, 200) + "...");

    // Test 2: Execute backup-restore skill
    console.log("\n💾 Test 2: Executing backup-restore skill...");
    const backupResult = await client.callTool({
      name: "backup-restore",
      arguments: { query: "backup strategy" }
    });
    
    console.log("✅ Backup-restore skill executed");
    console.log("📄 Content length:", backupResult.content[0].text.length);

    // Test 3: Execute docker-compose-manager skill
    console.log("\�🐳 Test 3: Executing docker-compose-manager skill...");
    const dockerResult = await client.callTool({
      name: "docker-compose-manager",
      arguments: { query: "docker services" }
    });
    
    console.log("✅ Docker-compose-manager skill executed");
    console.log("📄 Content length:", dockerResult.content[0].text.length);

    // Test 4: Execute postgres skill
    console.log("\n🐘 Test 5: Executing postgres skill...");
    const postgresResult = await client.callTool({
      name: "postgres",
      arguments: { query: "postgresql queries" }
    });
    
    console.log("✅ PostgreSQL skill executed");
    console.log("📄 Content length:", postgresResult.content[0].text.length);

    // Test 6: Execute redis skill
    console.log("\n🔴 Test 6: Executing redis skill...");
    const redisResult = await client.callTool({
      name: "redis",
      arguments: { query: "caching operations" }
    });
    
    console.log("✅ Redis skill executed");
    console.log("📄 Content length:", redisResult.content[0].text.length);

    // Test 7: Execute qdrant skill
    console.log("\n🔍 Test 7: Executing qdrant skill...");
    const qdrantResult = await client.callTool({
      name: "qdrant",
      arguments: { query: "vector database" }
    });
    
    console.log("✅ Qdrant skill executed");
    console.log("📄 Content length:", qdrantResult.content[0].text.length);

    // Test 8: Execute system-monitoring skill
    console.log("\n📊 Test 8: Executing system-monitoring skill...");
    const monitoringResult = await client.callTool({
      name: "system-monitoring",
      arguments: { query: "performance monitoring" }
    });
    
    console.log("✅ System-monitoring skill executed");
    console.log("📄 Content length:", monitoringResult.content[0].text.length);

    await client.close();
    
    console.log("\n🎉 Tool execution tests completed successfully!");
    console.log("📋 Summary: All 7 core skills executed successfully");
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Tool execution test failed:", error);
    process.exit(1);
  }
}

testToolExecution();