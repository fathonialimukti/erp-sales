import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { wrapLanguageModel } from 'ai';
import { getSecretValue, getSettingValue } from './settings-service.js';
import type { DbClient } from './prisma.js';

/**
 * Lazy async getter for the chat model. Reads `ai.baseUrl` / `ai.apiKey` /
 * `ai.model` from DB settings first (via the settings service), falling back
 * to env. `AI_DEVTOOLS_ENABLED` + `NODE_ENV` stay env-only (infra concerns).
 */
export async function getChatModel(db: DbClient) {
    const baseUrl = String(await getSettingValue(db, 'ai.baseUrl')).replace(/\/$/, '');
    const apiKey = await getSecretValue(db, 'ai.apiKey');
    const model = String(await getSettingValue(db, 'ai.model'));
    const devtoolsEnabled =
        process.env.NODE_ENV !== 'production' &&
        (process.env.AI_DEVTOOLS_ENABLED ?? 'true') !== 'false';
    const provider = createOpenAICompatible({
        name: '9router',
        baseURL: baseUrl,
        apiKey,
        supportsStructuredOutputs: true,
    });
    const baseModel = provider(model);
    return devtoolsEnabled
        ? wrapLanguageModel({
            model: baseModel,
            middleware: devToolsMiddleware(),
        })
        : baseModel;
}
