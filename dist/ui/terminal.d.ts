import { CloudProvider } from '../types';
export declare class TerminalUI {
    private rl;
    private spinner;
    private thinkingInterval;
    private thinkingStart;
    private closed;
    private escPressed;
    private escListener;
    private brand;
    constructor(brand?: 'aava' | 'sage');
    /** Mark request as started — Esc cancellation becomes available */
    startEscListener(): void;
    /** Mark request as finished — ensure terminal is in clean state */
    stopEscListener(): void;
    /** Check if Esc was pressed */
    wasCancelled(): boolean;
    /** Start the thinking spinner with Esc detection */
    startThinking(): void;
    /** Stop the thinking spinner and Esc listener */
    stopThinking(): void;
    /** Show a spinner for tool execution */
    startToolSpinner(toolName: string): void;
    /** Stop the tool spinner */
    stopToolSpinner(toolName: string, success: boolean): void;
    printBanner(): Promise<void>;
    private printAavaBanner;
    private sleep;
    private printSageBannerAnimated;
    printCurrentConfig(): void;
    printHelp(): void;
    /**
     * Prompt for input using raw mode stdin.
     * - Typed Enter on a non-empty buffer = submit
     * - Pasted newlines arrive in rapid bursts and are collected as part of the input
     * - Ctrl+C = exit, Ctrl+U = clear line, Backspace = delete char
     */
    private getMatchingCommands;
    private renderSuggestions;
    private clearSuggestions;
    prompt(): Promise<string>;
    printAssistant(text: string): void;
    printStream(chunk: string): void;
    endStream(): void;
    /** Render streamed content as markdown (call after full response is collected) */
    renderMarkdown(text: string): void;
    /** Display a human-readable description of what the tool is doing */
    printToolCall(name: string, args: Record<string, any>): void;
    printToolResult(name: string, result: string, isError?: boolean): void;
    private describeToolAction;
    /** Print a unified diff with colored +/- lines */
    printDiff(filePath: string, oldContent: string, newContent: string): void;
    /** Display a new file being created — shows content with line numbers */
    private printNewFile;
    /** Compute a simple diff between old and new lines with context */
    private computeDiff;
    printError(message: string): void;
    printInfo(message: string): void;
    printSuccess(message: string): void;
    printTokenUsage(inputTokens: number, outputTokens: number, totals: {
        totalInput: number;
        totalOutput: number;
        requests: number;
    }): void;
    private formatTokens;
    printDivider(): void;
    selectProvider(): Promise<CloudProvider | null>;
    selectModel(): Promise<string | null>;
    configureProvider(): Promise<void>;
    confirm(message: string): Promise<boolean>;
    /**
     * Show interactive menu for file changes.
     * Returns: 'apply' | 'apply_all' | 'skip' | 'retry' | 'cancel'
     */
    selectFileAction(fileName: string): Promise<'apply' | 'apply_all' | 'skip' | 'retry' | 'cancel'>;
    /**
     * Show interactive menu for bash commands.
     * Returns: 'allow' | 'allow_all' | 'skip' | 'cancel'
     */
    selectBashAction(command: string): Promise<'allow' | 'allow_all' | 'skip' | 'cancel'>;
    /**
     * Arrow-key navigable interactive menu (Claude Code style).
     * Up/Down to move, Enter to select, Esc to cancel, Tab to amend.
     */
    private interactiveMenu;
    private ask;
    close(): void;
}
//# sourceMappingURL=terminal.d.ts.map