import { IModelProvider, Message, ToolDefinition, StreamCallback, AppConfig } from '../types';
export declare class GCPVertexProvider implements IModelProvider {
    name: 'gcp-vertex';
    private config;
    constructor(config: AppConfig);
    isConfigured(): boolean;
    private useApiKey;
    chat(messages: Message[], tools: ToolDefinition[], onStream?: StreamCallback): Promise<Message>;
    private chatWithGenAI;
    private streamChatGenAI;
    private convertMessagesForGenAI;
    private parseGenAIResponse;
    private chatWithVertexAI;
    private convertTools;
    private convertMessages;
    private parseGeminiResponse;
    private streamChat;
}
//# sourceMappingURL=gcp-vertex.d.ts.map