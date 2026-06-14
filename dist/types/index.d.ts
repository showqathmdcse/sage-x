/** Supported cloud providers */
export type CloudProvider = 'azure-openai' | 'amazon-bedrock' | 'gcp-vertex';
/** Provider-specific model configurations */
export interface ModelConfig {
    provider: CloudProvider;
    modelId: string;
    displayName: string;
    maxTokens: number;
    maxOutputTokens: number;
    supportsToolCalling: boolean;
}
/** Available models per provider */
export declare const AVAILABLE_MODELS: Record<CloudProvider, ModelConfig[]>;
/** Role in conversation */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
/** Token usage from a provider response */
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}
/** Unified message format across all providers */
export interface Message {
    role: MessageRole;
    content: string;
    toolCallId?: string;
    toolCalls?: ToolCall[];
    usage?: TokenUsage;
}
/** Tool call request from model */
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}
/** Tool call result */
export interface ToolResult {
    toolCallId: string;
    content: string;
    isError?: boolean;
}
/** Tool definition for models */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>;
}
/** Streaming callback */
export type StreamCallback = (chunk: string) => void;
/** Provider credentials */
export interface ProviderCredentials {
    'azure-openai'?: {
        apiKey: string;
        endpoint: string;
        apiVersion: string;
        deploymentName?: string;
    };
    'amazon-bedrock'?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        sessionToken?: string;
    };
    'gcp-vertex'?: {
        projectId?: string;
        location?: string;
        credentialsPath?: string;
        apiKey?: string;
    };
}
/** App configuration */
export interface AppConfig {
    activeProvider: CloudProvider;
    activeModel: string;
    credentials: ProviderCredentials;
    maxOutputTokens: number;
    temperature: number;
    systemPrompt: string;
}
/** Unified provider interface */
export interface IModelProvider {
    name: CloudProvider;
    chat(messages: Message[], tools: ToolDefinition[], onStream?: StreamCallback): Promise<Message>;
    isConfigured(): boolean;
}
//# sourceMappingURL=index.d.ts.map