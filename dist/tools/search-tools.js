"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchToolDefinitions = void 0;
exports.grepSearch = grepSearch;
exports.globSearch = globSearch;
exports.listDirectory = listDirectory;
// ============================================
// Search Tools - Grep & Glob
// ============================================
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/** Search file contents using grep/ripgrep */
async function grepSearch(args) {
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
        (0, child_process_1.exec)(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
            if (stdout.trim()) {
                const lines = stdout.trim().split('\n').slice(0, maxResults);
                resolve(lines.join('\n'));
            }
            else {
                resolve('No matches found.');
            }
        });
    });
}
/** Find files by glob pattern */
async function globSearch(args) {
    const searchPath = args.path || process.cwd();
    // Use find command with name pattern
    const command = `find "${searchPath}" -name "${args.pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -100`;
    return new Promise((resolve) => {
        (0, child_process_1.exec)(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
            if (stdout.trim()) {
                resolve(stdout.trim());
            }
            else {
                resolve('No files found matching pattern.');
            }
        });
    });
}
/** List directory contents */
async function listDirectory(args) {
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
    }
    catch (err) {
        return `Error: ${err.message}`;
    }
}
/** Tool definitions for search */
exports.searchToolDefinitions = [
    {
        name: 'grep',
        description: 'Search for a pattern in file contents. Supports regex. Returns matching lines with file paths and line numbers.',
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
        description: 'Find files matching a name pattern. Excludes node_modules and .git.',
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
//# sourceMappingURL=search-tools.js.map