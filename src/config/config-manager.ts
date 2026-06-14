// ============================================
// Configuration Manager
// ============================================
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppConfig, CloudProvider, AVAILABLE_MODELS } from '../types';

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

const DEFAULT_CONFIG: AppConfig = {
  activeProvider: 'azure-openai',
  activeModel: 'gpt-4o',
  credentials: {},
  maxOutputTokens: 16384,
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): AppConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const saved = JSON.parse(raw);
        // Always use the latest built-in system prompt and token limits
        delete saved.systemPrompt;
        delete saved.maxOutputTokens;
        return { ...DEFAULT_CONFIG, ...saved };
      }
    } catch {
      // fallback to defaults
    }
    return { ...DEFAULT_CONFIG };
  }

  save(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  get(): AppConfig {
    // Use per-model output token limit
    const models = AVAILABLE_MODELS[this.config.activeProvider];
    const activeModel = models?.find((m) => m.modelId === this.config.activeModel);
    const maxOutputTokens = activeModel?.maxOutputTokens || this.config.maxOutputTokens;

    return {
      ...this.config,
      maxOutputTokens,
      systemPrompt: this.config.systemPrompt.replace('{{CWD}}', process.cwd()),
    };
  }

  setProvider(provider: CloudProvider): void {
    this.config.activeProvider = provider;
    // Set default model for the provider
    const models = AVAILABLE_MODELS[provider];
    if (models && models.length > 0) {
      this.config.activeModel = models[0].modelId;
    }
    this.save();
  }

  setModel(modelId: string): void {
    this.config.activeModel = modelId;
    this.save();
  }

  setCredentials(provider: CloudProvider, creds: any): void {
    this.config.credentials[provider] = creds;
    this.save();
  }

  getProviderDisplay(): string {
    const providerNames: Record<CloudProvider, string> = {
      'azure-openai': 'Azure OpenAI',
      'amazon-bedrock': 'Amazon Bedrock',
      'gcp-vertex': 'GCP Vertex AI',
    };
    return providerNames[this.config.activeProvider];
  }

  getModelDisplay(): string {
    const models = AVAILABLE_MODELS[this.config.activeProvider];
    const model = models?.find((m) => m.modelId === this.config.activeModel);
    return model?.displayName || this.config.activeModel;
  }

  isProviderConfigured(): boolean {
    const creds = this.config.credentials[this.config.activeProvider];
    if (!creds) return false;

    switch (this.config.activeProvider) {
      case 'azure-openai':
        return !!((creds as any).apiKey && (creds as any).endpoint);
      case 'amazon-bedrock':
        return !!(
          (creds as any).accessKeyId &&
          (creds as any).secretAccessKey &&
          (creds as any).region
        );
      case 'gcp-vertex':
        return !!((creds as any).apiKey || ((creds as any).projectId && (creds as any).location));
      default:
        return false;
    }
  }
}

export const configManager = new ConfigManager();
