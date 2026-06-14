// ============================================
// Search Tools - Grep & Glob
// ============================================
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ToolDefinition } from '../types';

/** Search file contents using grep/ripgrep */
export async function grepSearch(args: {
  pattern: string;
  path?: string;
  glob?: string;
  include_line_numbers?: boolean;
  max_results?: number;
}): Promise<string> {
  const searchPath = args.path || process.cwd();
  const maxResults = args.max_results || 50;

  // Try ripgrep first, fallback to grep
  const rgArgs = [
    `"${args.pattern}"`,
    `"${searchPath}"`,
    '--max-count', '5',
    '-n',
  ];

  if (args.glob) {
    rgArgs.push('--glob', `"${args.glob}"`);
  }

  const command = `rg ${rgArgs.join(' ')} 2>/dev/null || grep -rn "${args.pattern}" "${searchPath}" ${args.glob ? `--include="${args.glob}"` : ''} 2>/dev/null | head -${maxResults}`;

  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n').slice(0, maxResults);
        resolve(lines.join('\n'));
      } else {
        resolve('No matches found.');
      }
    });
  });
}

/** Find files by glob pattern */
export async function globSearch(args: {
  pattern: string;
  path?: string;
}): Promise<string> {
  const searchPath = args.path || process.cwd();

  // Use find command with name pattern
  const command = `find "${searchPath}" -name "${args.pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -100`;

  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
      if (stdout.trim()) {
        resolve(stdout.trim());
      } else {
        resolve('No files found matching pattern.');
      }
    });
  });
}

/** List directory contents */
export async function listDirectory(args: {
  path?: string;
}): Promise<string> {
  try {
    const dirPath = path.resolve(args.path || process.cwd());

    if (!fs.existsSync(dirPath)) {
      return `Error: Directory not found: ${dirPath}`;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = entries
      .map((e) => {
        const type = e.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${e.name}`;
      })
      .join('\n');

    return result || '(empty directory)';
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

/** Tool definitions for search */
export const searchToolDefinitions: ToolDefinition[] = [
  {
    name: 'grep',
    description:
      'Search for a pattern in file contents. Supports regex. Returns matching lines with file paths and line numbers.',
    parameters: {
      type: 'object',
      required: ['pattern'],
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for',
        },
        path: {
          type: 'string',
          description: 'Directory or file to search in (default: cwd)',
        },
        glob: {
          type: 'string',
          description: 'File glob pattern filter (e.g. "*.ts", "*.py")',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
        },
      },
    },
  },
  {
    name: 'glob',
    description:
      'Find files matching a name pattern. Excludes node_modules and .git.',
    parameters: {
      type: 'object',
      required: ['pattern'],
      properties: {
        pattern: {
          type: 'string',
          description: 'File name pattern (e.g. "*.ts", "package.json")',
        },
        path: {
          type: 'string',
          description: 'Directory to search in (default: cwd)',
        },
      },
    },
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path (default: cwd)',
        },
      },
    },
  },
];
