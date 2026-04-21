import { Hono } from "hono";
import { wrapTime } from "hono/timing";
import type { AppContext } from "../core/hono-types";
import { setAIConfig, getAIConfig } from "../utils/db-config";
import {
    testAIModel,
    AI_TEXT_MODELS,
    AI_IMAGE_MODELS,
    AI_AUDIO_MODELS,
    WORKER_AI_MODELS,
    executeAITask,
    AI_TAGS_SYSTEM_PROMPT,
    AI_REFORMAT_SYSTEM_PROMPT,
    generateAIImage,
    generateAISummaryResult
} from "../utils/ai";
import { notify } from "../utils/webhook";
import { putStorageObject } from "../utils/storage";
import {
    buildCombinedConfigResponse,
    buildClientConfigResponse,
    buildServerConfigResponse,
    isConfigType,
    persistRegularConfig,
    resolveWebhookConfig,
    splitConfigPayload,
} from "./config-helpers";
import { buildHealthCheckResponse } from "./config-health";
import { buildQueueStatusResponse, deleteQueueStatusTask, retryQueueStatusTask } from "./config-queue-status";
import { profileAsync } from "../core/server-timing";
import {
    applyBlurhashCompatUpdate,
    buildCompatTasksResponse,
    listBlurhashCompatCandidates,
    runCompatAISummaryBackfill,
} from "./config-compat-tasks";

