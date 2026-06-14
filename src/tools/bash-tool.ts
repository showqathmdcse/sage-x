// ============================================
// Bash Tool - Execute shell commands
// ============================================
import { exec } from 'child_process';
import { ToolDefinition } from '../types';

/** Execute a bash command */
export async function executeBash(args: {
  command: string;
  timeout?: number;
}): Promise<string> {
  const timeout = args.timeout || 30000; // 30s default

  return new Promise((resolve) => {
    exec(
      args.command,
      {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
        shell: '/bin/bash',
        cwd: process.cwd(),
      },
      (error, stdout, stderr) => {
        let output = '';

        if (stdout) output += stdout;
        if (stderr) output += (output ? '\n' : '') + `STDERR: ${stderr}`;
        if (error && error.killed) {
          output += `\nCommand timed out after ${timeout}ms`;
        } else if (error) {
          output += `\nExit code: ${error.code}`;
        }

        resolve(output || '(no output)');
      }
    );
  });
}

/** Tool definition for bash */
export const bashToolDefinition: ToolDefinition = {
  name: 'bash',
  description:
    'Execute a bash command and return the output. Use for git commands, npm/yarn, running tests, and other system operations.',
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
