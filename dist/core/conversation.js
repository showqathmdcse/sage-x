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
exports.ConversationEngine = void 0;
// ============================================
// Conversation Engine - The main loop
// ============================================
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const providers_1 = require("../providers");
const tools_1 = require("../tools");
const fileTools = __importStar(require("../tools/file-tools"));
const config_manager_1 = require("../config/config-manager");
const CONVERSATIONS_DIR = path.join(os.homedir(), '.aava-code', 'conversations');
// Read-only bash commands that don't need approval
const READ_ONLY_COMMANDS = [
    'find', 'ls', 'cat', 'head', 'tail', 'wc', 'file', 'stat',
    'grep', 'rg', 'ag', 'awk', 'sed', 'sort', 'uniq', 'diff',
    'tree', 'du', 'df', 'which', 'whereis', 'type', 'echo',
    'pwd', 'whoami', 'date', 'uname', 'env', 'printenv',
    'git log', 'git status', 'git diff', 'git show', 'git branch',
    'git remote', 'git tag', 'git blame', 'git rev-parse',
    'java -version', 'javac -version', 'node -v', 'npm -v',
    'python --version', 'pip list', 'mvn -v', 'gradle -v',
];
class ConversationEngine {
    messages = [];
    ui;
    maxToolIterations = 50; // allow complex multi-step tasks
    tokenUsage = { totalInput: 0, totalOutput: 0, requests: 0 };
    workspaceReadApproved = false;
    autoApproveEdits = false;
    autoApproveCommands = false;
    constructor(ui) {
        this.ui = ui;
        this.initSystemMessage();
    }
    initSystemMessage() {
        const config = config_manager_1.configManager.get();
        this.messages = [
            {
                role: 'system',
                content: config.systemPrompt,
            },
        ];
    }
    /** Ask for workspace read access once at the start */
    async requestWorkspaceAccess() {
        if (this.workspaceReadApproved)
            return;
        this.ui.printInfo(`Workspace: ${process.cwd()}`);
        const granted = await this.ui.confirm('  Grant read access to this folder?');
        this.workspaceReadApproved = granted;
        if (granted) {
            this.ui.printSuccess('  Read access granted. Read operations will run without asking.');
        }
        else {
            this.ui.printInfo('  Read access denied. Each operation will require approval.');
        }
        console.log();
    }
    /** Check if a bash command is read-only */
    isReadOnlyBash(command) {
        const trimmed = command.trim();
        // Check if the command starts with a known read-only command
        return READ_ONLY_COMMANDS.some((cmd) => {
            if (trimmed === cmd)
                return true;
            if (trimmed.startsWith(cmd + ' '))
                return true;
            // Handle piped commands — check if ALL parts are read-only
            if (trimmed.includes('|')) {
                return trimmed.split('|').every((part) => {
                    const p = part.trim();
                    return READ_ONLY_COMMANDS.some((c) => p === c || p.startsWith(c + ' '));
                });
            }
            return false;
        });
    }
    clearHistory() {
        this.initSystemMessage();
        this.tokenUsage = { totalInput: 0, totalOutput: 0, requests: 0 };
        this.ui.printInfo('Conversation cleared.');
    }
    getMessages() {
        return this.messages;
    }
    getTokenUsage() {
        return { ...this.tokenUsage };
    }
    addTokens(input, output) {
        this.tokenUsage.totalInput += input;
        this.tokenUsage.totalOutput += output;
        this.tokenUsage.requests++;
    }
    /** Save conversation to a file */
    saveConversation(name) {
        if (!fs.existsSync(CONVERSATIONS_DIR)) {
            fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = name
            ? `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
            : `conversation-${timestamp}.json`;
        const filepath = path.join(CONVERSATIONS_DIR, filename);
        const data = {
            savedAt: new Date().toISOString(),
            cwd: process.cwd(),
            provider: config_manager_1.configManager.get().activeProvider,
            model: config_manager_1.configManager.get().activeModel,
            tokenUsage: this.tokenUsage,
            messages: this.messages,
        };
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        return filepath;
    }
    /** Load conversation from a file */
    loadConversation(nameOrPath) {
        let filepath = nameOrPath;
        // If not an absolute path, look in conversations dir
        if (!path.isAbsolute(filepath)) {
            // Try with and without .json extension
            const withExt = filepath.endsWith('.json') ? filepath : `${filepath}.json`;
            filepath = path.join(CONVERSATIONS_DIR, withExt);
        }
        if (!fs.existsSync(filepath)) {
            return false;
        }
        try {
            const raw = fs.readFileSync(filepath, 'utf-8');
            const data = JSON.parse(raw);
            this.messages = data.messages || [];
            if (data.tokenUsage) {
                this.tokenUsage = data.tokenUsage;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /** List saved conversations */
    listConversations() {
        if (!fs.existsSync(CONVERSATIONS_DIR))
            return [];
        return fs.readdirSync(CONVERSATIONS_DIR)
            .filter((f) => f.endsWith('.json'))
            .sort()
            .reverse();
    }
    /** Compact conversation — summarize older messages to save context */
    async compact() {
        // Keep system message + last 4 messages, summarize everything else
        if (this.messages.length <= 5) {
            this.ui.printInfo('Conversation is already short, nothing to compact.');
            return;
        }
        const systemMsg = this.messages[0];
        const toSummarize = this.messages.slice(1, -4);
        const recentMessages = this.messages.slice(-4);
        // Build a summary prompt
        const summaryText = toSummarize
            .filter((m) => m.role !== 'tool')
            .map((m) => `[${m.role}]: ${m.content.slice(0, 500)}`)
            .join('\n');
        const summaryMessage = {
            role: 'user',
            content: `[CONTEXT SUMMARY — The following is a summary of our earlier conversation]\n\n${summaryText}\n\n[END SUMMARY — Continue from here]`,
        };
        const oldCount = this.messages.length;
        this.messages = [systemMsg, summaryMessage, ...recentMessages];
        this.ui.printSuccess(`Compacted: ${oldCount} messages → ${this.messages.length} messages`);
    }
    async chat(userInput) {
        this.messages.push({ role: 'user', content: userInput });
        const config = config_manager_1.configManager.get();
        const provider = providers_1.ProviderFactory.getProvider(config);
        if (!provider.isConfigured()) {
            this.ui.printError(`${config_manager_1.configManager.getProviderDisplay()} is not configured. Run /config to set credentials.`);
            return;
        }
        const tools = tools_1.toolRegistry.getDefinitions();
        let iterations = 0;
        // Start listening for Esc to cancel
        this.ui.startEscListener();
        while (iterations < this.maxToolIterations) {
            iterations++;
            // Check if user pressed Esc
            if (this.ui.wasCancelled()) {
                this.ui.printInfo('Request cancelled by user.');
                break;
            }
            try {
                // Start thinking spinner
                this.ui.startThinking();
                // Call model with streaming — collect full text for markdown rendering
                let streamStarted = false;
                let streamedText = '';
                const response = await provider.chat(this.messages, tools, (chunk) => {
                    // Stop spinner on first chunk
                    if (!streamStarted) {
                        this.ui.stopThinking();
                        console.log(); // newline before response
                        streamStarted = true;
                    }
                    streamedText += chunk;
                    this.ui.printStream(chunk);
                });
                // If no streaming happened (non-stream response), stop spinner
                if (!streamStarted) {
                    this.ui.stopThinking();
                }
                // Re-render as markdown if we streamed text
                if (streamStarted && streamedText.trim()) {
                    // Clear streamed raw text and re-render with markdown
                    process.stdout.write('\r\x1b[K'); // clear current line
                    // Move cursor up to overwrite raw streamed lines
                    const lineCount = streamedText.split('\n').length;
                    for (let i = 0; i < lineCount; i++) {
                        process.stdout.write('\x1b[A\x1b[K');
                    }
                    this.ui.renderMarkdown(streamedText);
                }
                else if (streamStarted) {
                    this.ui.endStream();
                }
                // Track token usage
                if (response.usage) {
                    this.addTokens(response.usage.inputTokens, response.usage.outputTokens);
                    this.ui.printTokenUsage(response.usage.inputTokens, response.usage.outputTokens, this.tokenUsage);
                }
                // Check cancellation after API response
                if (this.ui.wasCancelled()) {
                    this.ui.stopThinking();
                    break;
                }
                // Add assistant response to history
                this.messages.push(response);
                // If no tool calls, we're done
                if (!response.toolCalls || response.toolCalls.length === 0) {
                    if (!streamStarted && response.content) {
                        console.log();
                        this.ui.printAssistant(response.content);
                    }
                    console.log();
                    break;
                }
                // Execute tool calls
                let cancelRequest = false;
                console.log();
                for (const toolCall of response.toolCalls) {
                    // Also check global Esc cancellation
                    if (this.ui.wasCancelled()) {
                        cancelRequest = true;
                    }
                    if (cancelRequest) {
                        // User cancelled — skip remaining tool calls with placeholder results
                        this.messages.push({
                            role: 'tool',
                            content: 'Request cancelled by user.',
                            toolCallId: toolCall.id,
                        });
                        continue;
                    }
                    this.ui.printToolCall(toolCall.name, toolCall.arguments);
                    // For file-modifying tools: show diff preview BEFORE writing
                    if (toolCall.name === 'edit_file' || toolCall.name === 'write_file') {
                        const preview = toolCall.name === 'edit_file'
                            ? fileTools.previewEditFile(toolCall.arguments)
                            : fileTools.previewWriteFile(toolCall.arguments);
                        // If preview returned an error string, report it
                        if (typeof preview === 'string') {
                            this.ui.printToolResult(toolCall.name, preview, true);
                            this.messages.push({
                                role: 'tool',
                                content: preview,
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                        // Show the diff
                        this.ui.printDiff(preview.filePath, preview.oldContent, preview.newContent);
                        // Auto-approve if user previously chose "allow all edits"
                        let action;
                        if (this.autoApproveEdits) {
                            action = 'apply';
                            this.ui.printSuccess('  ✔ Auto-approved (allow all edits)');
                        }
                        else {
                            const fileName = path.basename(preview.filePath);
                            action = await this.ui.selectFileAction(fileName);
                        }
                        if (action === 'apply_all') {
                            this.autoApproveEdits = true;
                            action = 'apply';
                            this.ui.printInfo('All future edits this session will be auto-approved.');
                        }
                        if (action === 'cancel') {
                            cancelRequest = true;
                            this.messages.push({
                                role: 'tool',
                                content: 'User cancelled the entire request. Stop all work.',
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                        if (action === 'skip') {
                            this.messages.push({
                                role: 'tool',
                                content: 'User skipped this change.',
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                        if (action === 'retry') {
                            this.messages.push({
                                role: 'tool',
                                content: 'User rejected these changes and wants a different approach. Try a different implementation.',
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                        // action === 'apply'
                        const result = fileTools.applyDiff(preview);
                        this.ui.printSuccess(`  ${result}`);
                        this.messages.push({
                            role: 'tool',
                            content: result,
                            toolCallId: toolCall.id,
                        });
                        continue;
                    }
                    // For bash: auto-approve read-only commands if workspace access granted
                    if (toolCall.name === 'bash') {
                        const command = toolCall.arguments.command || '';
                        const isReadOnly = this.isReadOnlyBash(command);
                        // Skip approval for read-only or auto-approved commands
                        if ((this.workspaceReadApproved && isReadOnly) || this.autoApproveCommands) {
                            this.ui.startToolSpinner(toolCall.name);
                            const result = await tools_1.toolRegistry.execute(toolCall);
                            this.ui.stopToolSpinner(toolCall.name, !result.isError);
                            if (result.isError) {
                                this.ui.printToolResult(toolCall.name, result.content, true);
                            }
                            this.messages.push({
                                role: 'tool',
                                content: result.content,
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                        let action = await this.ui.selectBashAction(command);
                        if (action === 'allow_all') {
                            this.autoApproveCommands = true;
                            action = 'allow';
                            this.ui.printInfo('All future commands this session will be auto-approved.');
                        }
                        if (action === 'cancel') {
                            cancelRequest = true;
                            this.messages.push({
                                role: 'tool',
                                content: 'User cancelled the entire request. Stop all work.',
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                        if (action === 'skip') {
                            this.messages.push({
                                role: 'tool',
                                content: 'User skipped this command.',
                                toolCallId: toolCall.id,
                            });
                            continue;
                        }
                    }
                    // Execute non-file tools normally
                    this.ui.startToolSpinner(toolCall.name);
                    const result = await tools_1.toolRegistry.execute(toolCall);
                    this.ui.stopToolSpinner(toolCall.name, !result.isError);
                    if (result.isError) {
                        this.ui.printToolResult(toolCall.name, result.content, true);
                    }
                    // Add tool result to messages
                    this.messages.push({
                        role: 'tool',
                        content: result.content,
                        toolCallId: toolCall.id,
                    });
                }
                // If user cancelled, stop the agentic loop
                if (cancelRequest) {
                    this.ui.printInfo('Request cancelled.');
                    break;
                }
            }
            catch (err) {
                this.ui.stopThinking(); // ensure spinner is cleared on error
                this.ui.printError(err.message);
                // Remove the user message that caused the failure so it doesn't
                // leave stale/empty messages in the conversation history
                if (iterations === 1) {
                    this.messages.pop();
                }
                break;
            }
        }
        if (iterations >= this.maxToolIterations) {
            this.ui.printError('Max tool iterations reached. Stopping.');
        }
        // Stop Esc listener and restore readline for the next prompt
        this.ui.stopEscListener();
    }
}
exports.ConversationEngine = ConversationEngine;
//# sourceMappingURL=conversation.js.map