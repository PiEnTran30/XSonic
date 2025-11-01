"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProviderRegistry = exports.ElevenLabsProvider = exports.OpenAIProvider = void 0;
class OpenAIProvider {
    constructor(apiKey) {
        this.name = "openai";
        this.type = "asr";
        this.apiKey = apiKey;
    }
    async isAvailable() {
        return !!this.apiKey;
    }
    async transcribe(audioUrl, language) {
        throw new Error("Not implemented - requires OpenAI API integration");
    }
}
exports.OpenAIProvider = OpenAIProvider;
class ElevenLabsProvider {
    constructor(apiKey) {
        this.name = "elevenlabs";
        this.type = "tts";
        this.apiKey = apiKey;
    }
    async isAvailable() {
        return !!this.apiKey;
    }
    async synthesize(text, voice) {
        throw new Error("Not implemented - requires ElevenLabs API integration");
    }
}
exports.ElevenLabsProvider = ElevenLabsProvider;
class AIProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    register(provider) {
        this.providers.set(`${provider.type}:${provider.name}`, provider);
    }
    get(type, name) {
        return this.providers.get(`${type}:${name}`);
    }
    async getAvailableProviders(type) {
        const available = [];
        for (const [key, provider] of this.providers) {
            if (provider.type === type && (await provider.isAvailable())) {
                available.push(provider);
            }
        }
        return available;
    }
}
exports.AIProviderRegistry = AIProviderRegistry;
