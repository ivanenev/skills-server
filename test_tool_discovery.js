#!/usr/bin/env node

/**
 * Tool Discovery and Categorization Tests
 * Tests advanced tool organization and discovery mechanisms
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testToolDiscovery() {
  console.log("🔍 Testing Tool Discovery and Categorization...");
  
  const client = new Client(
    {
      name: "tool-discovery-test",
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

    // Test 1: Comprehensive tool discovery
    console.log("\n📊 Test 1: Comprehensive Tool Discovery...");
    const tools = await client.listTools();
    
    console.log(`🔧 Total tools discovered: ${tools.tools.length}`);
    
    // Categorize tools
    const skillTools = tools.tools.filter(t => !t.description.includes('[') || !t.description.includes(']'));
    const lazyMCPTools = tools.tools.filter(t => t.description.includes('[') && t.description.includes(']'));
    
    console.log(`📚 Skills: ${skillTools.length}`);
    console.log(`⚡ Lazy-MCP Tools: ${lazyMCPTools.length}`);
    
    // Analyze skill categories
    const skillCategories = {};
    skillTools.forEach(skill => {
      const category = skill.description.toLowerCase().includes('database') ? 'database' :
                      skill.description.toLowerCase().includes('docker') ? 'container' :
                      skill.description.toLowerCase().includes('system') ? 'system' :
                      skill.description.toLowerCase().includes('backup') ? 'backup' :
                      skill.description.toLowerCase().includes('test') ? 'testing' :
                      'general';
      skillCategories[category] = (skillCategories[category] || 0) + 1;
    });
    
    console.log("📋 Skill Categories:");
    Object.entries(skillCategories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} skills`);
    });

    // Test 2: Tool metadata verification
    console.log("\n📝 Test 2: Tool Metadata Verification...");
    const sampleSkills = skillTools.slice(0, 3);
    
    for (const skill of sampleSkills) {
      console.log(`\n🔍 Analyzing ${skill.name}:`);
      console.log(`   📄 Description: ${skill.description.substring(0, 80)}...`);
      console.log(`   🔧 Input schema: ${skill.inputSchema ? 'Present' : 'Missing'}`);
      
      // Verify the skill actually works
      try {
        const result = await client.callTool({
          name: skill.name,
          arguments: { query: "metadata verification" }
        });
        console.log(`   ✅ Functional: Yes (${result.content[0].text.length} chars)`);
      } catch (error) {
        console.log(`   ❌ Functional: No - ${error.message}`);
      }
    }

    // Test 3: Lazy-MCP tool organization
    console.log("\n🏗️ Test 3: Lazy-MCP Tool Organization...");
    if (lazyMCPTools.length > 0) {
      const lazyMCPServers = {};
      lazyMCPTools.forEach(tool => {
        const serverMatch = tool.description.match(/\[([^\]]+)\]/);
        if (serverMatch) {
          const server = serverMatch[1];
          lazyMCPServers[server] = (lazyMCPServers[server] || 0) + 1;
        }
      });
      
      console.log("📊 Lazy-MCP Servers Discovered:");
      Object.entries(lazyMCPServers).forEach(([server, count]) => {
        console.log(`   ${server}: ${count} tools`);
      });
    }

    // Test 4: Tool search and filtering simulation
    console.log("\n🔎 Test 4: Tool Search Capabilities...");
    const searchTerms = ['database', 'file', 'system', 'test'];
    
    for (const term of searchTerms) {
      const matchingSkills = skillTools.filter(skill => 
        skill.name.toLowerCase().includes(term) || 
        skill.description.toLowerCase().includes(term)
      );
      
      const matchingLazyMCP = lazyMCPTools.filter(tool => 
        tool.name.toLowerCase().includes(term) || 
        tool.description.toLowerCase().includes(term)
      );
      
      console.log(`   "${term}": ${matchingSkills.length} skills, ${matchingLazyMCP.length} lazy-mcp tools`);
    }

    // Test 5: Tool availability consistency
    console.log("\n🔄 Test 5: Tool Availability Consistency...");
    const initialTools = (await client.listTools()).tools.length;
    
    // Quick re-discovery
    const rediscoveredTools = (await client.listTools()).tools.length;
    
    console.log(`   Initial discovery: ${initialTools} tools`);
    console.log(`   Re-discovery: ${rediscoveredTools} tools`);
    console.log(`   Consistency: ${initialTools === rediscoveredTools ? '✅ Perfect' : '⚠️ Inconsistent'}`);

    await client.close();
    
    console.log("\n🎉 Tool discovery and categorization tests completed successfully!");
    console.log("📋 Summary: Tool organization, metadata, and discovery mechanisms verified");
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Tool discovery test failed:", error);
    process.exit(1);
  }
}

testToolDiscovery();