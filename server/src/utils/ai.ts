import { getAIConfig } from "./db-config";

type ConfigReader = {
    get(key: string): Promise<unknown>;
};

// AI Provider presets with their default API URLs
const AI_PROVIDER_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    claude: "https://api.anthropic.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
    deepseek: "https://api.deepseek.com/v1",
};

// Cloudflare Worker AI models mapping (short name -> full model ID)
// Categorized by high-performance free-tier models (where available)
export const WORKER_AI_MODELS: Record<string, string> = {
    // Text Models
    "llama-3.3-70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "llama-3.1-8b": "@cf/meta/llama-3.1-8b-instruct",
    "llama-3-8b": "@cf/meta/llama-3-8b-instruct",
    "qwen-2.5-coder-32b": "@cf/qwen/qwen2.5-coder-32b-instruct",
    "qwen-2.5-7b": "@cf/qwen/qwen2.5-7b-instruct",
    "mistral-7b-v0.3": "@cf/mistral/mistral-7b-instruct-v0.3",
    "gemma-2b": "@cf/google/gemma-2b-it-lora",
    "deepseek-r1-distill-qwen-32b": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",

    // Image Generation Models
    "flux-1-schnell": "@cf/black-forest-labs/flux-1-schnell",
    "stable-diffusion-xl": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    "dreamshaper-8": "@cf/lykon/dreamshaper-8-lcm",

    // Audio / Speech Models
    "whisper": "@cf/openai/whisper",
    "whisper-large-v3": "@cf/openai/whisper-large-v3-turbo",
};

export const AI_TEXT_MODELS = [
    "deepseek-r1-distill-qwen-32b",
    "llama-3.3-70b",
    "llama-3.1-8b",
    "llama-3-8b",
    "qwen-2.5-coder-32b",
    "qwen-2.5-7b",
    "mistral-7b-v0.3",
    "gemma-2b",
    "qwen-1.5-7b-chat"
];

export const AI_IMAGE_MODELS = ["flux-1-schnell", "stable-diffusion-xl", "dreamshaper-8"];

export const AI_AUDIO_MODELS = ["whisper"];

export const AI_SUMMARY_SYSTEM_PROMPT =
    "你是一个专业的中文内容摘要专家。请根据用户提供的文章内容，生成一段简洁、精准且吸引人的摘要。要求：\n1. 使用自然平实的中文，不要使用AI感明显的词汇（如'本文通过...','综上所述'等）。\n2. 摘要应包含文章核心要点，长度控制在150-300字之间。请务必保证输出内容的完整性，不要在句子中途停止。\n3. 直接输出摘要内容，不要包含标题、项目符号或任何前缀。";

export const AI_TAGS_SYSTEM_PROMPT =
    "你是一个文章标签提取助手。请根据用户提供的文章内容，提取3-5个最相关的中文标签。要求：\n1. 标签应简短有力，每个不超过6个字。\n2. 优先提取核心主题、技术栈或关键人物。\n3. 直接输出标签，以空格分隔，不要输出任何其他内容。";

export const AI_REFORMAT_SYSTEM_PROMPT =
    "你是一个专业的排版助手。请对用户提供的Markdown文章进行优化排版。要求：\n1. 修复错别字和不通顺的句子。\n2. 统一标点符号（使用全角中文标点）。\n3. 在中英文之间增加空格。\n4. 优化层级结构，确保逻辑清晰。\n5. 保持原文的Markdown格式，不要修改核心意思。";

/**
 * Get full Worker AI model ID from short name
 */
export function getWorkerAIModelId(shortName: string): string {
    if (!shortName) return "";

    // If it starts with @cf/, it is already a stable slug
    if (shortName.startsWith("@cf/")) {
        return shortName;
    }

    // Check our stable mappings first
    if (WORKER_AI_MODELS[shortName]) {
        return WORKER_AI_MODELS[shortName];
    }

    // If it is a UUID, it might be a transient ID from a previous discovery.
    // We should log this as it might cause 5007 errors.
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shortName);
    if (isUUID) {
        console.warn(`[AI] Warning: Using a UUID as model ID: ${shortName}. This may cause 5007 errors.`);
    }

    return shortName;
}

