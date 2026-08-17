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
      max_tokens: 4096,
    };

    if (options?.responseJsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    // Dukungan baseUrl yang sudah berakhir /v1
    const base = this.baseUrl.endsWith('/v1') ? this.baseUrl : `${this.baseUrl}/v1`;

    const response = await fetch(`${base}/chat/completions`, {
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
      // response_format JSON tidak didukung semua model; instruksi JSON sudah ada di prompt.
    });

    return (response as any).response;
  }
}

// Factory function
// PENTING:
// 1. Jangan edit worker dari DASHBOARD Cloudflare (Quick Edit / secret) —
//    itu akan menimpa kode dengan snapshot lama. Pakai wrangler/API.
// 2. Workers AI (binding AI) gratis & selalu hidup = provider UTAMA.
// 3. DeepSeek resmi (api.deepseek.com) opsional: set LLM_PROVIDER=deepseek
//    + DEEPSEEK_API_KEY (key asli dari platform.deepseek.com).
export function getLLMProvider(env: any): LLMProvider {
  const provider = (env.LLM_PROVIDER || 'workers').toLowerCase();

  // DeepSeek resmi (OpenAI-compatible) bila diminta eksplisit & ada key asli
  if (provider === 'deepseek' && env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY !== 'bebas') {
    return new DeepSeekProvider('https://api.deepseek.com', env.DEEPSEEK_API_KEY, 'deepseek-chat');
  }

  // Workers AI — default (gratis, terikat binding AI)
  if (env.AI) {
    return new WorkersAIProvider(env.AI);
  }

  // Fallback DeepSeek HuggingFace (endpoint lama) bila ada key
  if (env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY !== 'bebas') {
    return new DeepSeekProvider(
      "https://q5dh1rfszfym23hj.us-east-2.aws.endpoints.huggingface.cloud/v1",
      env.DEEPSEEK_API_KEY,
      "deepseek-ai/DeepSeek-V4-Flash-0731"
    );
  }

  return new WorkersAIProvider(env.AI);
}
