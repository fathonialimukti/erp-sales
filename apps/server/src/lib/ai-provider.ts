import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { wrapLanguageModel } from 'ai';

const localProvider = createOpenAICompatible({
    name: '9router',
    baseURL: process.env.AI_BASE_URL ?? 'http://localhost:20128/v1',
    apiKey: process.env.AI_API_KEY ?? 'sk-a269cec57930fc82-1bvmkj-87bd8cdc',
    supportsStructuredOutputs: true,
});

const baseModel = localProvider(process.env.AI_MODEL ?? 'chatbot');

const devtoolsEnabled =
    process.env.NODE_ENV !== 'production' &&
    (process.env.AI_DEVTOOLS_ENABLED ?? 'true') !== 'false';

export const chatModel = devtoolsEnabled
    ? wrapLanguageModel({
        model: baseModel,
        middleware: devToolsMiddleware(),
    })
    : baseModel;
