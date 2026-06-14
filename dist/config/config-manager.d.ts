import { AppConfig, CloudProvider } from '../types';
export declare class ConfigManager {
    private config;
    constructor();
    private load;
    save(): void;
    get(): AppConfig;
    setProvider(provider: CloudProvider): void;
    setModel(modelId: string): void;
    setCredentials(provider: CloudProvider, creds: any): void;
    getProviderDisplay(): string;
    getModelDisplay(): string;
    isProviderConfigured(): boolean;
}
export declare const configManager: ConfigManager;
//# sourceMappingURL=config-manager.d.ts.map