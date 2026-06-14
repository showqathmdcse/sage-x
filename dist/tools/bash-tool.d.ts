import { ToolDefinition } from '../types';
/** Execute a bash command */
export declare function executeBash(args: {
    command: string;
    timeout?: number;
}): Promise<string>;
/** Tool definition for bash */
export declare const bashToolDefinition: ToolDefinition;
//# sourceMappingURL=bash-tool.d.ts.map