export function ConfigService(): Hono {
    const app = new Hono();

    function serializeBootstrapScript(config: Record<string, unknown>) {
        const serialized = JSON.stringify(config)
            .replace(/</g, "\\u003C")
            .replace(/>/g, "\\u003E")
            .replace(/&/g, "\\u0026")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029");

        return `globalThis.__RIN_CLIENT_CONFIG__=${serialized};`;
    }

    // POST /config/test-ai - Test AI model configuration
    // NOTE: Must be defined BEFORE /:type route to avoid being captured as a type parameter
    app.post('/test-ai', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const env = c.get('env');
        const serverConfig = c.get('serverConfig');
        const body = await wrapTime(c, 'request_body', c.req.json());

        // Get current AI config from database
        const config = await wrapTime(c, 'ai_config', getAIConfig(serverConfig));

        // Build test config with overrides
        const testConfig = {
            provider: body.provider || config.provider,
            model: body.model || config.model,
            api_url: body.api_url !== undefined ? body.api_url : config.api_url,
            api_key: body.api_key !== undefined ? body.api_key : config.api_key,
        };

        // Test prompt
        const testPrompt = body.testPrompt || "Hello! This is a test message. Please respond with a simple greeting.";

        // Use unified test function
        const result = await wrapTime(c, 'ai_test', testAIModel(env, testConfig, testPrompt));
        return c.json(result);
    });


    // GET /config/ai-models - List available AI models
    app.get("/ai-models", async (c: AppContext) => {
        const env = c.get("env");
        try {
            if (env.AI && typeof env.AI.models === "function") {
                const allModels = await env.AI.models();

                const textTaskIds = ["text-generation", "summarization"];
                const textModels = allModels
                    .filter(m => textTaskIds.includes(m.task.id))
                    .sort((a, b) => {
                        const aId = a.id.toLowerCase();
                        const bId = b.id.toLowerCase();

                        // Prioritize Reasoning models (DeepSeek, Llama 3.3)
                        const aReasoning = aId.includes("deepseek") || aId.includes("llama-3.3");
                        const bReasoning = bId.includes("deepseek") || bId.includes("llama-3.3");

                        if (aReasoning && !bReasoning) return -1;
                        if (!aReasoning && bReasoning) return 1;

                        // Then Popular models
                        const aPop = a.properties?.find((p: any) => p.property_id === "popular")?.value === "true";
                        const bPop = b.properties?.find((p: any) => p.property_id === "popular")?.value === "true";
                        if (aPop && !bPop) return -1;
                        if (!aPop && bPop) return 1;

                        return 0;
                    })
                    .map(m => m.id);

                return c.json({
                    text: textModels,
                    image: allModels.filter(m => m.task.id === "text-to-image").map(m => m.id),
                    audio: allModels.filter(m => m.task.id === "speech-to-text").map(m => m.id),
                    raw: true
                });
            }
        } catch (e) {
            console.error("Failed to fetch models from Workers AI API:", e);
        }

        return c.json({
            text: AI_TEXT_MODELS.map(m => WORKER_AI_MODELS[m] || m),
            image: AI_IMAGE_MODELS.map(m => WORKER_AI_MODELS[m] || m),
            audio: AI_AUDIO_MODELS.map(m => WORKER_AI_MODELS[m] || m),
            raw: false
        });
    });

    // POST /config/ai-tags - Generate tags for content
    app.post('/ai-tags', async (c: AppContext) => {
        const admin = c.get('admin');
        if (!admin) return c.text('Unauthorized', 401);

        const { content } = await c.req.json();
        const env = c.get('env');
        const serverConfig = c.get('serverConfig');

        const { result, error } = await executeAITask(env, serverConfig, content, AI_TAGS_SYSTEM_PROMPT, 128);
        if (error) return c.json({ error }, 400);

        const tags = (result || "").split(/\s+/).filter(t => t.length > 0);
        return c.json({ tags });
    });

    // POST /config/ai-reformat - Reformat markdown content
    app.post('/ai-reformat', async (c: AppContext) => {
        const admin = c.get('admin');
        if (!admin) return c.text('Unauthorized', 401);

        const { content } = await c.req.json();
        const env = c.get('env');
        const serverConfig = c.get('serverConfig');

        const { result, error } = await executeAITask(env, serverConfig, content, AI_REFORMAT_SYSTEM_PROMPT, 2048);
        if (error) return c.json({ error }, 400);

        return c.json({ content: result });
    });

    // POST /config/ai-image - Generate featured image
    app.post('/ai-image', async (c: AppContext) => {
        const admin = c.get('admin');
        if (!admin) return c.text('Unauthorized', 401);

        const { prompt } = await c.req.json();
        const env = c.get('env');
        const serverConfig = c.get('serverConfig');

        const { image, error } = await generateAIImage(env, serverConfig, prompt);
        if (error || !image) return c.json({ error: error || "Failed to generate image" }, 400);

        // Upload generated image to storage
        const fileName = `ai-gen-${Date.now()}.png`;
        const uploadResult = await putStorageObject(env, fileName, image, "image/png", new URL(c.req.url).origin);

        return c.json({ url: uploadResult.url });
    });

    // POST /config/ai-summary - Manual generate summary
    app.post('/ai-summary', async (c: AppContext) => {
        const admin = c.get('admin');
        if (!admin) return c.text('Unauthorized', 401);

        const { content } = await c.req.json();
        const env = c.get('env');
        const serverConfig = c.get('serverConfig');

        const { summary, error } = await generateAISummaryResult(env, serverConfig, content);
        if (error) return c.json({ error }, 400);

        return c.json({ summary });
    });

    app.post('/test-webhook', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const env = c.get('env');
        const serverConfig = c.get('serverConfig');
        const body = await wrapTime(c, 'request_body', c.req.json()) as {
            webhook_url?: string;
            "webhook.method"?: string;
            "webhook.content_type"?: string;
            "webhook.headers"?: string;
            "webhook.body_template"?: string;
            test_message?: string;
        };

        const {
            webhookUrl,
            webhookMethod: resolvedWebhookMethod,
            webhookContentType: resolvedWebhookContentType,
            webhookHeaders: resolvedWebhookHeaders,
            webhookBodyTemplate: resolvedWebhookBodyTemplate,
        } = await wrapTime(c, 'webhook_config', resolveWebhookConfig(serverConfig, env, body));
        const frontendUrl = new URL(c.req.url).origin;
        const testMessage = body.test_message?.trim() || "This is a test webhook message from Rin settings.";

        if (!webhookUrl || !webhookUrl.trim()) {
            return c.json({ success: false, error: "Webhook URL is required" }, 400);
        }

        try {
            const response = await wrapTime(c, 'webhook_send', notify(
                    webhookUrl,
                    {
                        event: "webhook.test",
                        message: testMessage,
                        title: "Webhook Test",
                        url: `${frontendUrl}/admin/settings`,
                        username: "admin",
                        content: testMessage,
                        description: "Manual webhook test triggered from settings.",
                    },
                    {
                        method: resolvedWebhookMethod,
                        contentType: resolvedWebhookContentType,
                        headers: resolvedWebhookHeaders,
                        bodyTemplate: resolvedWebhookBodyTemplate,
                    },
                ));

            if (!response) {
                return c.json({ success: false, error: "Webhook request was not sent" }, 400);
            }

            if (!response.ok) {
                const details = await response.text();
                return c.json({
                    success: false,
                    error: `Webhook test failed with status ${response.status}`,
                    details,
                }, 400);
            }

            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return c.json({ success: false, error: message }, 400);
        }
    });

    // GET /config
    app.get('/', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');

        return c.json(await wrapTime(c, 'config_response', buildCombinedConfigResponse(clientConfig, serverConfig, env)));
    });

    // GET /config/health
    app.get('/health', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');

        return c.json(await wrapTime(c, 'health_check', buildHealthCheckResponse(clientConfig, serverConfig, env)));
    });

    app.get('/queue-status', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const db = c.get('db');
        const env = c.get('env');

        return c.json(await wrapTime(c, 'queue_status', buildQueueStatusResponse(db, env)));
    });

    app.get('/compat-tasks', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        return c.json(await wrapTime(c, 'compat_tasks', buildCompatTasksResponse(c.get('db'), c.get('serverConfig'), c.get('env'))));
    });

    app.post('/compat-tasks/ai-summary', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        try {
            const body = c.req.header('content-type')?.includes('application/json')
                ? await wrapTime(c, 'request_body', c.req.json()) as { force?: boolean }
                : {};
            return c.json(await wrapTime(c, 'compat_ai_summary', runCompatAISummaryBackfill(c.get('db'), c.get('cache'), c.get('serverConfig'), c.get('env'), Boolean(body.force))));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return c.text(message, 400);
        }
    });

    app.get('/compat-tasks/blurhash', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        return c.json(await wrapTime(c, 'compat_blurhash_list', listBlurhashCompatCandidates(c.get('db'))));
    });

    app.post('/compat-tasks/blurhash/:id', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id) || id <= 0) {
            return c.text('Invalid feed id', 400);
        }

        const body = await wrapTime(c, 'request_body', c.req.json()) as { content?: string };
        if (!body.content) {
            return c.text('Content is required', 400);
        }

        try {
            return c.json(await wrapTime(c, 'compat_blurhash_apply', applyBlurhashCompatUpdate(c.get('db'), c.get('cache'), id, body.content)));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message === 'Feed not found' ? 404 : 400;
            return c.text(message, status);
        }
    });

    app.post('/queue-status/:id/retry', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id) || id <= 0) {
            return c.text('Invalid feed id', 400);
        }

        try {
            await wrapTime(c, 'queue_retry', retryQueueStatusTask(c.get('db'), c.get('cache'), c.get('serverConfig'), c.get('env'), id));
            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message === 'Feed not found' ? 404 : 400;
            return c.text(message, status);
        }
    });

    app.delete('/queue-status/:id', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id) || id <= 0) {
            return c.text('Invalid feed id', 400);
        }

        try {
            await wrapTime(c, 'queue_delete', deleteQueueStatusTask(c.get('db'), c.get('cache'), id));
            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message === 'Feed not found' ? 404 : 400;
            return c.text(message, status);
        }
    });

    app.get('/client/bootstrap.js', async (c: AppContext) => {
        const clientConfig = c.get('clientConfig');
        const serverConfig = c.get('serverConfig');
        const env = c.get('env');
        const profile = <T>(name: string, task: () => Promise<T>) => profileAsync(c, name, task);
        const config = await profileAsync(c, 'bootstrap_client_config', () => buildClientConfigResponse(clientConfig, serverConfig, env, profile));
        const script = await profileAsync(c, 'bootstrap_script', () => Promise.resolve(serializeBootstrapScript(config)));

        return new Response(script, {
            status: 200,
            headers: {
                'content-type': 'application/javascript; charset=utf-8',
                'cache-control': 'public, max-age=0, must-revalidate',
            },
        });
    });

    // GET /config/:type
    app.get('/:type', async (c: AppContext) => {
        const admin = c.get('admin');
        const type = c.req.param('type') || "";
        
        if (!isConfigType(type)) {
            return c.text('Invalid type', 400);
        }
        
        if (type === 'server' && !admin) {
            return c.text('Unauthorized', 401);
        }
        
        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');
        
        if (type === 'server') {
            return c.json(await buildServerConfigResponse(serverConfig, env));
        }
        
        return c.json(await buildClientConfigResponse(clientConfig, serverConfig, env));
    });

    // POST /config
    app.post('/', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');
        const body = await c.req.json() as {
            clientConfig?: Record<string, unknown>;
            serverConfig?: Record<string, unknown>;
        };

        const nextClientConfig = body.clientConfig ?? {};
        const nextServerConfig = body.serverConfig ?? {};

        const { regularConfig: regularClientConfig } = splitConfigPayload(nextClientConfig);
        const { regularConfig: regularServerConfig, aiConfigUpdates } = splitConfigPayload(nextServerConfig);

        await Promise.all([
            persistRegularConfig(clientConfig, regularClientConfig),
            persistRegularConfig(serverConfig, regularServerConfig),
        ]);

        if (Object.keys(aiConfigUpdates).length > 0) {
            await setAIConfig(serverConfig, aiConfigUpdates);
        }

        return c.json(await buildCombinedConfigResponse(clientConfig, serverConfig, env));
    });

    // POST /config/:type
    app.post('/:type', async (c: AppContext) => {
        const admin = c.get('admin');
        const type = c.req.param('type') || "";
        
        if (!isConfigType(type)) {
            return c.text('Invalid type', 400);
        }
        
        if (!admin) {
            return c.text('Unauthorized', 401);
        }
        
        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const body = await c.req.json();
        const { regularConfig, aiConfigUpdates } = splitConfigPayload(body);
        
        const config = type === 'server' ? serverConfig : clientConfig;
        await persistRegularConfig(config, regularConfig);
        
        if (Object.keys(aiConfigUpdates).length > 0) {
            await setAIConfig(serverConfig, aiConfigUpdates);
        }
        
        return c.text('OK');
    });

    // DELETE /config/cache
    app.delete('/cache', async (c: AppContext) => {
        const admin = c.get('admin');
        
        if (!admin) {
            return c.text('Unauthorized', 401);
        }
        
        const cache = c.get('cache');
        await cache.clear();
        return c.text('OK');
    });

    return app;
}
