import { Message } from '../types';
import { TerminalUI } from '../ui/terminal';
export declare class ConversationEngine {
    private messages;
    private ui;
    private maxToolIterations;
    private tokenUsage;
    private workspaceReadApproved;
    private autoApproveEdits;
    private autoApproveCommands;
    constructor(ui: TerminalUI);
    private initSystemMessage;
    /** Ask for workspace read access once at the start */
    requestWorkspaceAccess(): Promise<void>;
    /** Check if a bash command is read-only */
    private isReadOnlyBash;
    clearHistory(): void;
    getMessages(): Message[];
    getTokenUsage(): {
        totalInput: number;
        totalOutput: number;
        requests: number;
    };
    addTokens(input: number, output: number): void;
    /** Save conversation to a file */
    saveConversation(name?: string): string;
    /** Load conversation from a file */
    loadConversation(nameOrPath: string): boolean;
    /** List saved conversations */
    listConversations(): string[];
    /** Compact conversation — summarize older messages to save context */
    compact(): Promise<void>;
    chat(userInput: string): Promise<void>;
}
//# sourceMappingURL=conversation.d.ts.map