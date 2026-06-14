// ============================================
// Provider Factory - Routes to correct provider
// ============================================
import { CloudProvider, IModelProvider, AppConfig } from '../types';
import { AzureOpenAIProvider } from './azure-openai';
import { AmazonBedrockProvider } from './amazon-bedrock';
import { GCPVertexProvider } from './gcp-vertex';

export class ProviderFactory {
  private static providers: Map<CloudProvider, IModelProvider> = new Map();

  static getProvider(config: AppConfig): IModelProvider {
    const existing = this.providers.get(config.activeProvider);
    if (existing) return existing;

    let provider: IModelProvider;

    switch (config.activeProvider) {
      case 'azure-openai':
        provider = new AzureOpenAIProvider(config);
        break;
      case 'amazon-bedrock':
        provider = new AmazonBedrockProvider(config);
        break;
      case 'gcp-vertex':
        provider = new GCPVertexProvider(config);
        break;
      default:
        throw new Error(`Unknown provider: ${config.activeProvider}`);
    }

    this.providers.set(config.activeProvider, provider);
    return provider;
  }

  static clearCache(): void {
    this.providers.clear();
  }
}

export { AzureOpenAIProvider } from './azure-openai';
export { AmazonBedrockProvider } from './amazon-bedrock';
export { GCPVertexProvider } from './gcp-vertex';
