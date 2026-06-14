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
exports.configManager = exports.ConfigManager = void 0;
// ============================================
// Configuration Manager
// ============================================
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const types_1 = require("../types");
const CONFIG_DIR = path.join(os.homedir(), '.aava-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_SYSTEM_PROMPT = `You are AAVA Code, an AI-powered coding assistant running in the user's terminal.

## Identity & Role
- You are AAVA Code, a multi-cloud AI coding assistant.
- You help with software engineering: writing code, debugging, explaining code, refactoring, and project management.
- You are concise, direct, and action-oriented.

## Working Directory
- The user's current working directory is: {{CWD}}
- All relative file paths should be resolved from this directory.
- When the user says "this project" or "this repo", they mean the contents of this directory.

## Tool Usage Rules
- You have tools for reading/writing files, executing bash commands, and searching codebases.
- ALWAYS read a file before editing it — never guess at file contents.
- Use the search tools (grep, glob, list_directory) to explore before making assumptions.
- Prefer small, targeted edits over rewriting entire files.
- When running bash commands, prefer non-destructive commands first.

## Response Style
- Be concise. Lead with the answer or action, not reasoning.
- Use markdown formatting for code blocks, lists, and emphasis.
- When showing code changes, explain what changed and why.
- Do not repeat the user's question back to them.

## Anti-Drift Rules
- Stay focused on the user's current request. Do not go on tangents.
- If a task is ambiguous, ask a clarifying question instead of guessing.
- Do not add features, refactor code, or make improvements beyond what was asked.
- Do not apologize unnecessarily or add filler phrases.
- If you make a mistake, correct it directly without lengthy explanations.`;
const DEFAULT_CONFIG = {
    activeProvider: 'azure-openai',
    activeModel: 'gpt-4o',
    credentials: {},
    maxOutputTokens: 16384,
    temperature: 0.7,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
};
class ConfigManager {
    config;
    constructor() {
        this.config = this.load();
    }
    load() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
                const saved = JSON.parse(raw);
                // Always use the latest built-in system prompt and token limits
                delete saved.systemPrompt;
                delete saved.maxOutputTokens;
                return { ...DEFAULT_CONFIG, ...saved };
            }
        }
        catch {
            // fallback to defaults
        }
        return { ...DEFAULT_CONFIG };
    }
    save() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    }
    get() {
        // Use per-model output token limit
        const models = types_1.AVAILABLE_MODELS[this.config.activeProvider];
        const activeModel = models?.find((m) => m.modelId === this.config.activeModel);
        const maxOutputTokens = activeModel?.maxOutputTokens || this.config.maxOutputTokens;
        return {
            ...this.config,
            maxOutputTokens,
            systemPrompt: this.config.systemPrompt.replace('{{CWD}}', process.cwd()),
        };
    }
    setProvider(provider) {
        this.config.activeProvider = provider;
        // Set default model for the provider
        const models = types_1.AVAILABLE_MODELS[provider];
        if (models && models.length > 0) {
            this.config.activeModel = models[0].modelId;
        }
        this.save();
    }
    setModel(modelId) {
        this.config.activeModel = modelId;
        this.save();
    }
    setCredentials(provider, creds) {
        this.config.credentials[provider] = creds;
        this.save();
    }
    getProviderDisplay() {
        const providerNames = {
            'azure-openai': 'Azure OpenAI',
            'amazon-bedrock': 'Amazon Bedrock',
            'gcp-vertex': 'GCP Vertex AI',
        };
        return providerNames[this.config.activeProvider];
    }
    getModelDisplay() {
        const models = types_1.AVAILABLE_MODELS[this.config.activeProvider];
        const model = models?.find((m) => m.modelId === this.config.activeModel);
        return model?.displayName || this.config.activeModel;
    }
    isProviderConfigured() {
        const creds = this.config.credentials[this.config.activeProvider];
        if (!creds)
            return false;
        switch (this.config.activeProvider) {
            case 'azure-openai':
                return !!(creds.apiKey && creds.endpoint);
            case 'amazon-bedrock':
                return !!(creds.accessKeyId &&
                    creds.secretAccessKey &&
                    creds.region);
            case 'gcp-vertex':
                return !!(creds.apiKey || (creds.projectId && creds.location));
            default:
                return false;
        }
    }
}
exports.ConfigManager = ConfigManager;
exports.configManager = new ConfigManager();
//# sourceMappingURL=config-manager.js.map