#!/usr/bin/env node

/**
 * Measure token savings from progressive disclosure fix
 * Compares current token usage (2 navigation tools) vs full exposure (166 tools)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

class TokenCounter {
  static countTokens(text) {
    // Simple approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
}

/**
 * Compute token savings for skills by comparing metadata tokens vs full content tokens.
 * @param {Array} skills - Array of skill tools (from listTools)
 * @returns {Promise<Object>} Object containing metadataTokens, fullContentTokens, savings, percentageReduction
 */
async function computeSkillTokenSavings(skills) {
  // Determine skills directory
  const skillsDir = process.env.SKILLS_DIR || path.join(os.homedir(), '.skills');
  console.log(`   📁 Skills directory: ${skillsDir}`);

  // Compute metadata tokens
  let totalMetadataTokens = 0;
  for (const skill of skills) {
    const metadataText = `${skill.name}: ${skill.description}`;
    totalMetadataTokens += TokenCounter.countTokens(metadataText);
  }

  // Read all SKILL.md files in the skills directory
  let totalFullContentTokens = 0;
  let missingFiles = 0;
  let skillFilesCount = 0;

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFilePath = path.join(skillsDir, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillFilePath, 'utf-8');
          totalFullContentTokens += TokenCounter.countTokens(content);
          skillFilesCount++;
        } catch (err) {
          if (err.code === 'ENOENT') {
            missingFiles++;
          } else {
            console.warn(`   ⚠️ Could not read ${skillFilePath}: ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`   ❌ Failed to read skills directory: ${err.message}`);
    // Fallback: assume no full content tokens
  }

  if (missingFiles > 0) {
    console.log(`   ⚠️ ${missingFiles} skill directories missing SKILL.md files`);
  }

  const savings = totalFullContentTokens - totalMetadataTokens;
  const percentageReduction = totalFullContentTokens > 0 ? (savings / totalFullContentTokens) * 100 : 0;

  return {
    metadataTokens: totalMetadataTokens,
    fullContentTokens: totalFullContentTokens,
    savings,
    percentageReduction,
    skillFilesCount,
    missingFiles
  };
}

async function measureTokenSavings() {
  console.log("📊 Progressive Disclosure Token Savings Measurement\n");

  const client = new Client(
    {
      name: "token-measurement-client",
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
    console.log("✅ Connected to skills server\n");

    // Get current tool list
    const listResult = await client.listTools();
    const tools = listResult.tools;
    
    // Separate skills and lazy-mcp tools
    const skills = tools.filter(t => !t.name.startsWith('lazy_mcp_'));
    const lazyMCPTools = tools.filter(t => t.name.startsWith('lazy_mcp_'));
    
    console.log("📋 Current Tool Breakdown:");
    console.log(`   🔧 Skills: ${skills.length} tools`);
    console.log(`   ⚡ Lazy-MCP Navigation Tools: ${lazyMCPTools.length} tools`);
    console.log(`   📊 Total: ${tools.length} tools\n`);

    // Calculate token counts for current exposure
    const serializeTool = (tool) => `${tool.name}: ${tool.description}`;
    const currentToolListText = tools.map(serializeTool).join(' ');
    const currentTokens = TokenCounter.countTokens(currentToolListText);
    
    // Calculate per-tool average
    const avgTokensPerTool = Math.round(currentTokens / tools.length);
    
    console.log("💰 Current Token Usage:");
    console.log(`   🪙 Total tokens for tool list: ${currentTokens}`);
    console.log(`   📈 Average tokens per tool: ${avgTokensPerTool}`);
    console.log(`   📏 Tool list character length: ${currentToolListText.length}\n`);

    // Estimate token count if all 166 lazy-mcp tools were exposed
    const totalLazyMCPTools = 166; // From documentation
    const estimatedTokensPerLazyMCPTool = avgTokensPerTool; // Use same average
    const estimatedFullExposureTokens = currentTokens - (lazyMCPTools.length * avgTokensPerTool) + (totalLazyMCPTools * avgTokensPerTool);
    
    // More accurate: get sample of actual lazy-mcp tool descriptions via navigation
    // We'll call lazy_mcp_get_tools_in_category to get a sample
    console.log("🔍 Sampling lazy-mcp tool descriptions for accurate estimation...");
    let sampleTokensPerTool = avgTokensPerTool;
    try {
      const browseResult = await client.callTool({
        name: "lazy_mcp_get_tools_in_category",
        arguments: { path: "" }
      });
      const browseContent = browseResult.content[0].text;
      const browseData = JSON.parse(browseContent);
      
      // Count tools in root categories
      let totalSampleTools = 0;
      let totalSampleTokens = 0;
      
      if (browseData.tools) {
        const toolNames = Object.keys(browseData.tools);
        totalSampleTools += toolNames.length;
        toolNames.forEach(name => {
          const tool = browseData.tools[name];
          const desc = tool.description || '';
          totalSampleTokens += TokenCounter.countTokens(`${name}: ${desc}`);
        });
      }
      
      if (browseData.children) {
        // Sample first child category
        const firstChild = Object.keys(browseData.children)[0];
        if (firstChild) {
          const childResult = await client.callTool({
            name: "lazy_mcp_get_tools_in_category",
            arguments: { path: firstChild }
          });
          const childContent = childResult.content[0].text;
          const childData = JSON.parse(childContent);
          if (childData.tools) {
            const childToolNames = Object.keys(childData.tools);
            totalSampleTools += childToolNames.length;
            childToolNames.forEach(name => {
              const tool = childData.tools[name];
              const desc = tool.description || '';
              totalSampleTokens += TokenCounter.countTokens(`${name}: ${desc}`);
            });
          }
        }
      }
      
      if (totalSampleTools > 0) {
        sampleTokensPerTool = Math.round(totalSampleTokens / totalSampleTools);
        console.log(`   📊 Sampled ${totalSampleTools} lazy-mcp tools`);
        console.log(`   🪙 Average tokens per lazy-mcp tool: ${sampleTokensPerTool}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Could not sample lazy-mcp tools: ${error.message}`);
    }

    // Recalculate with sampled average
    const estimatedFullExposureTokensAccurate = currentTokens - (lazyMCPTools.length * avgTokensPerTool) + (totalLazyMCPTools * sampleTokensPerTool);
    
    console.log("\n📈 Estimated Token Usage Without Progressive Disclosure:");
    console.log(`   🔢 Total lazy-mcp tools: ${totalLazyMCPTools}`);
    console.log(`   🪙 Tokens per lazy-mcp tool (sampled): ${sampleTokensPerTool}`);
    console.log(`   💰 Estimated total tokens: ${estimatedFullExposureTokensAccurate}`);
    
    // Calculate savings
    const tokenSavings = estimatedFullExposureTokensAccurate - currentTokens;
    const percentageSavings = ((tokenSavings / estimatedFullExposureTokensAccurate) * 100).toFixed(1);
    
    console.log("\n🎯 Progressive Disclosure Savings:");
    console.log(`   💰 Token savings: ${tokenSavings} tokens`);
    console.log(`   📉 Percentage reduction: ${percentageSavings}%`);
    console.log(`   📊 Current vs Full: ${currentTokens} tokens vs ${estimatedFullExposureTokensAccurate} tokens`);

    // Skill token savings
    console.log("\n🎯 Skill Progressive Disclosure Savings:");
    const skillSavings = await computeSkillTokenSavings(skills);
    console.log(`   📊 Skills count: ${skills.length}`);
    console.log(`   🪙 Metadata tokens: ${skillSavings.metadataTokens}`);
    console.log(`   📚 Full content tokens: ${skillSavings.fullContentTokens}`);
    console.log(`   💰 Token savings: ${skillSavings.savings} tokens`);
    console.log(`   📉 Percentage reduction: ${skillSavings.percentageReduction.toFixed(1)}%`);
    if (skillSavings.missingFiles > 0) {
      console.log(`   ⚠️ ${skillSavings.missingFiles} skills missing files`);
    }
    
    // Verify the fix is working
    console.log("\n✅ Verification:");
    if (lazyMCPTools.length === 2) {
      console.log(`   ✓ Correct: Only ${lazyMCPTools.length} navigation tools exposed`);
    } else {
      console.log(`   ✗ Issue: ${lazyMCPTools.length} lazy-mcp tools exposed (expected 2)`);
    }
    
    if (percentageSavings > 90) {
      console.log(`   ✓ Excellent: ${percentageSavings}% token reduction achieved`);
    } else {
      console.log(`   ⚠️ Moderate: ${percentageSavings}% token reduction (expected >90%)`);
    }
    
    // Check for hidden token costs
    console.log("\n🔍 Hidden Token Cost Analysis:");
    
    // Check if tool descriptions are overly verbose
    const maxDescLength = Math.max(...tools.map(t => t.description.length));
    const avgDescLength = Math.round(tools.map(t => t.description.length).reduce((a, b) => a + b, 0) / tools.length);
    
    console.log(`   📏 Average description length: ${avgDescLength} characters`);
    console.log(`   📏 Maximum description length: ${maxDescLength} characters`);
    
    if (avgDescLength > 500) {
      console.log(`   ⚠️ Warning: Descriptions may be too verbose (avg ${avgDescLength} chars)`);
    } else {
      console.log(`   ✓ Descriptions are reasonably concise`);
    }
    
    // Check if input schemas are included (they add tokens)
    const toolsWithSchema = tools.filter(t => t.inputSchema).length;
    console.log(`   📄 Tools with input schemas: ${toolsWithSchema}/${tools.length}`);
    
    if (toolsWithSchema === tools.length) {
      console.log(`   ⚠️ Note: Input schemas add token overhead but are necessary`);
    }
    
    // Final summary
    console.log("\n📋 PROGRESSIVE DISCLOSURE VALIDATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`Current token usage: ${currentTokens} tokens`);
    console.log(`Estimated full exposure: ${estimatedFullExposureTokensAccurate} tokens`);
    console.log(`Token savings: ${tokenSavings} tokens (${percentageSavings}% reduction)`);
    console.log(`Skill token savings: ${skillSavings.savings} tokens (${skillSavings.percentageReduction.toFixed(1)}% reduction)`);
    console.log(`Fix status: ${lazyMCPTools.length === 2 ? 'WORKING' : 'BROKEN'}`);
    console.log(`Efficiency: ${percentageSavings > 90 ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'}`);
    
    await client.close();
    
  } catch (error) {
    console.error("❌ Measurement failed:", error);
    process.exit(1);
  }
}

// Run measurement
measureTokenSavings().catch(error => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});