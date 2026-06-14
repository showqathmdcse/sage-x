import { ToolDefinition } from '../types';
/** Search file contents using grep/ripgrep */
export declare function grepSearch(args: {
    pattern: string;
    path?: string;
    glob?: string;
    include_line_numbers?: boolean;
    max_results?: number;
}): Promise<string>;
/** Find files by glob pattern */
export declare function globSearch(args: {
    pattern: string;
    path?: string;
}): Promise<string>;
/** List directory contents */
export declare function listDirectory(args: {
    path?: string;
}): Promise<string>;
/** Tool definitions for search */
export declare const searchToolDefinitions: ToolDefinition[];
//# sourceMappingURL=search-tools.d.ts.map