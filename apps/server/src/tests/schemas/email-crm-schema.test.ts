import { describe, expect, it } from 'vitest';
import { suggestEmailReplySchema } from '@repo/schemas/email-crm';

const baseInput = { conversationId: 'conv-1' };

function makeImage(overrides: Record<string, string> = {}) {
  return { mediaType: 'image/png', url: 'data:image/png;base64,x', ...overrides };
}

describe('suggestEmailReplySchema.images', () => {
  it('parses valid input without images (images stays undefined)', () => {
    const parsed = suggestEmailReplySchema.parse(baseInput);
    expect(parsed.conversationId).toBe('conv-1');
    expect(parsed.images).toBeUndefined();
  });

  it('accepts a single image with mediaType and url', () => {
    const parsed = suggestEmailReplySchema.parse({
      ...baseInput,
      images: [makeImage()],
    });
    expect(parsed.images).toHaveLength(1);
    expect(parsed.images?.[0]).toEqual({ mediaType: 'image/png', url: 'data:image/png;base64,x' });
  });

  it('accepts exactly 4 images', () => {
    const parsed = suggestEmailReplySchema.parse({
      ...baseInput,
      images: [makeImage(), makeImage(), makeImage(), makeImage()],
    });
    expect(parsed.images).toHaveLength(4);
  });

  it('rejects 5 images (max 4)', () => {
    expect(() =>
      suggestEmailReplySchema.parse({
        ...baseInput,
        images: [makeImage(), makeImage(), makeImage(), makeImage(), makeImage()],
      }),
    ).toThrow();
  });

  it('rejects an image missing url', () => {
    const { url: _url, ...noUrl } = makeImage();
    expect(() =>
      suggestEmailReplySchema.parse({ ...baseInput, images: [noUrl] }),
    ).toThrow();
  });

  it('rejects an image missing mediaType', () => {
    const { mediaType: _mediaType, ...noMediaType } = makeImage();
    expect(() =>
      suggestEmailReplySchema.parse({ ...baseInput, images: [noMediaType] }),
    ).toThrow();
  });

  it('accepts an image with optional filename present', () => {
    const parsed = suggestEmailReplySchema.parse({
      ...baseInput,
      images: [makeImage({ filename: 'photo.png' })],
    });
    expect(parsed.images?.[0]?.filename).toBe('photo.png');
  });
});
