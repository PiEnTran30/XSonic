export interface AIProvider {
  name: string;
  type: "asr" | "tts" | "audio-enhance" | "stem-split";
  isAvailable(): Promise<boolean>;
}

export class OpenAIProvider implements AIProvider {
  name = "openai";
  type = "asr" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async transcribe(audioUrl: string, language?: string): Promise<any> {
    throw new Error("Not implemented - requires OpenAI API integration");
  }
}

export class ElevenLabsProvider implements AIProvider {
  name = "elevenlabs";
  type = "tts" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async synthesize(text: string, voice: string): Promise<Buffer> {
    throw new Error("Not implemented - requires ElevenLabs API integration");
  }
}

export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  register(provider: AIProvider): void {
    this.providers.set(`${provider.type}:${provider.name}`, provider);
  }

  get(type: string, name: string): AIProvider | undefined {
    return this.providers.get(`${type}:${name}`);
  }

  async getAvailableProviders(type: string): Promise<AIProvider[]> {
    const available: AIProvider[] = [];
    for (const [key, provider] of this.providers) {
      if (provider.type === type && (await provider.isAvailable())) {
        available.push(provider);
      }
    }
    return available;
  }
}

