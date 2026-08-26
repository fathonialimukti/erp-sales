import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, tool } from 'ai';
import * as z from 'zod';
import { getSecretValue, getSettingValue } from './settings-service.js';
import type { DbClient } from './prisma.js';

/**
 * Thrown when no multimodal (vision-capable) model is configured.
 * Callers decide how to surface this (e.g. tell the user to enable
 * Multimodal support in App Settings → AI provider).
 */
export class OnlyTextModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnlyTextModelError';
  }
}

/**
 * Resolve the model id to use for image analysis. When `ai.multimodalEnabled`
 * is true, the same chat model (`ai.model`) performs image analysis. When
 * false (or unset), image analysis is unavailable and `OnlyTextModelError`
 * is thrown. Vision-tag auto-detection on the model id is gone.
 */
export async function getMultimodalModelId(db: DbClient): Promise<string> {
  const enabled = await getSettingValue(db, 'ai.multimodalEnabled');
  const isEnabled = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
  if (!isEnabled) {
    throw new OnlyTextModelError(
      'Multimodal support is disabled. Enable it in App Settings → AI provider.',
    );
  }
  const chatModel = String(await getSettingValue(db, 'ai.model')).trim();
  if (!chatModel) {
    throw new OnlyTextModelError('ai.model is not configured. Set the AI model to enable image analysis.');
  }
  return chatModel;
}

/**
 * True when any message carries an image part (`type: 'file'` with mediaType
 * starting `image/`, or legacy `type: 'image'` parts inside `content`).
 * Defensive — never throws on malformed input.
 */
export function hasImageParts(messages: unknown[]): boolean {
  if (!Array.isArray(messages)) return false;

  const hasFilePart = (parts: unknown): boolean => {
    if (!Array.isArray(parts)) return false;
    return parts.some((part) => {
      if (!part || typeof part !== 'object') return false;
      const p = part as { type?: unknown; mediaType?: unknown; image?: unknown };
      return (
        p.type === 'file' &&
        typeof p.mediaType === 'string' &&
        p.mediaType.startsWith('image/')
      );
    });
  };

  const hasLegacyImagePart = (parts: unknown): boolean => {
    if (!Array.isArray(parts)) return false;
    return parts.some((part) => {
      return Boolean(part && typeof part === 'object' && (part as { type?: unknown }).type === 'image');
    });
  };

  return messages.some((message) => {
    if (!message || typeof message !== 'object') return false;
    const msg = message as { parts?: unknown; content?: unknown };

    if (typeof msg.content === 'string') return false;

    if (hasFilePart(msg.parts)) return true;
    if (hasLegacyImagePart(msg.content)) return true;

    // `parts` entries may themselves be the array (normalized shapes)
    if (Array.isArray(msg.parts) && msg.parts.some((p) => Array.isArray(p))) {
      return msg.parts.some((p) => hasFilePart(p) || hasLegacyImagePart(p));
    }

    return false;
  });
}

/**
 * Server-side tool that answers with the multimodal model about an image the
 * user attached. Uses the configured chat model (`ai.model`) when
 * `ai.multimodalEnabled` is on; throws `OnlyTextModelError` when it is off.
 */
export function analyzeImageTool(db: DbClient) {
  return tool({
    description:
      'Analyze an image the user attached. Use this when the user asks about an image (photo, screenshot, document scan). Returns a text description/answer.',
    inputSchema: z.object({
      image: z.string().describe('Data URL or URL of the image to analyze'),
      question: z
        .string()
        .optional()
        .describe('Optional specific question about the image'),
    }),
    execute: async ({ image, question }) => {
      const modelId = await getMultimodalModelId(db);

      const baseURL = String(await getSettingValue(db, 'ai.baseUrl')).replace(/\/$/, '');
      const apiKey = await getSecretValue(db, 'ai.apiKey');
      const provider = createOpenAICompatible({
        name: '9router-multimodal',
        baseURL,
        apiKey: apiKey || 'not-set',
      });

      const result = await generateText({
        model: provider(modelId),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', image },
              { type: 'text', text: question ?? 'Describe this image in detail.' },
            ],
          },
        ],
      });

      return result.text;
    },
  });
}

/**
 * Thin wrapper over `analyzeImageTool` — keeps call sites simple and lets the
 * tool factory be swapped (e.g. for tests) without touching callers.
 */
export function buildAnalyzeImageTool(db: DbClient) {
  return analyzeImageTool(db);
}