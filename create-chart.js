#!/usr/bin/env node

/**
 * Generate ASCII chart showing token efficiency comparison
 */

import fs from 'fs';

const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

console.log('\n📊 MCP SKILLS SYSTEM - TOKEN EFFICIENCY CHART');
console.log('='.repeat(60));

// Create ASCII bar chart
const maxWidth = 50;
const scenarios = results.scenarios;

console.log('\nToken Usage by Scenario (Lower is Better):');
console.log('-'.repeat(60));

scenarios.forEach(scenario => {
  const trad = scenario.traditional;
  const skills = scenario.skills;
  const maxTokens = Math.max(...scenarios.map(s => s.traditional));

  const tradBar = '█'.repeat(Math.round((trad / maxTokens) * maxWidth));
  const skillsBar = '█'.repeat(Math.round((skills / maxTokens) * maxWidth));

  console.log(`${scenario.name.padEnd(18)} Traditional: ${tradBar} ${trad}`);
  console.log(`${''.padEnd(18)} Skills:      ${skillsBar} ${skills}`);
  console.log('');
});

console.log('='.repeat(60));
console.log(`OVERALL SAVINGS: ${results.savingsPercentage.toFixed(1)}% fewer tokens used`);
console.log('='.repeat(60));

// Performance implications
console.log('\n🚀 PERFORMANCE IMPLICATIONS:');
console.log('• Faster AI responses (less context to process)');
console.log('• Lower API costs (fewer tokens billed)');
console.log('• Better scalability (more tools without bloat)');
console.log('• Improved accuracy (focused, relevant content)');

// Save chart as text file
const chartOutput = `
MCP Skills System - Token Efficiency Results
===========================================

Test Date: ${results.timestamp}
Savings: ${results.savingsPercentage.toFixed(1)}%

Detailed Results:
${scenarios.map(s =>
  `${s.name}: ${s.traditional} → ${s.skills} tokens (${(((s.traditional - s.skills) / s.traditional) * 100).toFixed(1)}% savings)`
).join('\n')}

Total: ${results.traditionalTokens} → ${results.skillsTokens} tokens
`;

fs.writeFileSync('performance-chart.txt', chartOutput);
console.log('\n💾 Chart saved to performance-chart.txt');