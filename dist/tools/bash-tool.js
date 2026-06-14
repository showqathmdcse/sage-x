"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bashToolDefinition = void 0;
exports.executeBash = executeBash;
// ============================================
// Bash Tool - Execute shell commands
// ============================================
const child_process_1 = require("child_process");
/** Execute a bash command */
async function executeBash(args) {
    const timeout = args.timeout || 30000; // 30s default
    return new Promise((resolve) => {
        (0, child_process_1.exec)(args.command, {
            timeout,
            maxBuffer: 1024 * 1024 * 10, // 10MB
            shell: '/bin/bash',
            cwd: process.cwd(),
        }, (error, stdout, stderr) => {
            let output = '';
            if (stdout)
                output += stdout;
            if (stderr)
                output += (output ? '\n' : '') + `STDERR: ${stderr}`;
            if (error && error.killed) {
                output += `\nCommand timed out after ${timeout}ms`;
            }
            else if (error) {
                output += `\nExit code: ${error.code}`;
            }
            resolve(output || '(no output)');
        });
    });
}
/** Tool definition for bash */
exports.bashToolDefinition = {
    name: 'bash',
    description: 'Execute a bash command and return the output. Use for git commands, npm/yarn, running tests, and other system operations.',
    parameters: {
        type: 'object',
        required: ['command'],
        properties: {
            command: {
                type: 'string',
                description: 'The bash command to execute',
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
            },
        },
    },
};
//# sourceMappingURL=bash-tool.js.map