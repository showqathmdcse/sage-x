// ============================================
// Azure OpenAI Provider
// ============================================
import {
  IModelProvider,
  Message,
  ToolDefinition,
  ToolCall,
  StreamCallback,
  AppConfig,
} from '../types';

export class AzureOpenAIProvider implements IModelProvider {
  name: 'azure-openai' = 'azure-openai';
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    const creds = this.config.credentials['azure-openai'];
    return !!(creds?.apiKey && creds?.endpoint);
  }

  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    onStream?: StreamCallback
  ): Promise<Message> {
    const creds = this.config.credentials['azure-openai']!;
    const deployment = creds.deploymentName || this.config.activeModel;
    const apiVersion = creds.apiVersion || '2025-04-01-preview';

    const url = `${creds.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    // Convert messages to OpenAI format
    const openaiMessages = messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: msg.toolCallId!,
          content: msg.content,
        };
      }
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      return { role: msg.role, content: msg.content };
    });

    // Convert tools to OpenAI format
    const openaiTools =
      tools.length > 0
        ? tools.map((t) => ({
            type: 'function' as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

    // GPT-5.x, GPT-4.1, GPT-4o, o-series, and Codex all use max_completion_tokens
    // Only legacy models (gpt-4-turbo, gpt-4) use the old max_tokens param
    const model = this.config.activeModel;
    const useNewTokenParam = model.startsWith('gpt-5') ||
      model.startsWith('gpt-4.1') ||
      model.startsWith('gpt-4o') ||
      model.startsWith('o3') || model.startsWith('o4') || model.startsWith('o1') ||
      model.startsWith('codex');

    const body: any = {
      messages: openaiMessages,
      ...(useNewTokenParam
        ? { max_completion_tokens: this.config.maxOutputTokens }
        : { max_tokens: this.config.maxOutputTokens }),
      temperature: this.config.temperature,
      stream: !!onStream,
      ...(onStream && { stream_options: { include_usage: true } }),
    };

    if (openaiTools) {
      body.tools = openaiTools;
    }

    if (onStream) {
      return this.streamChat(url, creds.apiKey, body, onStream);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': creds.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Azure OpenAI error (${response.status}): ${err}`);
    }

    const data: any = await response.json();
    const choice = data.choices[0];

    const result: Message = {
      role: 'assistant',
      content: choice.message.content || '',
    };

    if (data.usage) {
      result.usage = {
        inputTokens: data.usage.prompt_tokens || 0,
        outputTokens: data.usage.completion_tokens || 0,
      };
    }

    if (choice.message.tool_calls) {
      result.toolCalls = choice.message.tool_calls.map((tc: any) => {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          // Fix common JSON escape issues in tool call arguments
          try {
            // Replace bad escape sequences like \n that aren't in strings
            const fixed = tc.function.arguments
              .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
            args = JSON.parse(fixed);
          } catch {
            args = { _raw: tc.function.arguments };
          }
        }
        return { id: tc.id, name: tc.function.name, arguments: args };
      });
    }

    return result;
  }

  private async streamChat(
    url: string,
    apiKey: string,
    body: any,
    onStream: StreamCallback
  ): Promise<Message> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Azure OpenAI error (${response.status}): ${err}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let usageData: any = null;
    const toolCalls: Map<number, { id: string; name: string; args: string }> =
      new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Capture usage from final chunk
          if (parsed.usage) {
            usageData = parsed.usage;
          }

          if (delta.content) {
            fullContent += delta.content;
            onStream(delta.content);
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCalls.has(tc.index)) {
                toolCalls.set(tc.index, {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  args: '',
                });
              }
              const existing = toolCalls.get(tc.index)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments)
                existing.args += tc.function.arguments;
            }
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    const result: Message = { role: 'assistant', content: fullContent };

    if (usageData) {
      result.usage = {
        inputTokens: usageData.prompt_tokens || 0,
        outputTokens: usageData.completion_tokens || 0,
      };
    }

    if (toolCalls.size > 0) {
      result.toolCalls = Array.from(toolCalls.values()).map((tc) => {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.args || '{}');
        } catch {
          try {
            const fixed = (tc.args || '{}').replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
            args = JSON.parse(fixed);
          } catch {
            args = { _raw: tc.args };
          }
        }
        return { id: tc.id, name: tc.name, arguments: args };
      });
    }

    return result;
  }
}
