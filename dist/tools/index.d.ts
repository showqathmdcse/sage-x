import { ToolDefinition, ToolCall, ToolResult } from '../types';
type ToolHandler = (args: Record<string, any>) => Promise<string>;
declare class ToolRegistry {
    private tools;
    private definitions;
    constructor();
    private registerDefaults;
    register(name: string, handler: ToolHandler, definition: ToolDefinition): void;
    getDefinitions(): ToolDefinition[];
    execute(toolCall: ToolCall): Promise<ToolResult>;
    executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]>;
}
export declare const toolRegistry: ToolRegistry;
export {};
//# sourceMappingURL=index.d.ts.map