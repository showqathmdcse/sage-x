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
exports.fileToolDefinitions = void 0;
exports.previewWriteFile = previewWriteFile;
exports.previewEditFile = previewEditFile;
exports.applyDiff = applyDiff;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.editFile = editFile;
// ============================================
// File Operation Tools - Read, Write, Edit
// ============================================
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Compute a diff preview for write_file WITHOUT writing */
function previewWriteFile(args) {
    try {
        if (!args.file_path) {
            return 'Error: file_path is required but was not provided.';
        }
        const absPath = path.resolve(args.file_path);
        const oldContent = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : '';
        return {
            filePath: absPath,
            oldContent,
            newContent: args.content || '',
            isNew: oldContent === '',
        };
    }
    catch (err) {
        return `Error: ${err.message}`;
    }
}
/** Compute a diff preview for edit_file WITHOUT writing */
function previewEditFile(args) {
    try {
        if (!args.file_path) {
            return 'Error: file_path is required but was not provided.';
        }
        const absPath = path.resolve(args.file_path);
        if (!fs.existsSync(absPath)) {
            return `Error: File not found: ${absPath}`;
        }
        const oldContent = fs.readFileSync(absPath, 'utf-8');
        if (!args.old_string) {
            return `Error: old_string is required but was not provided.`;
        }
        if (!oldContent.includes(args.old_string)) {
            return `Error: old_string not found in file. Make sure it matches exactly.`;
        }
        let newContent;
        if (args.replace_all) {
            newContent = oldContent.split(args.old_string).join(args.new_string || '');
        }
        else {
            const index = oldContent.indexOf(args.old_string);
            newContent =
                oldContent.slice(0, index) +
                    (args.new_string || '') +
                    oldContent.slice(index + args.old_string.length);
        }
        return { filePath: absPath, oldContent, newContent, isNew: false };
    }
    catch (err) {
        return `Error: ${err.message}`;
    }
}
/** Apply a previewed diff — actually write to disk */
function applyDiff(preview) {
    try {
        const dir = path.dirname(preview.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(preview.filePath, preview.newContent, 'utf-8');
        return `File ${preview.isNew ? 'created' : 'written'} successfully: ${preview.filePath}`;
    }
    catch (err) {
        return `Error writing file: ${err.message}`;
    }
}
/** Read file contents */
async function readFile(args) {
    try {
        const absPath = path.resolve(args.file_path);
        if (!fs.existsSync(absPath)) {
            return `Error: File not found: ${absPath}`;
        }
        const stat = fs.statSync(absPath);
        if (stat.isDirectory()) {
            return `Error: ${absPath} is a directory, not a file`;
        }
        const content = fs.readFileSync(absPath, 'utf-8');
        const lines = content.split('\n');
        const offset = args.offset || 0;
        const limit = args.limit || lines.length;
        const selected = lines.slice(offset, offset + limit);
        // Return with line numbers
        return selected
            .map((line, i) => `${offset + i + 1}\t${line}`)
            .join('\n');
    }
    catch (err) {
        return `Error reading file: ${err.message}`;
    }
}
/** Write file contents */
async function writeFile(args) {
    try {
        if (!args.file_path)
            return 'Error: file_path is required but was not provided.';
        const absPath = path.resolve(args.file_path);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(absPath, args.content, 'utf-8');
        return `File written successfully: ${absPath}`;
    }
    catch (err) {
        return `Error writing file: ${err.message}`;
    }
}
/** Edit file with string replacement */
async function editFile(args) {
    try {
        if (!args.file_path)
            return 'Error: file_path is required but was not provided.';
        const absPath = path.resolve(args.file_path);
        if (!fs.existsSync(absPath)) {
            return `Error: File not found: ${absPath}`;
        }
        let content = fs.readFileSync(absPath, 'utf-8');
        if (!content.includes(args.old_string)) {
            return `Error: old_string not found in file. Make sure it matches exactly.`;
        }
        if (args.replace_all) {
            content = content.split(args.old_string).join(args.new_string);
        }
        else {
            const index = content.indexOf(args.old_string);
            content =
                content.slice(0, index) +
                    args.new_string +
                    content.slice(index + args.old_string.length);
        }
        fs.writeFileSync(absPath, content, 'utf-8');
        return `File edited successfully: ${absPath}`;
    }
    catch (err) {
        return `Error editing file: ${err.message}`;
    }
}
/** Tool definitions for file operations */
exports.fileToolDefinitions = [
    {
        name: 'read_file',
        description: 'Read the contents of a file. Returns content with line numbers.',
        parameters: {
            type: 'object',
            required: ['file_path'],
            properties: {
                file_path: {
                    type: 'string',
                    description: 'Absolute or relative path to the file',
                },
                offset: {
                    type: 'number',
                    description: 'Line number to start reading from (0-indexed)',
                },
                limit: {
                    type: 'number',
                    description: 'Number of lines to read',
                },
            },
        },
    },
    {
        name: 'write_file',
        description: 'Write content to a file. Creates directories if needed.',
        parameters: {
            type: 'object',
            required: ['file_path', 'content'],
            properties: {
                file_path: {
                    type: 'string',
                    description: 'Absolute or relative path to the file',
                },
                content: {
                    type: 'string',
                    description: 'Content to write to the file',
                },
            },
        },
    },
    {
        name: 'edit_file',
        description: 'Edit a file by replacing a specific string with a new string.',
        parameters: {
            type: 'object',
            required: ['file_path', 'old_string', 'new_string'],
            properties: {
                file_path: {
                    type: 'string',
                    description: 'Path to the file to edit',
                },
                old_string: {
                    type: 'string',
                    description: 'The exact string to find and replace',
                },
                new_string: {
                    type: 'string',
                    description: 'The replacement string',
                },
                replace_all: {
                    type: 'boolean',
                    description: 'Replace all occurrences (default: false)',
                },
            },
        },
    },
];
//# sourceMappingURL=file-tools.js.map