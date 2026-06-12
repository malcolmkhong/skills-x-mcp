// MCP Tools: Index — collects all individual tool definitions
// Each tool lives in its own file for maintainability

import { searchKnowledgeTool } from './search-knowledge';
import { retrieveKnowledgeTool } from './retrieve-knowledge';
import { buildContextTool } from './build-context';
import { searchSkillsTool } from './search-skills';
import { searchSopsTool } from './search-sops';
import { searchArchitectureTool } from './search-architecture';
import { searchSecurityTool } from './search-security';
import { searchGameSystemTool } from './search-game-system';

import { type MCPTool, type ToolContext, type MCPToolResult, checkPermission } from './shared';

// All 8 MCP tools — each in its own file
export const MCP_TOOLS: MCPTool[] = [
  searchKnowledgeTool,
  retrieveKnowledgeTool,
  buildContextTool,
  searchSkillsTool,
  searchSopsTool,
  searchArchitectureTool,
  searchSecurityTool,
  searchGameSystemTool,
];

// Re-export shared types for index.ts
export { type MCPTool, type ToolContext, type MCPToolResult, checkPermission };

// Execute a tool call by name with the given arguments
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  authContext?: import('../api-client').AuthContext | null
): Promise<MCPToolResult> {
  const startTime = Date.now();
  let success = true;
  let errorMessage: string | undefined;

  try {
    // Permission check
    const permError = checkPermission(toolName, authContext ?? null);
    if (permError) {
      success = false;
      errorMessage = permError;
      return {
        content: [{ type: 'text', text: `Permission denied: ${permError}` }],
      };
    }

    const tool = MCP_TOOLS.find((t) => t.name === toolName);
    if (!tool) {
      return {
        content: [{
          type: 'text',
          text: `Unknown tool: ${toolName}. Available tools: ${MCP_TOOLS.map((t) => t.name).join(', ')}`,
        }],
      };
    }

    return await tool.execute(args, { authContext: authContext ?? null });
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Error executing tool "${toolName}": ${errorMessage}`,
      }],
    };
  }
}
