import { IModelProvider, Message, ToolDefinition, StreamCallback, AppConfig } from '../types';
export declare class AzureOpenAIProvider implements IModelProvider {
    name: 'azure-openai';
    private config;
    constructor(config: AppConfig);
    isConfigured(): boolean;
    chat(messages: Message[], tools: ToolDefinition[], onStream?: StreamCallback): Promise<Message>;
    private streamChat;
}
//# sourceMappingURL=azure-openai.d.ts.map