export function normalizeExternalAIBaseUrl(apiUrl: string): string {
    return apiUrl
        .trim()
        .replace(/\/+$/g, "")
        .replace(/\/chat\/completions$/i, "");
}

export function buildExternalAIChatCompletionsUrl(
    provider: string,
    apiUrl: string,
): string {
    const normalizedApiUrl = normalizeExternalAIBaseUrl(apiUrl || AI_PROVIDER_URLS[provider] || "");
    if (!normalizedApiUrl) {
        throw new Error("API URL not configured");
    }

    return `${normalizedApiUrl}/chat/completions`;
}

function extractAIText(response: unknown): string | null {
    let text = null;
    if (typeof response === "string") {
        text = response;
    } else if (response && typeof response === "object") {
        const responseObj = response as Record<string, any>;

        if (typeof responseObj.response === "string") text = responseObj.response;
        else if (typeof responseObj.content === "string") text = responseObj.content;
        else if (typeof responseObj.output === "string") text = responseObj.output;
        else if (typeof responseObj.result === "string") text = responseObj.result;
        else if (typeof responseObj.result?.response === "string") text = responseObj.result.response;
        else if (typeof responseObj.result?.text === "string") text = responseObj.result.text;
        else if (typeof responseObj.result?.completion === "string") text = responseObj.result.completion;
        else {
            const choices = responseObj.choices;
            if (Array.isArray(choices) && choices.length > 0) {
                const message = choices[0].message;
                if (message && typeof message.content === "string") {
                    text = message.content.trim();
                }
            }

            if (!text) {
                const output = responseObj.output;
                if (Array.isArray(output) && output.length > 0 && Array.isArray(output[0].content)) {
                    const contentItem = output[0].content[0];
                    if (contentItem && typeof contentItem.text === "string") {
                        text = contentItem.text.trim();
                    }
                }
            }
        }
    }

    if (text) {
        // Strip reasoning/thinking tags common in models like DeepSeek
        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        text = text.replace(/<think>[\s\S]*$/g, "").trim();
        return text;
    }

    return null;
}

/**
 * Execute Worker AI request
 */
