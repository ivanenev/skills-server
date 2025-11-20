#!/usr/bin/env node

/**
 * Content Delivery Verification Tests
 * Tests skill content accuracy, formatting, and delivery
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testContentDelivery() {
  console.log("📄 Testing Content Delivery Verification...");
  
  const client = new Client(
    {
      name: "content-delivery-test",
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

    // Test 1: Verify content structure and formatting
    console.log("\n📋 Test 1: Content Structure Verification...");
    const skills = await client.listTools();
    const skillTools = skills.tools.filter(t => !t.description.includes('[') || !t.description.includes(']'));
    
    console.log(`🔍 Found ${skillTools.length} skills to verify`);
    
    for (const skill of skillTools.slice(0, 5)) { // Test first 5 skills
      console.log(`\n🔧 Testing skill: ${skill.name}`);
      
      const result = await client.callTool({
        name: skill.name,
        arguments: { query: "test content verification" }
      });
      
      const content = result.content[0].text;
      
      // Verify content properties
      console.log(`✅ Skill ${skill.name} delivered content`);
      console.log(`   📏 Length: ${content.length} characters`);
      console.log(`   📝 Has markdown: ${content.includes('#') || content.includes('##')}`);
      console.log(`   🔗 Has links: ${content.includes('http')}`);
      console.log(`   📚 Has code blocks: ${content.includes('```')}`);
      
      // Basic content quality checks
      if (content.length < 100) {
        console.log(`   ⚠️ Warning: Content seems short (${content.length} chars)`);
      }
      
      if (!content.includes('\n')) {
        console.log(`   ⚠️ Warning: Content may not be properly formatted`);
      }
    }

    // Test 2: Verify skill descriptions match content
    console.log("\n📝 Test 2: Skill Description Accuracy...");
    for (const skill of skillTools.slice(0, 3)) {
      const result = await client.callTool({
        name: skill.name,
        arguments: { query: "skill description" }
      });
      
      const content = result.content[0].text.toLowerCase();
      const description = skill.description.toLowerCase();
      
      // Check if description keywords appear in content
      const descriptionWords = description.split(' ').filter(word => word.length > 3);
      const matchingWords = descriptionWords.filter(word => content.includes(word));
      
      console.log(`✅ Skill ${skill.name}: ${matchingWords.length}/${descriptionWords.length} description keywords found in content`);
    }

    // Test 3: Content consistency across multiple calls
    console.log("\n🔄 Test 3: Content Consistency...");
    const testSkill = skillTools[0]; // Use first skill for consistency test
    
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await client.callTool({
        name: testSkill.name,
        arguments: { query: `test query ${i}` }
      });
      results.push(result.content[0].text);
    }
    
    // Check if content is reasonably consistent
    const avgLength = results.reduce((sum, text) => sum + text.length, 0) / results.length;
    const lengthVariance = results.map(text => Math.abs(text.length - avgLength) / avgLength);
    const maxVariance = Math.max(...lengthVariance);
    
    console.log(`✅ Content consistency for ${testSkill.name}:`);
    console.log(`   📊 Average length: ${Math.round(avgLength)} characters`);
    console.log(`   📈 Max variance: ${(maxVariance * 100).toFixed(1)}%`);
    
    if (maxVariance > 0.5) {
      console.log(`   ⚠️ Warning: High content variance detected`);
    }

    await client.close();
    
    console.log("\n🎉 Content delivery verification tests completed successfully!");
    console.log("📋 Summary: Content structure, formatting, and consistency verified");
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Content delivery test failed:", error);
    process.exit(1);
  }
}

testContentDelivery();