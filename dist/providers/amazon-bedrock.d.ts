import { IModelProvider, Message, ToolDefinition, StreamCallback, AppConfig } from '../types';
/**
 * Amazon Bedrock provider using direct HTTP calls with AWS Signature V4.
 * No SDK dependency — works through corporate proxies (Zscaler etc.)
 * by disabling TLS certificate verification on the request agent.
 */
export declare class AmazonBedrockProvider implements IModelProvider {
    name: 'amazon-bedrock';
    private config;
    constructor(config: AppConfig);
    isConfigured(): boolean;
    chat(messages: Message[], tools: ToolDefinition[], onStream?: StreamCallback): Promise<Message>;
    private nonStreamRequest;
    private streamRequest;
    /**
     * Parse AWS Event Stream headers to extract :event-type.
     * Header format: [name_len:1][name:N][type:1][value_len:2][value:N]
     * Type 7 = string (with 2-byte length prefix)
     */
    private parseEventHeaders;
    private httpsRequest;
    private signRequest;
    private hmac;
    /**
     * Ensure every assistant tool call has a matching tool result.
     * Bedrock rejects the request if any tool call ID is missing a result.
     */
    private sanitizeMessages;
    /**
     * Convert messages to Bedrock format, merging consecutive tool results
     * into a single 'user' message (Bedrock requires all toolResults for
     * one assistant turn to be in one message).
     */
    private buildBedrockMessages;
    private toBedrockMessage;
    private parseBedrockResponse;
    private formatError;
}
//# sourceMappingURL=amazon-bedrock.d.ts.map