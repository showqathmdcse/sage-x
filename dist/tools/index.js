"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = void 0;
const file_tools_1 = require("./file-tools");
const bash_tool_1 = require("./bash-tool");
const search_tools_1 = require("./search-tools");
class ToolRegistry {
    tools = new Map();
    definitions = [];
    constructor() {
        this.registerDefaults();
    }
    registerDefaults() {
        // File tools
        this.register('read_file', file_tools_1.readFile, file_tools_1.fileToolDefinitions[0]);
        this.register('write_file', file_tools_1.writeFile, file_tools_1.fileToolDefinitions[1]);
        this.register('edit_file', file_tools_1.editFile, file_tools_1.fileToolDefinitions[2]);
        // Bash tool
        this.register('bash', bash_tool_1.executeBash, bash_tool_1.bashToolDefinition);
        // Search tools
        this.register('grep', search_tools_1.grepSearch, search_tools_1.searchToolDefinitions[0]);
        this.register('glob', search_tools_1.globSearch, search_tools_1.searchToolDefinitions[1]);
        this.register('list_directory', search_tools_1.listDirectory, search_tools_1.searchToolDefinitions[2]);
    }
    register(name, handler, definition) {
        this.tools.set(name, handler);
        this.definitions.push(definition);
    }
    getDefinitions() {
        return this.definitions;
    }
    async execute(toolCall) {
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
        }
        catch (err) {
            return {
                toolCallId: toolCall.id,
                content: `Tool error: ${err.message}`,
                isError: true,
            };
        }
    }
    async executeAll(toolCalls) {
        return Promise.all(toolCalls.map((tc) => this.execute(tc)));
    }
}
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=index.js.map