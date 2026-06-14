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
exports.GCPVertexProvider = void 0;
class GCPVertexProvider {
    name = 'gcp-vertex';
    config;
    constructor(config) {
        this.config = config;
    }
    isConfigured() {
        const creds = this.config.credentials['gcp-vertex'];
        if (!creds)
            return false;
        // Either API key or project+location must be set
        return !!(creds.apiKey || (creds.projectId && creds.location));
    }
    useApiKey() {
        return !!this.config.credentials['gcp-vertex']?.apiKey;
    }
    async chat(messages, tools, onStream) {
        if (this.useApiKey()) {
            return this.chatWithGenAI(messages, tools, onStream);
        }
        return this.chatWithVertexAI(messages, tools, onStream);
    }
    // ─── Google GenAI SDK (API Key) ────────────────────────────────────
    async chatWithGenAI(messages, tools, onStream) {
        const { GoogleGenAI } = await Promise.resolve().then(() => __importStar(require('@google/genai')));
        const creds = this.config.credentials['gcp-vertex'];
        const ai = new GoogleGenAI({ apiKey: creds.apiKey });
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
    async streamChatGenAI(ai, contents, tools, systemInstruction, onStream) {
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
        const toolCalls = [];
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
        const result = { role: 'assistant', content: fullContent };
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
    convertMessagesForGenAI(messages) {
        const contents = [];
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
                const parts = [];
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
    parseGenAIResponse(response) {
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error('Empty response from Gemini');
        }
        const parts = candidates[0].content?.parts || [];
        let textContent = '';
        const toolCalls = [];
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
        const result = { role: 'assistant', content: textContent };
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
    async chatWithVertexAI(messages, tools, onStream) {
        const { VertexAI } = await Promise.resolve().then(() => __importStar(require('@google-cloud/vertexai')));
        const creds = this.config.credentials['gcp-vertex'];
        const vertexAI = new VertexAI({
            project: creds.projectId,
            location: creds.location,
        });
        const generativeModel = vertexAI.getGenerativeModel({
            model: this.config.activeModel,
            generationConfig: {
                maxOutputTokens: this.config.maxOutputTokens,
                temperature: this.config.temperature,
            },
            tools: tools.length > 0 ? this.convertTools(tools) : undefined,
            systemInstruction: messages.find((m) => m.role === 'system')
                ? { role: 'user', parts: [{ text: messages.find((m) => m.role === 'system').content }] }
                : undefined,
        });
        const geminiContents = this.convertMessages(messages.filter((m) => m.role !== 'system'));
        if (onStream) {
            return this.streamChat(generativeModel, geminiContents, onStream);
        }
        const result = await generativeModel.generateContent({
            contents: geminiContents,
        });
        return this.parseGeminiResponse(result.response);
    }
    convertTools(tools) {
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
    convertMessages(messages) {
        const contents = [];
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
                const parts = [];
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
    parseGeminiResponse(response) {
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error('Empty response from Vertex AI');
        }
        const parts = candidates[0].content?.parts || [];
        let textContent = '';
        const toolCalls = [];
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
        const result = { role: 'assistant', content: textContent };
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
    async streamChat(model, contents, onStream) {
        const streamResult = await model.generateContentStream({ contents });
        let fullContent = '';
        const toolCalls = [];
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
        const result = { role: 'assistant', content: fullContent };
        if (toolCalls.length > 0) {
            result.toolCalls = toolCalls;
        }
        return result;
    }
}
exports.GCPVertexProvider = GCPVertexProvider;
//# sourceMappingURL=gcp-vertex.js.map