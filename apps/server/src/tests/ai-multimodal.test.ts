import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OnlyTextModelError,
  analyzeImageTool,
  getMultimodalModelId,
  hasImageParts,
} from '../lib/ai-multimodal.js';
import { getSecretValue, getSettingValue } from '../lib/settings-service.js';

vi.mock('../lib/settings-service.js', () => ({
  getSettingValue: vi.fn(),
  getSecretValue: vi.fn(),
}));

const mockedGetSettingValue = vi.mocked(getSettingValue);
const mockedGetSecretValue = vi.mocked(getSecretValue);

/** Runs `getMultimodalModelId` against the given settings map (DB not used). */
function runWithSettings(settings: Record<string, unknown>) {
  mockedGetSettingValue.mockImplementation(async (_db, key) => settings[key]);
  return getMultimodalModelId({} as never);
}

describe('hasImageParts', () => {
  it('returns false for empty or non-message input', () => {
    expect(hasImageParts([])).toBe(false);
    expect(hasImageParts(null as unknown as unknown[])).toBe(false);
    expect(hasImageParts(undefined as unknown as unknown[])).toBe(false);
    expect(hasImageParts('nope' as unknown as unknown[])).toBe(false);
    expect(hasImageParts([{ role: 'user', content: 'hi' }])).toBe(false);
  });

  it('detects a file part with an image mediaType', () => {
    const messages = [
      { role: 'user', parts: [{ type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,x' }] },
    ];
    expect(hasImageParts(messages)).toBe(true);
  });

  it('detects a legacy image part inside content', () => {
    const messages = [
      { role: 'user', content: [{ type: 'image', image: 'data:image/png;base64,x' }] },
    ];
    expect(hasImageParts(messages)).toBe(true);
  });

  it('returns false when the only file part is not an image', () => {
    const messages = [
      { role: 'user', parts: [{ type: 'file', mediaType: 'application/pdf', url: 'data:application/pdf;base64,x' }] },
    ];
    expect(hasImageParts(messages)).toBe(false);
  });

  it('never throws on malformed entries', () => {
    expect(() => hasImageParts([{ parts: 'nope' }])).not.toThrow();
    expect(() => hasImageParts([null, { parts: 42 }, { content: 7 }])).not.toThrow();
  });
});

describe('getMultimodalModelId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ai.model when multimodal is enabled', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': true, 'ai.model': 'qwen2.5vl:7b' }),
    ).resolves.toBe('qwen2.5vl:7b');
  });

  it('throws OnlyTextModelError when multimodal is disabled (model present)', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': false, 'ai.model': 'qwen2.5vl:7b' }),
    ).rejects.toThrow(OnlyTextModelError);
  });

  it('throws OnlyTextModelError when multimodal is disabled (model absent)', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': false, 'ai.model': 'chatbot' }),
    ).rejects.toThrow(OnlyTextModelError);
  });

  it('throws OnlyTextModelError when multimodal is not set', async () => {
    await expect(
      runWithSettings({ 'ai.model': 'qwen2.5vl:7b' }),
    ).rejects.toThrow(OnlyTextModelError);
  });

  it('throws OnlyTextModelError when enabled but ai.model is empty', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': true, 'ai.model': '' }),
    ).rejects.toThrow(OnlyTextModelError);
  });

  it('throws OnlyTextModelError when enabled but ai.model is whitespace', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': true, 'ai.model': '   ' }),
    ).rejects.toThrow(OnlyTextModelError);
  });

  it('accepts string "true" for the enabled flag', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': 'true', 'ai.model': 'qwen2.5vl:7b' }),
    ).resolves.toBe('qwen2.5vl:7b');
  });

  it('accepts string "1" for the enabled flag', async () => {
    await expect(
      runWithSettings({ 'ai.multimodalEnabled': '1', 'ai.model': 'qwen2.5vl:7b' }),
    ).resolves.toBe('qwen2.5vl:7b');
  });
});

describe('analyzeImageTool', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has a description and an execute function', () => {
    const toolDef = analyzeImageTool({} as never);
    expect(typeof (toolDef as { description?: unknown }).description).toBe('string');
    expect((toolDef as { description?: unknown }).description).not.toBe('');
    expect(typeof toolDef.execute).toBe('function');
  });

  it('throws OnlyTextModelError when no multimodal model is configured', async () => {
    mockedGetSettingValue.mockImplementation(async (_db, key) =>
      key === 'ai.model' ? 'chatbot' : '',
    );
    const toolDef = analyzeImageTool({} as never);
    await expect(
      toolDef.execute({ image: 'data:image/png;base64,x' }, {} as never),
    ).rejects.toThrow(OnlyTextModelError);
    expect(mockedGetSecretValue).not.toHaveBeenCalled();
  });
});