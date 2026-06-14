"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCPVertexProvider = exports.AmazonBedrockProvider = exports.AzureOpenAIProvider = exports.ProviderFactory = void 0;
const azure_openai_1 = require("./azure-openai");
const amazon_bedrock_1 = require("./amazon-bedrock");
const gcp_vertex_1 = require("./gcp-vertex");
class ProviderFactory {
    static providers = new Map();
    static getProvider(config) {
        const existing = this.providers.get(config.activeProvider);
        if (existing)
            return existing;
        let provider;
        switch (config.activeProvider) {
            case 'azure-openai':
                provider = new azure_openai_1.AzureOpenAIProvider(config);
                break;
            case 'amazon-bedrock':
                provider = new amazon_bedrock_1.AmazonBedrockProvider(config);
                break;
            case 'gcp-vertex':
                provider = new gcp_vertex_1.GCPVertexProvider(config);
                break;
            default:
                throw new Error(`Unknown provider: ${config.activeProvider}`);
        }
        this.providers.set(config.activeProvider, provider);
        return provider;
    }
    static clearCache() {
        this.providers.clear();
    }
}
exports.ProviderFactory = ProviderFactory;
var azure_openai_2 = require("./azure-openai");
Object.defineProperty(exports, "AzureOpenAIProvider", { enumerable: true, get: function () { return azure_openai_2.AzureOpenAIProvider; } });
var amazon_bedrock_2 = require("./amazon-bedrock");
Object.defineProperty(exports, "AmazonBedrockProvider", { enumerable: true, get: function () { return amazon_bedrock_2.AmazonBedrockProvider; } });
var gcp_vertex_2 = require("./gcp-vertex");
Object.defineProperty(exports, "GCPVertexProvider", { enumerable: true, get: function () { return gcp_vertex_2.GCPVertexProvider; } });
//# sourceMappingURL=index.js.map