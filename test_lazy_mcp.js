#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testLazyMCP() {
  console.log("Testing lazy-mcp connection...");
  
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
    command: "../lazy-mcp/run-lazy-mcp.sh",
    args: [],
  });

  try {
    await client.connect(transport);
    console.log("Connected to lazy-mcp successfully");

    // Test getting tools from root
    console.log("Getting tools from root...");
    const result = await client.callTool({
      name: "get_tools_in_category",
      arguments: { path: "" }
    });

    console.log("Result:", JSON.stringify(result, null, 2));
    
    await client.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

testLazyMCP();
