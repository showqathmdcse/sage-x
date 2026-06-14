"use strict";
// ============================================
// AAVA Code - Core Type Definitions
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_MODELS = void 0;
/** Available models per provider */
exports.AVAILABLE_MODELS = {
    'azure-openai': [
        // GPT-5.4 family
        { provider: 'azure-openai', modelId: 'gpt-5.4-pro', displayName: 'GPT-5.4 Pro', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'gpt-5.4', displayName: 'GPT-5.4', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        // GPT-5.2
        { provider: 'azure-openai', modelId: 'gpt-5.2', displayName: 'GPT-5.2', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        // GPT-5.1 Codex
        { provider: 'azure-openai', modelId: 'gpt-5.1-codex', displayName: 'GPT-5.1 Codex', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        // GPT-5 family
        { provider: 'azure-openai', modelId: 'gpt-5', displayName: 'GPT-5', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'gpt-5-mini', displayName: 'GPT-5 Mini', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'gpt-5-nano', displayName: 'GPT-5 Nano', maxTokens: 500000, maxOutputTokens: 16384, supportsToolCalling: true },
        // Codex
        { provider: 'azure-openai', modelId: 'codex-mini', displayName: 'Codex Mini', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        // GPT-4.1 family
        { provider: 'azure-openai', modelId: 'gpt-4.1', displayName: 'GPT-4.1', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'gpt-4.1-nano', displayName: 'GPT-4.1 Nano', maxTokens: 1000000, maxOutputTokens: 32768, supportsToolCalling: true },
        // GPT-4o family
        { provider: 'azure-openai', modelId: 'gpt-4o', displayName: 'GPT-4o', maxTokens: 128000, maxOutputTokens: 16384, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', maxTokens: 128000, maxOutputTokens: 16384, supportsToolCalling: true },
        // Reasoning models
        { provider: 'azure-openai', modelId: 'o3', displayName: 'O3', maxTokens: 200000, maxOutputTokens: 100000, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'o3-mini', displayName: 'O3 Mini', maxTokens: 200000, maxOutputTokens: 65536, supportsToolCalling: true },
        { provider: 'azure-openai', modelId: 'o4-mini', displayName: 'O4 Mini', maxTokens: 200000, maxOutputTokens: 100000, supportsToolCalling: true },
    ],
    'amazon-bedrock': [
        // Claude 8 — Anthropic
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-opus-8-0-v1:0', displayName: 'Claude Opus 8', maxTokens: 1000000, maxOutputTokens: 64000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-sonnet-8-0-v1:0', displayName: 'Claude Sonnet 8', maxTokens: 1000000, maxOutputTokens: 64000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-haiku-8-0-v1:0', displayName: 'Claude Haiku 8', maxTokens: 500000, maxOutputTokens: 32000, supportsToolCalling: true },
        // Claude 7 — Anthropic
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-opus-7-0-v1:0', displayName: 'Claude Opus 7', maxTokens: 1000000, maxOutputTokens: 64000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-sonnet-7-0-v1:0', displayName: 'Claude Sonnet 7', maxTokens: 1000000, maxOutputTokens: 32000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-haiku-7-0-v1:0', displayName: 'Claude Haiku 7', maxTokens: 500000, maxOutputTokens: 16384, supportsToolCalling: true },
        // Claude 6 — Anthropic
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-opus-6-0-v1:0', displayName: 'Claude Opus 6', maxTokens: 1000000, maxOutputTokens: 32000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-sonnet-6-0-v1:0', displayName: 'Claude Sonnet 6', maxTokens: 500000, maxOutputTokens: 32000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-haiku-6-0-v1:0', displayName: 'Claude Haiku 6', maxTokens: 500000, maxOutputTokens: 16384, supportsToolCalling: true },
        // Claude 4 — Anthropic
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-opus-4-0-20250514-v1:0', displayName: 'Claude Opus 4', maxTokens: 1000000, maxOutputTokens: 32000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-sonnet-4-6-20250514-v1:0', displayName: 'Claude Sonnet 4.6', maxTokens: 200000, maxOutputTokens: 16384, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', displayName: 'Claude Sonnet 4.5', maxTokens: 200000, maxOutputTokens: 16384, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', displayName: 'Claude Haiku 4.5', maxTokens: 200000, maxOutputTokens: 8192, supportsToolCalling: true },
        // Meta Llama
        { provider: 'amazon-bedrock', modelId: 'us.meta.llama4-maverick-17b-instruct-v1:0', displayName: 'Llama 4 Maverick 17B', maxTokens: 1000000, maxOutputTokens: 16384, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.meta.llama4-scout-17b-instruct-v1:0', displayName: 'Llama 4 Scout 17B', maxTokens: 1000000, maxOutputTokens: 16384, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'us.meta.llama3-3-70b-instruct-v1:0', displayName: 'Llama 3.3 70B', maxTokens: 128000, maxOutputTokens: 8192, supportsToolCalling: true },
        // Mistral
        { provider: 'amazon-bedrock', modelId: 'us.mistral.mistral-large-2411-v1:0', displayName: 'Mistral Large 24.11', maxTokens: 128000, maxOutputTokens: 8192, supportsToolCalling: true },
        // Amazon Nova
        { provider: 'amazon-bedrock', modelId: 'amazon.nova-pro-v1:0', displayName: 'Amazon Nova Pro', maxTokens: 300000, maxOutputTokens: 5000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'amazon.nova-lite-v1:0', displayName: 'Amazon Nova Lite', maxTokens: 300000, maxOutputTokens: 5000, supportsToolCalling: true },
        { provider: 'amazon-bedrock', modelId: 'amazon.nova-micro-v1:0', displayName: 'Amazon Nova Micro', maxTokens: 128000, maxOutputTokens: 5000, supportsToolCalling: true },
        // DeepSeek
        { provider: 'amazon-bedrock', modelId: 'us.deepseek.deepseek-r1-v1:0', displayName: 'DeepSeek R1', maxTokens: 128000, maxOutputTokens: 8192, supportsToolCalling: false },
    ],
    'gcp-vertex': [
        // Gemini 2.5
        { provider: 'gcp-vertex', modelId: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', maxTokens: 1000000, maxOutputTokens: 65536, supportsToolCalling: true },
        { provider: 'gcp-vertex', modelId: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', maxTokens: 1000000, maxOutputTokens: 65536, supportsToolCalling: true },
        // Gemini 2.0
        { provider: 'gcp-vertex', modelId: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', maxTokens: 1000000, maxOutputTokens: 8192, supportsToolCalling: true },
        { provider: 'gcp-vertex', modelId: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash Lite', maxTokens: 1000000, maxOutputTokens: 8192, supportsToolCalling: true },
        // Gemini 1.5
        { provider: 'gcp-vertex', modelId: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', maxTokens: 2000000, maxOutputTokens: 8192, supportsToolCalling: true },
        { provider: 'gcp-vertex', modelId: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', maxTokens: 1000000, maxOutputTokens: 8192, supportsToolCalling: true },
    ],
};
//# sourceMappingURL=index.js.map