async function executeWorkerAI(
    env: Env,
    modelId: string,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string | null> {
    if (!env.AI || typeof env.AI.run !== "function") {
        throw new Error("Workers AI binding is not configured");
    }

    // Worker AI uses messages format for chat models
    const response = await env.AI.run(getWorkerAIModelId(modelId) as any, {
        messages,
        max_tokens: 2048, // Increase max tokens for summaries and reformatting
    } as any);

    return extractAIText(response);
}

async function executeWorkerAIImage(
    env: Env,
    modelId: string,
    prompt: string
): Promise<ArrayBuffer> {
    if (!env.AI || typeof env.AI.run !== "function") {
        throw new Error("Workers AI binding is not configured");
    }

    let response: any;

    // Check if the model is one of the newer ones that might prefer/require multipart or specific formatting
    const isNewModel = modelId.includes("wan") || modelId.includes("flux-2");

    if (isNewModel) {
        // Use multipart form data for newer models as recommended in recent docs
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("width", "1024");
        form.append("height", "1024");

        response = await env.AI.run(getWorkerAIModelId(modelId) as any, {
            multipart: {
                body: form as any,
                contentType: "multipart/form-data"
            }
        } as any);
    } else {
        // Standard prompt format
        response = await env.AI.run(getWorkerAIModelId(modelId) as any, {
            prompt
        } as any);
    }

    if (response instanceof Uint8Array || response instanceof ArrayBuffer) {
        return response as ArrayBuffer;
    }

    // Common base64 conversion utility
    const base64ToBuffer = (base64: string) => {
        const binaryString = typeof atob === "function"
            ? atob(base64)
            : Buffer.from(base64, "base64").toString("binary");

        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const respObj = response as any;

    // 1. Check for top-level image field (most models)
    if (typeof respObj.image === "string") return base64ToBuffer(respObj.image);

    // 2. Check for result object (newer Workers AI wrapper)
    if (respObj.result) {
        if (typeof respObj.result.image === "string") return base64ToBuffer(respObj.result.image);
        if (typeof respObj.result === "string") return base64ToBuffer(respObj.result);
    }

    // 3. Check for output array (Flux 2 Dev format)
    if (Array.isArray(respObj.output) && respObj.output[0]) {
        const out = respObj.output[0];
        if (typeof out.bytes === "string") return base64ToBuffer(out.bytes);
        if (typeof out === "string") return base64ToBuffer(out);
    }

    throw new Error(`Invalid image response from model ${modelId}: ${JSON.stringify(response).slice(0, 100)}`);
}

/**
 * Execute external AI API request
 */
async function executeExternalAI(
    config: {
        provider: string;
        model: string;
        api_key: string;
        api_url: string;
    },
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string | null> {
    const { provider, model, api_key, api_url } = config;

    if (!api_key) {
        throw new Error("API key not configured");
    }

    const finalApiUrl = buildExternalAIChatCompletionsUrl(provider, api_url);

    const response = await fetch(finalApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${api_key}`,
        },
        body: JSON.stringify({
            model: model,
            messages,
            max_tokens: 500,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    return extractAIText(data);
}

/**
 * Test AI model configuration
 */
export async function testAIModel(
    env: Env,
    config: {
        provider: string;
        model: string;
        api_key?: string;
        api_url?: string;
    },
    testPrompt: string
): Promise<{ success: boolean; response?: string; error?: string; details?: string }> {
    try {
        let result: string | null;

        if (config.provider === 'worker-ai') {
            const fullModelName = getWorkerAIModelId(config.model);
            console.log(`[Test AI] Using Worker AI model: ${fullModelName}`);
            result = await executeWorkerAI(env, fullModelName, [
                { role: "user", content: testPrompt },
            ]);
        } else {
            result = await executeExternalAI({
                provider: config.provider,
                model: config.model,
                api_key: config.api_key || '',
                api_url: config.api_url || '',
            }, [
                { role: "user", content: testPrompt },
            ]);
        }

        if (result) {
            return { 
                success: true, 
                response: result,
            };
        } else {
            return { 
                success: false, 
                error: `Empty response from AI provider "${config.provider}" using model "${config.model}"`
            };
        }
    } catch (error: any) {
        return processAIError(error, config.model, config.provider);
    }
}

/**
 * Generate AI summary for article content
 */
export async function generateAISummary(
    env: Env, 
    serverConfig: ConfigReader,
    content: string
): Promise<string | null> {
    const result = await generateAISummaryResult(env, serverConfig, content);
    return result.summary;
}

export async function executeAITask(
    env: Env,
    serverConfig: ConfigReader,
    content: string,
    systemPrompt: string,
    maxTokens = 1024
): Promise<{ result: string | null; skipped: boolean; error?: string }> {
    const config = await getAIConfig(serverConfig);

    if (!config.enabled) {
        return { result: null, skipped: true };
    }

    const { provider, model } = config;
    const maxContentLength = 10000;
    const truncatedContent = content.length > maxContentLength
        ? content.slice(0, maxContentLength) + "..."
        : content;
    const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: truncatedContent },
    ];

    try {
        let result: string | null;

        if (provider === 'worker-ai') {
            const fullModelName = getWorkerAIModelId(model);
            result = await executeWorkerAI(
                env, 
                fullModelName, 
                messages,
            );
        } else {
            result = await executeExternalAI({
                ...config,
                model: config.model, // Ensure we use the configured model
            }, messages);
        }

        if (!result || !result.trim()) {
            return {
                result: null,
                skipped: false,
                error: `Empty response from AI provider "${provider}" using model "${model}"`,
            };
        }

        return { result: result, skipped: false };
    } catch (error) {
        console.error(`[AI Task] Failed:`, error);
        return {
            result: null,
            skipped: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function generateAISummaryResult(
    env: Env,
    serverConfig: ConfigReader,
    content: string
): Promise<{ summary: string | null; skipped: boolean; error?: string }> {
    // For large articles, we only use the first 5000 characters to ensure robustness
    // Usually the beginning of an article contains the core information needed for a summary.
    // We strip markdown images and excessive whitespace first.
    const cleanContent = content
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const summaryInput = cleanContent.length > 5000 ? cleanContent.slice(0, 5000) : cleanContent;
    const { result, skipped, error } = await executeAITask(env, serverConfig, summaryInput, AI_SUMMARY_SYSTEM_PROMPT, 512);

    // Ensure the summary is not cut off in the middle of a sentence
    let finalSummary = result;
    if (finalSummary && finalSummary.length > 0) {
        // Find the last complete sentence punctuation
        const punctuations = ['。', '！', '？', '.', '!', '?'];
        let lastIdx = -1;
        for (const p of punctuations) {
            lastIdx = Math.max(lastIdx, finalSummary.lastIndexOf(p));
        }

        if (lastIdx !== -1 && lastIdx < finalSummary.length - 1) {
            // If the summary is long enough, cut it at the last punctuation.
            // If it's too short, we keep it as is (maybe the AI just didn't finish).
            if (lastIdx > 100) {
                finalSummary = finalSummary.slice(0, lastIdx + 1);
            }
        }
    }

    return { summary: finalSummary, skipped, error };
}

/**
 * Generate an image from a prompt using Workers AI
 */
export async function generateAIImage(
    env: Env,
    serverConfig: ConfigReader,
    prompt: string
): Promise<{ image: ArrayBuffer | null; error?: string }> {
    const config = await getAIConfig(serverConfig);
    if (!config.enabled || config.provider !== 'worker-ai') {
        return { image: null, error: "AI not enabled or only supported with Worker AI" };
    }

    try {
        const model = (config as any).image_model || AI_IMAGE_MODELS[0]; // Use configured image model
        const fullModelName = getWorkerAIModelId(model);
        const image = await executeWorkerAIImage(env, fullModelName, prompt);
        return { image };
    } catch (error) {
        return {
            image: null,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Process AI error and return user-friendly message
 */
function processAIError(
    error: any, 
    model: string, 
    provider: string
): { success: false; error: string; details?: string } {
    const originalMessage = error.message || "Unknown error";
    console.error("[AI] Error:", error);

    let errorMessage = originalMessage;
    let errorDetails = "";

    if (originalMessage.includes("fetch failed") || originalMessage.includes("NetworkError")) {
        errorMessage = "Network error: Unable to connect to AI service";
        errorDetails = "Please check your API URL and network connection.";
    } else if (originalMessage.includes("Workers AI binding is not configured")) {
        errorMessage = "Workers AI is not configured";
        errorDetails = "Add the Cloudflare Workers AI binding before testing the worker-ai provider.";
    } else if (originalMessage.includes("401") || originalMessage.includes("Unauthorized")) {
        errorMessage = "Authentication failed: Invalid API key";
        errorDetails = "Please check your API key is correct and not expired.";
    } else if (originalMessage.includes("429")) {
        errorMessage = "Rate limit exceeded";
        errorDetails = "Too many requests. Please wait a moment.";
    } else if (originalMessage.includes("404") || originalMessage.includes("5007")) {
        errorMessage = "Model not found or unavailable (5007)";
        errorDetails = `Model "${model}" could not be found or is not available in your region. Try another model.`;
    } else if (originalMessage.includes("500") || originalMessage.includes("503") || originalMessage.includes("temporarily unavailable")) {
        errorMessage = "AI service temporarily unavailable";
        errorDetails = "Cloudflare Workers AI may be experiencing a temporary outage or rate limit. Please try again in a few minutes or switch models.";
    } else if (originalMessage.includes("Invalid")) {
        errorMessage = `AI model error: ${originalMessage}`;
        errorDetails = `Model "${model}" may not be supported. Please verify the model ID.`;
    }

    return { 
        success: false, 
        error: errorMessage,
        details: errorDetails || `Original: ${originalMessage}`
    };
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: string): string[] {
    if (provider === 'worker-ai') {
        return Object.keys(WORKER_AI_MODELS);
    }
    return [];
}

/**
 * Check if provider requires API key
 */
export function requiresApiKey(provider: string): boolean {
    return provider !== 'worker-ai';
}
