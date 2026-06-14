// ============================================
// Tool Registry - Central tool management
// ============================================
import { ToolDefinition, ToolCall, ToolResult } from '../types';
import {
  readFile,
  writeFile,
  editFile,
  fileToolDefinitions,
} from './file-tools';
import { executeBash, bashToolDefinition } from './bash-tool';
import {
  grepSearch,
  globSearch,
  listDirectory,
  searchToolDefinitions,
} from './search-tools';

type ToolHandler = (args: Record<string, any>) => Promise<string>;

class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();
  private definitions: ToolDefinition[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // File tools
    this.register('read_file', readFile as ToolHandler, fileToolDefinitions[0]);
    this.register('write_file', writeFile as ToolHandler, fileToolDefinitions[1]);
    this.register('edit_file', editFile as ToolHandler, fileToolDefinitions[2]);

    // Bash tool
    this.register('bash', executeBash as ToolHandler, bashToolDefinition);

    // Search tools
    this.register('grep', grepSearch as ToolHandler, searchToolDefinitions[0]);
    this.register('glob', globSearch as ToolHandler, searchToolDefinitions[1]);
    this.register(
      'list_directory',
      listDirectory as ToolHandler,
      searchToolDefinitions[2]
    );
  }

  register(
    name: string,
    handler: ToolHandler,
    definition: ToolDefinition
  ): void {
    this.tools.set(name, handler);
    this.definitions.push(definition);
  }

  getDefinitions(): ToolDefinition[] {
    return this.definitions;
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const handler = this.tools.get(toolCall.name);

    if (!handler) {
      return {
        toolCallId: toolCall.id,
        content: `Unknown tool: ${toolCall.name}`,
        isError: true,
      };
    }

    try {
      const result = await handler(toolCall.arguments);
      return {
        toolCallId: toolCall.id,
        content: result,
      };
    } catch (err: any) {
      return {
        toolCallId: toolCall.id,
        content: `Tool error: ${err.message}`,
        isError: true,
      };
    }
  }

  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)));
  }
}

export const toolRegistry = new ToolRegistry();
