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
exports.TerminalUI = void 0;
// ============================================
// Terminal UI - Interactive prompt & rendering
// ============================================
const readline = __importStar(require("readline"));
const types_1 = require("../types");
const config_manager_1 = require("../config/config-manager");
// Use chalk v4 (CommonJS compatible)
const chalk = require('chalk');
const ora = require('ora');
// Markdown rendering
const { marked } = require('marked');
const { markedTerminal } = require('marked-terminal');
marked.use(markedTerminal({
    reflowText: true,
    width: Math.min(process.stdout.columns || 100, 120),
    tab: 2,
}));
// Thinking phrases that cycle while waiting for AI response
const THINKING_PHRASES = [
    'Analyzing request',
    'Reasoning through the problem',
    'Formulating response',
    'Processing context',
    'Evaluating approach',
    'Generating solution',
    'Reviewing codebase context',
    'Synthesizing information',
];
// Tool execution phrases
const TOOL_PHRASES = {
    'read_file': 'Reading file',
    'write_file': 'Writing file',
    'edit_file': 'Editing file',
    'bash': 'Executing command',
    'grep': 'Searching codebase',
    'glob': 'Finding files',
    'list_directory': 'Listing directory',
};
const COMMANDS = [
    { name: '/help', description: 'Show available commands' },
    { name: '/provider', description: 'Switch cloud provider (Azure, AWS, GCP)' },
    { name: '/model', description: 'Switch AI model' },
    { name: '/config', description: 'Configure provider credentials' },
    { name: '/status', description: 'Show current provider and model' },
    { name: '/clear', description: 'Clear conversation history' },
    { name: '/save', description: 'Save conversation to file' },
    { name: '/load', description: 'Load a saved conversation' },
    { name: '/compact', description: 'Compress conversation to save context' },
    { name: '/tokens', description: 'Show token usage summary' },
    { name: '/signin', description: 'Sign in with Google (Firebase)' },
    { name: '/signout', description: 'Sign out of current session' },
    { name: '/auth', description: 'Show authentication status' },
    { name: '/exit', description: 'Exit the application', aliases: ['/quit', '/q'] },
];
class TerminalUI {
    rl;
    spinner = null;
    thinkingInterval = null;
    thinkingStart = 0;
    closed = false;
    escPressed = false;
    escListener = null;
    brand;
    constructor(brand = 'aava') {
        this.brand = brand;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }
    /** Mark request as started — Esc cancellation becomes available */
    startEscListener() {
        this.escPressed = false;
    }
    /** Mark request as finished — ensure terminal is in clean state */
    stopEscListener() {
        // Clean up any lingering raw mode or listeners from Esc handling
        if (this.escListener) {
            process.stdin.removeListener('data', this.escListener);
            this.escListener = null;
        }
        if (process.stdin.isTTY) {
            try {
                process.stdin.setRawMode(false);
            }
            catch { }
        }
        // Recreate readline to ensure prompt works
        try {
            this.rl.close();
        }
        catch { }
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.escPressed = false;
    }
    /** Check if Esc was pressed */
    wasCancelled() {
        return this.escPressed;
    }
    /** Start the thinking spinner with Esc detection */
    startThinking() {
        this.thinkingStart = Date.now();
        let phraseIndex = 0;
        this.spinner = ora({
            text: chalk.cyan(THINKING_PHRASES[0]) + chalk.gray(' (Esc to cancel)'),
            spinner: 'dots12',
            color: 'cyan',
            prefixText: '  ',
            discardStdin: false,
        }).start();
        // Listen for Esc while spinner is running
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            this.escListener = (data) => {
                if (data[0] === 27 || data[0] === 3) {
                    this.escPressed = true;
                    this.stopThinking();
                    console.log(chalk.yellow('  ⚠ Cancelling...'));
                }
            };
            process.stdin.on('data', this.escListener);
        }
        // Cycle through thinking phrases every 2.5 seconds
        this.thinkingInterval = setInterval(() => {
            phraseIndex = (phraseIndex + 1) % THINKING_PHRASES.length;
            const elapsed = ((Date.now() - this.thinkingStart) / 1000).toFixed(1);
            if (this.spinner) {
                this.spinner.text = chalk.cyan(`${THINKING_PHRASES[phraseIndex]}`) + chalk.gray(` (${elapsed}s · Esc to cancel)`);
            }
        }, 2500);
    }
    /** Stop the thinking spinner and Esc listener */
    stopThinking() {
        // Remove Esc listener
        if (this.escListener) {
            process.stdin.removeListener('data', this.escListener);
            this.escListener = null;
        }
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        if (this.thinkingInterval) {
            clearInterval(this.thinkingInterval);
            this.thinkingInterval = null;
        }
        if (this.spinner) {
            const elapsed = ((Date.now() - this.thinkingStart) / 1000).toFixed(1);
            this.spinner.stop();
            this.spinner = null;
            if (!this.escPressed) {
                console.log(chalk.green('  ✔ ') + chalk.gray(`Response ready (${elapsed}s)`));
            }
        }
    }
    /** Show a spinner for tool execution */
    startToolSpinner(toolName) {
        const phrase = TOOL_PHRASES[toolName] || `Running ${toolName}`;
        this.spinner = ora({
            text: chalk.magenta(phrase),
            spinner: 'arc',
            color: 'magenta',
            prefixText: '  ',
            discardStdin: false,
        }).start();
    }
    /** Stop the tool spinner */
    stopToolSpinner(toolName, success) {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
            const label = TOOL_PHRASES[toolName] || toolName;
            if (success) {
                console.log(chalk.green('  ✔ ') + chalk.gray(`${label} completed`));
            }
            else {
                console.log(chalk.red('  ✗ ') + chalk.red(`${label} failed`));
            }
        }
    }
    async printBanner() {
        if (this.brand === 'sage') {
            await this.printSageBannerAnimated();
        }
        else {
            this.printAavaBanner();
        }
        this.printCurrentConfig();
    }
    printAavaBanner() {
        const logo = `
    ${chalk.hex('#6C63FF').bold('  ██████╗  ██████╗ ██╗   ██╗ ██████╗ ')}
    ${chalk.hex('#7B73FF').bold(' ██╔═══██╗██╔═══██╗██║   ██║██╔═══██╗')}
    ${chalk.hex('#8A83FF').bold(' ████████║████████║██║   ██║████████║')}
    ${chalk.hex('#9993FF').bold(' ██╔═══██║██╔═══██║╚██╗ ██╔╝██╔═══██║')}
    ${chalk.hex('#A8A3FF').bold(' ██║   ██║██║   ██║ ╚████╔╝ ██║   ██║')}
    ${chalk.hex('#B7B3FF').bold(' ╚═╝   ╚═╝╚═╝   ╚═╝  ╚═══╝  ╚═╝   ╚═╝')}

    ${chalk.hex('#6C63FF').bold('           C  O  D  E')}
`;
        console.log(logo);
        console.log(chalk.gray('  ─────────────────────────────────────────────'));
        console.log(chalk.hex('#A8A3FF')('  Welcome to AAVA Code — your AI-powered coding assistant.'));
        console.log(chalk.gray('  Type a message to begin, or use /help for commands.\n'));
        console.log(chalk.gray('  ─────────────────────────────────────────────\n'));
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async printSageBannerAnimated() {
        const logo = [
            chalk.hex('#6C63FF').bold(' ███████╗ █████╗  ██████╗ ███████╗       ██╗  ██╗'),
            chalk.hex('#7B73FF').bold(' ██╔════╝██╔══██╗██╔════╝ ██╔════╝       ╚██╗██╔╝'),
            chalk.hex('#8A83FF').bold(' ███████╗███████║██║  ███╗█████╗   █████╗ ╚███╔╝ '),
            chalk.hex('#9993FF').bold(' ╚════██║██╔══██║██║   ██║██╔══╝   ╚════╝ ██╔██╗ '),
            chalk.hex('#A8A3FF').bold(' ███████║██║  ██║╚██████╔╝███████╗       ██╔╝ ██╗'),
            chalk.hex('#B7B3FF').bold(' ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝       ╚═╝  ╚═╝'),
        ];
        // Animated reveal
        console.log('');
        console.log(chalk.gray('  ─────────────────────────────────────────────'));
        await this.sleep(80);
        console.log('');
        for (const line of logo) {
            console.log('    ' + line);
            await this.sleep(60);
        }
        await this.sleep(100);
        console.log('');
        console.log(chalk.hex('#6C63FF').bold('           C  O  D  E'));
        await this.sleep(80);
        console.log('');
        console.log(chalk.gray('  ─────────────────────────────────────────────'));
        await this.sleep(120);
        // Tagline with typewriter effect
        const welcome = '  Welcome to ';
        const brand = 'Sage-X';
        const tagline = ' — wisdom meets code.';
        process.stdout.write(chalk.hex('#A8A3FF')(welcome));
        await this.sleep(50);
        for (const ch of brand) {
            process.stdout.write(chalk.hex('#6C63FF').bold(ch));
            await this.sleep(70);
        }
        await this.sleep(50);
        for (const ch of tagline) {
            process.stdout.write(chalk.hex('#A8A3FF')(ch));
            await this.sleep(25);
        }
        console.log('');
        await this.sleep(100);
        console.log(chalk.gray('  Type a message to begin, or use /help for commands.\n'));
        console.log(chalk.gray('  ─────────────────────────────────────────────\n'));
    }
    printCurrentConfig() {
        const config = config_manager_1.configManager.get();
        console.log(chalk.gray('  Provider: ') +
            chalk.green.bold(config_manager_1.configManager.getProviderDisplay()));
        console.log(chalk.gray('  Model:    ') +
            chalk.yellow.bold(config_manager_1.configManager.getModelDisplay()));
        console.log(chalk.gray('  CWD:      ') +
            chalk.blue(process.cwd()));
        console.log(chalk.gray('  Status:   ') +
            (config_manager_1.configManager.isProviderConfigured()
                ? chalk.green('✓ Configured')
                : chalk.red('✗ Not configured — run /config')));
        console.log();
    }
    printHelp() {
        console.log(chalk.gray('  Commands:'));
        console.log(chalk.gray('    /provider          ') + 'Switch cloud provider');
        console.log(chalk.gray('    /model             ') + 'Switch model');
        console.log(chalk.gray('    /config            ') + 'Configure provider credentials');
        console.log(chalk.gray('    /status            ') + 'Show current config');
        console.log(chalk.gray('    /clear             ') + 'Clear conversation');
        console.log(chalk.gray('    /save [name]       ') + 'Save conversation to file');
        console.log(chalk.gray('    /load [name]       ') + 'Load a saved conversation');
        console.log(chalk.gray('    /compact           ') + 'Compress conversation to save context');
        console.log(chalk.gray('    /tokens            ') + 'Show token usage summary');
        console.log(chalk.gray('    /signin            ') + 'Sign in with Firebase');
        console.log(chalk.gray('    /signout           ') + 'Sign out');
        console.log(chalk.gray('    /auth              ') + 'Show authentication status');
        console.log(chalk.gray('    /help              ') + 'Show this help');
        const exitLabel = this.brand === 'sage' ? 'Exit Sage-X' : 'Exit AAVA Code';
        console.log(chalk.gray('    /exit              ') + exitLabel);
        console.log();
    }
    /**
     * Prompt for input using raw mode stdin.
     * - Typed Enter on a non-empty buffer = submit
     * - Pasted newlines arrive in rapid bursts and are collected as part of the input
     * - Ctrl+C = exit, Ctrl+U = clear line, Backspace = delete char
     */
    getMatchingCommands(input) {
        if (!input.startsWith('/'))
            return [];
        const query = input.toLowerCase();
        return COMMANDS.filter(cmd => {
            if (cmd.name.startsWith(query))
                return true;
            if (cmd.aliases)
                return cmd.aliases.some(a => a.startsWith(query));
            return false;
        });
    }
    renderSuggestions(matches, selectedIndex, linesShown, cursorCol) {
        // Move down from current line and clear all previously shown lines
        const toClear = Math.max(linesShown, matches.length);
        for (let i = 0; i < toClear; i++) {
            process.stdout.write('\n\x1b[2K');
        }
        // Move back up to the input line
        if (toClear > 0) {
            process.stdout.write(`\x1b[${toClear}A`);
        }
        // Restore cursor column
        process.stdout.write(`\x1b[${cursorCol}G`);
        if (matches.length === 0)
            return 0;
        const maxShow = Math.min(matches.length, 8);
        // Draw suggestions below
        for (let i = 0; i < maxShow; i++) {
            process.stdout.write('\n\x1b[2K');
            const cmd = matches[i];
            const aliasStr = cmd.aliases && cmd.aliases.length > 0
                ? chalk.gray.dim(` (${cmd.aliases.join(', ')})`)
                : '';
            if (i === selectedIndex) {
                process.stdout.write('  ' + chalk.bgHex('#6C63FF').white.bold(` ${cmd.name} `) +
                    chalk.white(` ${cmd.description}`) + aliasStr);
            }
            else {
                process.stdout.write('  ' + chalk.hex('#6C63FF').bold(` ${cmd.name} `) +
                    chalk.gray(` ${cmd.description}`) + aliasStr);
            }
        }
        // Move back up to the input line
        process.stdout.write(`\x1b[${maxShow}A`);
        // Restore cursor column
        process.stdout.write(`\x1b[${cursorCol}G`);
        return maxShow;
    }
    clearSuggestions(linesShown, cursorCol) {
        if (linesShown > 0) {
            for (let i = 0; i < linesShown; i++) {
                process.stdout.write('\n\x1b[2K');
            }
            process.stdout.write(`\x1b[${linesShown}A`);
            process.stdout.write(`\x1b[${cursorCol}G`);
        }
    }
    async prompt() {
        const provider = config_manager_1.configManager.getProviderDisplay();
        const model = config_manager_1.configManager.getModelDisplay();
        const cmdName = this.brand === 'sage' ? 'sage-x' : 'aava-code';
        const prefix = this.brand === 'sage'
            ? chalk.hex('#6C63FF').bold(cmdName) + chalk.gray(` (${provider}/${model})`)
            : chalk.cyan(cmdName) + chalk.gray(` (${provider}/${model})`);
        // Calculate the visible prefix length (without ANSI codes) + "> "
        const prefixPlain = `${cmdName} (${provider}/${model}) > `;
        const prefixLen = prefixPlain.length;
        process.stdout.write(`${prefix} ${chalk.cyan('>')} `);
        return new Promise((resolve, reject) => {
            let buffer = '';
            let lastDataTime = 0;
            let suggestionsShown = 0;
            let selectedIndex = 0;
            let showingSuggestions = false;
            const getCursorCol = () => prefixLen + buffer.length + 1;
            // Close readline before raw mode (it will be recreated after)
            this.rl.close();
            // Switch to raw mode for character-by-character input
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            const cleanup = () => {
                process.stdin.removeListener('data', onData);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                this.clearSuggestions(suggestionsShown, getCursorCol());
                suggestionsShown = 0;
                // Recreate readline with a fresh interface
                this.rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });
            };
            const updateSuggestions = () => {
                const matches = this.getMatchingCommands(buffer);
                if (matches.length > 0 && buffer.length > 0 && buffer.startsWith('/') && !buffer.includes(' ')) {
                    showingSuggestions = true;
                    if (selectedIndex >= matches.length)
                        selectedIndex = 0;
                    suggestionsShown = this.renderSuggestions(matches, selectedIndex, suggestionsShown, getCursorCol());
                }
                else {
                    if (showingSuggestions || suggestionsShown > 0) {
                        this.clearSuggestions(suggestionsShown, getCursorCol());
                    }
                    showingSuggestions = false;
                    suggestionsShown = 0;
                    selectedIndex = 0;
                }
            };
            const submit = () => {
                cleanup();
                process.stdout.write('\n');
                resolve(buffer.trim());
            };
            const onData = (data) => {
                const now = Date.now();
                const timeSinceLast = now - lastDataTime;
                lastDataTime = now;
                const str = data.toString('utf-8');
                for (let i = 0; i < str.length; i++) {
                    const ch = str[i];
                    const code = str.charCodeAt(i);
                    // Escape sequences (arrow keys)
                    if (code === 27 && i + 2 < str.length && str[i + 1] === '[') {
                        const arrow = str[i + 2];
                        i += 2;
                        if (showingSuggestions) {
                            const matches = this.getMatchingCommands(buffer);
                            if (arrow === 'A') {
                                selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : matches.length - 1;
                                suggestionsShown = this.renderSuggestions(matches, selectedIndex, suggestionsShown, getCursorCol());
                            }
                            else if (arrow === 'B') {
                                selectedIndex = selectedIndex < matches.length - 1 ? selectedIndex + 1 : 0;
                                suggestionsShown = this.renderSuggestions(matches, selectedIndex, suggestionsShown, getCursorCol());
                            }
                        }
                        continue;
                    }
                    // Tab — accept selected suggestion
                    if (code === 9 && showingSuggestions) {
                        const matches = this.getMatchingCommands(buffer);
                        if (matches.length > 0) {
                            const selected = matches[selectedIndex];
                            process.stdout.write('\b \b'.repeat(buffer.length));
                            buffer = selected.name + ' ';
                            process.stdout.write(buffer);
                            this.clearSuggestions(suggestionsShown, getCursorCol());
                            suggestionsShown = 0;
                            showingSuggestions = false;
                            selectedIndex = 0;
                        }
                        continue;
                    }
                    // Ctrl+C — exit
                    if (code === 3) {
                        cleanup();
                        process.stdout.write('\n');
                        reject(new Error('readline was closed'));
                        return;
                    }
                    // Ctrl+D on empty buffer — exit
                    if (code === 4 && buffer.length === 0) {
                        cleanup();
                        process.stdout.write('\n');
                        reject(new Error('readline was closed'));
                        return;
                    }
                    // Ctrl+U — clear line
                    if (code === 21) {
                        const lastNewline = buffer.lastIndexOf('\n');
                        const currentLine = lastNewline === -1 ? buffer : buffer.slice(lastNewline + 1);
                        process.stdout.write('\b \b'.repeat(currentLine.length));
                        buffer = lastNewline === -1 ? '' : buffer.slice(0, lastNewline + 1);
                        updateSuggestions();
                        continue;
                    }
                    // Backspace
                    if (code === 127 || code === 8) {
                        if (buffer.length > 0) {
                            const lastChar = buffer[buffer.length - 1];
                            buffer = buffer.slice(0, -1);
                            if (lastChar === '\n') {
                                process.stdout.write('\x1b[A');
                                const prevNewline = buffer.lastIndexOf('\n');
                                const prevLine = prevNewline === -1 ? buffer : buffer.slice(prevNewline + 1);
                                process.stdout.write(`\x1b[${prevLine.length + 1}G`);
                            }
                            else {
                                process.stdout.write('\b \b');
                            }
                        }
                        updateSuggestions();
                        continue;
                    }
                    // Enter / newline
                    if (ch === '\r' || ch === '\n') {
                        if (showingSuggestions) {
                            const matches = this.getMatchingCommands(buffer);
                            if (matches.length > 0 && buffer !== matches[selectedIndex].name) {
                                const selected = matches[selectedIndex];
                                process.stdout.write('\b \b'.repeat(buffer.length));
                                buffer = selected.name;
                                process.stdout.write(buffer);
                                this.clearSuggestions(suggestionsShown, getCursorCol());
                                suggestionsShown = 0;
                                showingSuggestions = false;
                                selectedIndex = 0;
                                submit();
                                return;
                            }
                        }
                        const isPaste = timeSinceLast < 10 && i === 0 && buffer.length > 0;
                        const moreInChunk = i < str.length - 1;
                        if (isPaste || moreInChunk) {
                            buffer += '\n';
                            process.stdout.write('\n    ');
                            continue;
                        }
                        submit();
                        return;
                    }
                    // Regular character
                    buffer += ch;
                    process.stdout.write(ch);
                    updateSuggestions();
                }
            };
            process.stdin.on('data', onData);
        });
    }
    printAssistant(text) {
        this.renderMarkdown(text);
    }
    printStream(chunk) {
        process.stdout.write(chalk.white(chunk));
    }
    endStream() {
        console.log();
    }
    /** Render streamed content as markdown (call after full response is collected) */
    renderMarkdown(text) {
        if (!text.trim())
            return;
        try {
            const rendered = marked.parse(text);
            // marked-terminal adds trailing newline, trim to avoid double-spacing
            process.stdout.write(rendered.replace(/\n+$/, '\n'));
        }
        catch {
            console.log(chalk.white(text));
        }
    }
    /** Display a human-readable description of what the tool is doing */
    printToolCall(name, args) {
        const description = this.describeToolAction(name, args);
        console.log(chalk.magenta(`  → `) + chalk.white(description));
    }
    printToolResult(name, result, isError) {
        if (isError) {
            const maxLen = 300;
            const display = result.length > maxLen ? result.slice(0, maxLen) + '...' : result;
            console.log(chalk.red(`  ✗ ${display}`));
        }
    }
    describeToolAction(name, args) {
        const shortenPath = (p) => {
            if (!p)
                return '(unknown path)';
            // Show only last 2-3 path segments
            const parts = p.replace(/^\.\//, '').split('/');
            return parts.length > 3 ? '.../' + parts.slice(-3).join('/') : parts.join('/');
        };
        switch (name) {
            case 'read_file': {
                const filePath = shortenPath(args.file_path || '');
                const range = args.offset ? ` (lines ${args.offset}-${(args.offset || 0) + (args.limit || '?')})` : '';
                return `Reading ${filePath}${range}`;
            }
            case 'write_file':
                return `Creating ${shortenPath(args.file_path || '')}`;
            case 'edit_file':
                return `Editing ${shortenPath(args.file_path || '')}`;
            case 'bash': {
                const cmd = args.command || '';
                const display = cmd.length > 80 ? cmd.slice(0, 80) + '...' : cmd;
                return `Running: ${chalk.gray(display)}`;
            }
            case 'grep': {
                const pattern = args.pattern || '';
                const scope = args.path ? shortenPath(args.path) : 'codebase';
                return `Searching for "${pattern}" in ${scope}`;
            }
            case 'glob':
                return `Finding files matching "${args.pattern || ''}"`;
            case 'list_directory':
                return `Listing ${shortenPath(args.path || '.')}`;
            default:
                return `${name}`;
        }
    }
    /** Print a unified diff with colored +/- lines */
    printDiff(filePath, oldContent, newContent) {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const isNewFile = !oldContent || oldContent.trim() === '';
        // New file — show content preview instead of diff
        if (isNewFile) {
            this.printNewFile(filePath, newContent);
            return;
        }
        // Find changed regions using a simple LCS-based diff
        const changes = this.computeDiff(oldLines, newLines);
        if (changes.length === 0) {
            console.log(chalk.gray('  (no changes)'));
            return;
        }
        const shortPath = filePath.split('/').slice(-3).join('/');
        console.log(chalk.cyan(`  ┌─ `) + chalk.white.bold(shortPath));
        console.log(chalk.gray(`  │ `) + chalk.red(`${oldLines.length} lines`) + chalk.gray(' → ') + chalk.green(`${newLines.length} lines`));
        console.log(chalk.gray('  │'));
        for (const change of changes) {
            if (change.type === 'context') {
                console.log(chalk.gray(`  │  ${change.lineNum}\t${change.text}`));
            }
            else if (change.type === 'remove') {
                console.log(chalk.red(`  │ -${change.lineNum}\t${change.text}`));
            }
            else if (change.type === 'add') {
                console.log(chalk.green(`  │ +${change.lineNum}\t${change.text}`));
            }
            else if (change.type === 'separator') {
                console.log(chalk.gray('  │ ···'));
            }
        }
        console.log(chalk.cyan('  └─'));
    }
    /** Display a new file being created — shows content with line numbers */
    printNewFile(filePath, content) {
        const lines = content.split('\n');
        const shortPath = filePath.split('/').slice(-3).join('/');
        const ext = filePath.split('.').pop() || '';
        const maxPreview = 30;
        console.log(chalk.green(`  ┌─ NEW FILE: `) + chalk.white.bold(shortPath) + chalk.gray(` (${lines.length} lines)`));
        console.log(chalk.gray('  │'));
        const displayLines = lines.slice(0, maxPreview);
        for (let i = 0; i < displayLines.length; i++) {
            const lineNum = chalk.gray(`${(i + 1).toString().padStart(3)} `);
            console.log(chalk.green('  │ ') + lineNum + chalk.white(displayLines[i]));
        }
        if (lines.length > maxPreview) {
            console.log(chalk.gray(`  │ ... ${lines.length - maxPreview} more lines`));
        }
        console.log(chalk.gray('  │'));
        console.log(chalk.green('  └─'));
    }
    /** Compute a simple diff between old and new lines with context */
    computeDiff(oldLines, newLines) {
        const result = [];
        const contextSize = 2;
        const maxDiffLines = 40; // cap output to avoid flooding terminal
        // Simple line-by-line comparison for edit_file (targeted edits)
        // Find first and last differing lines
        let firstDiff = 0;
        while (firstDiff < oldLines.length && firstDiff < newLines.length && oldLines[firstDiff] === newLines[firstDiff]) {
            firstDiff++;
        }
        let oldEnd = oldLines.length - 1;
        let newEnd = newLines.length - 1;
        while (oldEnd > firstDiff && newEnd > firstDiff && oldLines[oldEnd] === newLines[newEnd]) {
            oldEnd--;
            newEnd--;
        }
        // Show context before
        const ctxStart = Math.max(0, firstDiff - contextSize);
        if (ctxStart > 0) {
            result.push({ type: 'separator', text: '', lineNum: '' });
        }
        for (let i = ctxStart; i < firstDiff; i++) {
            result.push({ type: 'context', text: oldLines[i], lineNum: `${i + 1}` });
        }
        // Show removed lines
        let lines = 0;
        for (let i = firstDiff; i <= oldEnd && lines < maxDiffLines; i++, lines++) {
            result.push({ type: 'remove', text: oldLines[i], lineNum: `${i + 1}` });
        }
        // Show added lines
        for (let i = firstDiff; i <= newEnd && lines < maxDiffLines; i++, lines++) {
            result.push({ type: 'add', text: newLines[i], lineNum: `${i + 1}` });
        }
        if (lines >= maxDiffLines) {
            result.push({ type: 'separator', text: '(diff truncated)', lineNum: '' });
        }
        // Show context after
        const ctxEnd = Math.min(newLines.length, newEnd + 1 + contextSize);
        for (let i = newEnd + 1; i < ctxEnd; i++) {
            result.push({ type: 'context', text: newLines[i], lineNum: `${i + 1}` });
        }
        if (ctxEnd < newLines.length) {
            result.push({ type: 'separator', text: '', lineNum: '' });
        }
        return result;
    }
    printError(message) {
        console.log(chalk.red(`\n  Error: ${message}\n`));
    }
    printInfo(message) {
        console.log(chalk.blue(`  ${message}`));
    }
    printSuccess(message) {
        console.log(chalk.green(`  ${message}`));
    }
    printTokenUsage(inputTokens, outputTokens, totals) {
        const thisRequest = `↑${this.formatTokens(inputTokens)} ↓${this.formatTokens(outputTokens)}`;
        const total = `Total: ${this.formatTokens(totals.totalInput + totals.totalOutput)} tokens (${totals.requests} requests)`;
        console.log(chalk.gray(`  [${thisRequest}] ${total}`));
    }
    formatTokens(n) {
        if (n >= 1000000)
            return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000)
            return `${(n / 1000).toFixed(1)}k`;
        return `${n}`;
    }
    printDivider() {
        console.log(chalk.gray('  ' + '─'.repeat(50)));
    }
    async selectProvider() {
        const providers = [
            { name: 'Azure OpenAI', value: 'azure-openai' },
            { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
            { name: 'GCP Vertex AI', value: 'gcp-vertex' },
        ];
        console.log(chalk.cyan('\n  Select Provider:'));
        providers.forEach((p, i) => {
            const active = p.value === config_manager_1.configManager.get().activeProvider ? chalk.green(' (active)') : '';
            console.log(chalk.white(`    ${i + 1}. ${p.name}${active}`));
        });
        const answer = await this.ask('  Enter number (1-3): ');
        const idx = parseInt(answer) - 1;
        if (idx >= 0 && idx < providers.length) {
            return providers[idx].value;
        }
        return null;
    }
    async selectModel() {
        const provider = config_manager_1.configManager.get().activeProvider;
        const models = types_1.AVAILABLE_MODELS[provider];
        console.log(chalk.cyan(`\n  Available models for ${config_manager_1.configManager.getProviderDisplay()}:`));
        models.forEach((m, i) => {
            const active = m.modelId === config_manager_1.configManager.get().activeModel
                ? chalk.green(' (active)')
                : '';
            console.log(chalk.white(`    ${i + 1}. ${m.displayName}`) +
                chalk.gray(` [${m.modelId}]`) +
                active);
        });
        const answer = await this.ask(`  Enter number (1-${models.length}): `);
        const idx = parseInt(answer) - 1;
        if (idx >= 0 && idx < models.length) {
            return models[idx].modelId;
        }
        return null;
    }
    async configureProvider() {
        const provider = config_manager_1.configManager.get().activeProvider;
        console.log(chalk.cyan(`\n  Configure ${config_manager_1.configManager.getProviderDisplay()} credentials:`));
        switch (provider) {
            case 'azure-openai': {
                const endpoint = await this.ask('  Azure Endpoint (e.g. https://myresource.openai.azure.com): ');
                const apiKey = await this.ask('  API Key: ');
                const apiVersion = await this.ask('  API Version (default: 2024-12-01-preview): ');
                const deploymentName = await this.ask('  Deployment Name (optional, defaults to model name): ');
                config_manager_1.configManager.setCredentials('azure-openai', {
                    endpoint: endpoint.trim(),
                    apiKey: apiKey.trim(),
                    apiVersion: apiVersion.trim() || '2024-12-01-preview',
                    ...(deploymentName.trim() && { deploymentName: deploymentName.trim() }),
                });
                break;
            }
            case 'amazon-bedrock': {
                const accessKeyId = await this.ask('  AWS Access Key ID: ');
                const secretAccessKey = await this.ask('  AWS Secret Access Key: ');
                const region = await this.ask('  AWS Region (e.g. us-east-1): ');
                const sessionToken = await this.ask('  Session Token (optional, press Enter to skip): ');
                config_manager_1.configManager.setCredentials('amazon-bedrock', {
                    accessKeyId: accessKeyId.trim(),
                    secretAccessKey: secretAccessKey.trim(),
                    region: region.trim(),
                    ...(sessionToken.trim() && { sessionToken: sessionToken.trim() }),
                });
                break;
            }
            case 'gcp-vertex': {
                const authMethod = await this.interactiveMenu('  Authentication method:', [
                    { label: 'API Key (recommended)', value: 'apikey' },
                    { label: 'Vertex AI (Project + ADC/Service Account)', value: 'vertex' },
                ]);
                if (authMethod === 'apikey') {
                    const apiKey = await this.ask('  Gemini API Key: ');
                    config_manager_1.configManager.setCredentials('gcp-vertex', {
                        apiKey: apiKey.trim(),
                    });
                }
                else {
                    const projectId = await this.ask('  GCP Project ID: ');
                    const location = await this.ask('  Location (e.g. us-central1): ');
                    const credentialsPath = await this.ask('  Service Account JSON path (optional, uses ADC if empty): ');
                    if (credentialsPath.trim()) {
                        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath.trim();
                    }
                    config_manager_1.configManager.setCredentials('gcp-vertex', {
                        projectId: projectId.trim(),
                        location: location.trim(),
                        ...(credentialsPath.trim() && {
                            credentialsPath: credentialsPath.trim(),
                        }),
                    });
                }
                break;
            }
        }
        this.printSuccess('Credentials saved!\n');
    }
    async confirm(message) {
        const result = await this.interactiveMenu(message, [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
        ]);
        return result === 'yes';
    }
    /**
     * Show interactive menu for file changes.
     * Returns: 'apply' | 'apply_all' | 'skip' | 'retry' | 'cancel'
     */
    async selectFileAction(fileName) {
        return await this.interactiveMenu(`  Do you want to apply this edit to ${chalk.cyan(fileName)}?`, [
            { label: 'Yes', value: 'apply' },
            { label: 'Yes, allow all edits this session', value: 'apply_all', hint: 'shift+tab' },
            { label: 'No, skip this change', value: 'skip' },
            { label: 'No, try a different approach', value: 'retry' },
        ], { showEscHint: true, showTabHint: true });
    }
    /**
     * Show interactive menu for bash commands.
     * Returns: 'allow' | 'allow_all' | 'skip' | 'cancel'
     */
    async selectBashAction(command) {
        const shortCmd = command.length > 60 ? command.slice(0, 60) + '...' : command;
        return await this.interactiveMenu(`  Do you want to run: ${chalk.gray(shortCmd)}?`, [
            { label: 'Yes', value: 'allow' },
            { label: 'Yes, allow all commands this session', value: 'allow_all', hint: 'shift+tab' },
            { label: 'No, skip', value: 'skip' },
        ], { showEscHint: true });
    }
    /**
     * Arrow-key navigable interactive menu (Claude Code style).
     * Up/Down to move, Enter to select, Esc to cancel, Tab to amend.
     */
    interactiveMenu(title, options, opts) {
        return new Promise((resolve) => {
            let selected = 0;
            const totalOptions = options.length;
            // Close readline for raw mode
            this.rl.close();
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            const render = () => {
                // Move cursor up to clear previous render (except first render)
                if (renderCount > 0) {
                    // Move up: title(1) + options + hints(1)
                    const linesToClear = totalOptions + 1 + (hasHints ? 1 : 0);
                    for (let i = 0; i < linesToClear; i++) {
                        process.stdout.write('\x1b[A\x1b[K');
                    }
                }
                renderCount++;
                // Title
                console.log(title);
                // Options
                for (let i = 0; i < totalOptions; i++) {
                    const isSelected = i === selected;
                    const prefix = isSelected ? chalk.cyan('  ❯ ') : '    ';
                    const num = `${i + 1}. `;
                    const label = isSelected
                        ? chalk.white.bold(options[i].label)
                        : chalk.gray(options[i].label);
                    const hint = options[i].hint ? chalk.gray(` (${options[i].hint})`) : '';
                    console.log(`${prefix}${num}${label}${hint}`);
                }
                // Footer hints
                const hints = [];
                if (opts?.showEscHint)
                    hints.push('Esc to cancel');
                if (opts?.showTabHint)
                    hints.push('Tab to amend');
                if (hasHints) {
                    console.log(chalk.gray(`\n  ${hints.join(' · ')}`));
                }
            };
            const hasHints = !!(opts?.showEscHint || opts?.showTabHint);
            let renderCount = 0;
            const cleanup = () => {
                process.stdin.removeListener('data', onData);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                // Clear the menu
                const linesToClear = totalOptions + 1 + (hasHints ? 1 : 0);
                for (let i = 0; i < linesToClear; i++) {
                    process.stdout.write('\x1b[A\x1b[K');
                }
                // Recreate readline
                this.rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });
            };
            const onData = (data) => {
                const bytes = [...data];
                const code = bytes[0];
                // Escape sequences
                if (code === 27) {
                    // Arrow keys: ESC [ A/B
                    if (bytes[1] === 91) {
                        if (bytes[2] === 65) {
                            // Up arrow
                            selected = (selected - 1 + totalOptions) % totalOptions;
                            render();
                            return;
                        }
                        if (bytes[2] === 66) {
                            // Down arrow
                            selected = (selected + 1) % totalOptions;
                            render();
                            return;
                        }
                        // Shift+Tab: ESC [ Z
                        if (bytes[2] === 90) {
                            // Find the "allow all" option
                            const allIdx = options.findIndex((o) => o.value.includes('all'));
                            if (allIdx >= 0) {
                                cleanup();
                                console.log(chalk.green(`  ✔ ${options[allIdx].label}`));
                                resolve(options[allIdx].value);
                                return;
                            }
                        }
                    }
                    // Plain Esc (no following bytes after a brief moment)
                    if (bytes.length === 1) {
                        cleanup();
                        console.log(chalk.red('  ✘ Cancelled'));
                        resolve('cancel');
                        return;
                    }
                    return;
                }
                // Ctrl+C
                if (code === 3) {
                    cleanup();
                    console.log(chalk.red('  ✘ Cancelled'));
                    resolve('cancel');
                    return;
                }
                // Enter — select current
                if (code === 13 || code === 10) {
                    cleanup();
                    console.log(chalk.green(`  ✔ ${options[selected].label}`));
                    resolve(options[selected].value);
                    return;
                }
                // Tab — amend (same as selecting current for now)
                if (code === 9) {
                    cleanup();
                    console.log(chalk.yellow(`  ✎ Amend`));
                    resolve('retry');
                    return;
                }
                // Number keys — direct select
                const num = code - 48; // '1' = 49
                if (num >= 1 && num <= totalOptions) {
                    selected = num - 1;
                    cleanup();
                    console.log(chalk.green(`  ✔ ${options[selected].label}`));
                    resolve(options[selected].value);
                    return;
                }
            };
            process.stdin.on('data', onData);
            render();
        });
    }
    ask(question) {
        return new Promise((resolve) => {
            this.rl.question(chalk.gray(question), resolve);
        });
    }
    close() {
        this.closed = true;
        this.rl.close();
    }
}
exports.TerminalUI = TerminalUI;
//# sourceMappingURL=terminal.js.map