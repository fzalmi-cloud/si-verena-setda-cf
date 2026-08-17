export interface LLMProvider {
  generate(prompt: string, options?: {
    model?: string;
    responseJsonSchema?: object;
  }): Promise<string>;
}

// DeepSeek Provider (OpenAI Compatible)
export class DeepSeekProvider implements LLMProvider {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private defaultModel: string
  ) {}

  async generate(prompt: string, options?: {
    model?: string;
    responseJsonSchema?: object;
  }): Promise<string> {
    const model = options?.model || this.defaultModel;
    
    const body: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah asisten AI untuk verifikasi dokumen perencanaan pemerintahan Indonesia. Berikan jawaban yang akurat dan formal dalam format JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    };

    if (options?.responseJsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: any = await response.json();
    return data.choices[0].message.content;
  }
}

// Workers AI — Primary (GRATIS!)
export class WorkersAIProvider implements LLMProvider {
  constructor(private ai: Ai) {}

  async generate(prompt: string, options?: {
    model?: string;
    responseJsonSchema?: object;
  }): Promise<string> {
    const model = options?.model || '@cf/qwen/qwen3-30b-a3b-fp8';
    
    const response = await this.ai.run(model, {
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah asisten AI untuk verifikasi dokumen perencanaan pemerintahan Indonesia. Berikan jawaban yang akurat dan formal dalam format JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: options?.responseJsonSchema 
        ? { type: 'json_object' } 
        : undefined,
    });

    return (response as any).response;
  }
}

// Factory function
export function getLLMProvider(env: any): LLMProvider {
  // Gunakan DeepSeek API gratis yang direquest
  return new DeepSeekProvider(
    "https://q5dh1rfszfym23hj.us-east-2.aws.endpoints.huggingface.cloud/v1",
    env.DEEPSEEK_API_KEY || "bebas", // API Key: bebas, isi apa saja (seperti request Anda)
    "deepseek-ai/DeepSeek-V4-Flash-0731" // Model: deepseek-ai/DeepSeek-V4-Flash-0731
  );
}
