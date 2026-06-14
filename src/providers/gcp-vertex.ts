// ============================================
// GCP Vertex AI / Google GenAI Provider (Gemini)
// ============================================
import {
  IModelProvider,
  Message,
  ToolDefinition,
  StreamCallback,
  AppConfig,
} from '../types';

export class GCPVertexProvider implements IModelProvider {
  name: 'gcp-vertex' = 'gcp-vertex';
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    const creds = this.config.credentials['gcp-vertex'];
    if (!creds) return false;
    // Either API key or project+location must be set
    return !!(creds.apiKey || (creds.projectId && creds.location));
  }

  private useApiKey(): boolean {
    return !!this.config.credentials['gcp-vertex']?.apiKey;
  }

  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    onStream?: StreamCallback
  ): Promise<Message> {
    if (this.useApiKey()) {
      return this.chatWithGenAI(messages, tools, onStream);
    }
    return this.chatWithVertexAI(messages, tools, onStream);
  }

  // ─── Google GenAI SDK (API Key) ────────────────────────────────────

  private async chatWithGenAI(
    messages: Message[],
    tools: ToolDefinition[],
    onStream?: StreamCallback
  ): Promise<Message> {
    const { GoogleGenAI } = await import('@google/genai');

    const creds = this.config.credentials['gcp-vertex']!;
    const ai = new GoogleGenAI({ apiKey: creds.apiKey! });

    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    const genaiContents = this.convertMessagesForGenAI(chatMessages);

    const genaiTools = tools.length > 0 ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    }] : undefined;

    if (onStream) {
      return this.streamChatGenAI(ai, genaiContents, genaiTools, systemMessage?.content, onStream);
    }

    const response = await ai.models.generateContent({
      model: this.config.activeModel,
      contents: genaiContents,
      config: {
        maxOutputTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
        systemInstruction: systemMessage?.content,
        tools: genaiTools,
      },
    });

    return this.parseGenAIResponse(response);
  }

  private async streamChatGenAI(
    ai: any,
    contents: any[],
    tools: any[] | undefined,
    systemInstruction: string | undefined,
    onStream: StreamCallback
  ): Promise<Message> {
    const response = await ai.models.generateContentStream({
      model: this.config.activeModel,
      contents,
      config: {
        maxOutputTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
        systemInstruction,
        tools,
      },
    });

    let fullContent = '';
    const toolCalls: any[] = [];

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          fullContent += part.text;
          onStream(part.text);
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }
    }

    const result: Message = { role: 'assistant', content: fullContent };
    if (toolCalls.length > 0) {
      result.toolCalls = toolCalls;
    }
    if (response.usageMetadata) {
      result.usage = {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      };
    }
    return result;
  }

  private convertMessagesForGenAI(messages: Message[]): any[] {
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: msg.toolCallId || 'tool',
              response: { result: msg.content },
            },
          }],
        });
        continue;
      }

      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments,
            },
          });
        }
        contents.push({ role: 'model', parts });
        continue;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    return contents;
  }

  private parseGenAIResponse(response: any): Message {
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('Empty response from Gemini');
    }

    const parts = candidates[0].content?.parts || [];
    let textContent = '';
    const toolCalls: any[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    const result: Message = { role: 'assistant', content: textContent };

    if (response.usageMetadata) {
      result.usage = {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      };
    }

    if (toolCalls.length > 0) {
      result.toolCalls = toolCalls;
    }
    return result;
  }

  // ─── Vertex AI SDK (Project + Location) ────────────────────────────

  private async chatWithVertexAI(
    messages: Message[],
    tools: ToolDefinition[],
    onStream?: StreamCallback
  ): Promise<Message> {
    const { VertexAI } = await import('@google-cloud/vertexai');

    const creds = this.config.credentials['gcp-vertex']!;

    const vertexAI = new VertexAI({
      project: creds.projectId!,
      location: creds.location!,
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: this.config.activeModel,
      generationConfig: {
        maxOutputTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
      },
      tools: tools.length > 0 ? this.convertTools(tools) : undefined,
      systemInstruction: messages.find((m) => m.role === 'system')
        ? { role: 'user', parts: [{ text: messages.find((m) => m.role === 'system')!.content }] }
        : undefined,
    });

    const geminiContents = this.convertMessages(
      messages.filter((m) => m.role !== 'system')
    );

    if (onStream) {
      return this.streamChat(generativeModel, geminiContents, onStream);
    }

    const result = await generativeModel.generateContent({
      contents: geminiContents,
    });

    return this.parseGeminiResponse(result.response);
  }

  private convertTools(tools: ToolDefinition[]): any[] {
    return [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];
  }

  private convertMessages(messages: Message[]): any[] {
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: msg.toolCallId || 'tool',
              response: { result: msg.content },
            },
          }],
        });
        continue;
      }

      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments,
            },
          });
        }
        contents.push({ role: 'model', parts });
        continue;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    return contents;
  }

  private parseGeminiResponse(response: any): Message {
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('Empty response from Vertex AI');
    }

    const parts = candidates[0].content?.parts || [];
    let textContent = '';
    const toolCalls: any[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    const result: Message = { role: 'assistant', content: textContent };

    if (response.usageMetadata) {
      result.usage = {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      };
    }

    if (toolCalls.length > 0) {
      result.toolCalls = toolCalls;
    }
    return result;
  }

  private async streamChat(
    model: any,
    contents: any[],
    onStream: StreamCallback
  ): Promise<Message> {
    const streamResult = await model.generateContentStream({ contents });

    let fullContent = '';
    const toolCalls: any[] = [];

    for await (const chunk of streamResult.stream) {
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          fullContent += part.text;
          onStream(part.text);
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }
    }

    const result: Message = { role: 'assistant', content: fullContent };
    if (toolCalls.length > 0) {
      result.toolCalls = toolCalls;
    }
    return result;
  }
}
