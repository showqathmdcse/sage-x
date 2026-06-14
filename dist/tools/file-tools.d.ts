import { ToolDefinition } from '../types';
/** Diff preview result — computed before writing */
export interface DiffPreview {
    filePath: string;
    oldContent: string;
    newContent: string;
    isNew: boolean;
}
/** Compute a diff preview for write_file WITHOUT writing */
export declare function previewWriteFile(args: {
    file_path: string;
    content: string;
}): DiffPreview | string;
/** Compute a diff preview for edit_file WITHOUT writing */
export declare function previewEditFile(args: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}): DiffPreview | string;
/** Apply a previewed diff — actually write to disk */
export declare function applyDiff(preview: DiffPreview): string;
/** Read file contents */
export declare function readFile(args: {
    file_path: string;
    offset?: number;
    limit?: number;
}): Promise<string>;
/** Write file contents */
export declare function writeFile(args: {
    file_path: string;
    content: string;
}): Promise<string>;
/** Edit file with string replacement */
export declare function editFile(args: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}): Promise<string>;
/** Tool definitions for file operations */
export declare const fileToolDefinitions: ToolDefinition[];
//# sourceMappingURL=file-tools.d.ts.map