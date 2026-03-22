// MCP uses stdio for JSON-RPC — suppress ALL stdout output (Prisma logs, console.log, etc.)
process.env.MCP_MODE = '1';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { prisma } from '../config/database.js';
import { registerWorkoutTools } from './tools/workouts.js';
import { registerMetricsTools } from './tools/metrics.js';
import { registerProgressTools } from './tools/progress.js';
import { registerProfileTools } from './tools/profile.js';
import { registerRealtimeTools } from './tools/realtime.js';
import { registerResources } from './resources/index.js';

// BigInt serialization for JSON responses
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const server = new McpServer({
  name: 'apex-fitness',
  version: '1.0.0',
});

// Register all tools
registerWorkoutTools(server);
registerMetricsTools(server);
registerProgressTools(server);
registerProfileTools(server);
registerRealtimeTools(server);

// Register resources
registerResources(server);

async function main(): Promise<void> {
  // Verify database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.error('[MCP] Database connected');
  } catch (err) {
    console.error('[MCP] Database connection failed:', err);
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Apex Fitness MCP Server running on stdio');
}

main().catch((err) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});
