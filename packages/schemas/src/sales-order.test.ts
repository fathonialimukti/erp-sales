import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';
import {
  assertCartonMultiple,
  cartonCount,
  cartonErrorMessage,
  nearestCartonMultiples,
} from './sales-order';

describe('assertCartonMultiple', () => {
  it('passes on a positive multiple of the pack size', () => {
    expect(() => assertCartonMultiple(60, 20, 'Product A')).not.toThrow();
    expect(() => assertCartonMultiple(20, 20, 'Product A')).not.toThrow();
    expect(() => assertCartonMultiple(40, 20, 'Product A')).not.toThrow();
  });

  it('passes for any positive quantity when packSize is 1 (piece-only)', () => {
    expect(() => assertCartonMultiple(7, 1, 'Product B')).not.toThrow();
    expect(() => assertCartonMultiple(1, 1, 'Product B')).not.toThrow();
  });

  it('throws BAD_REQUEST naming the sku and pack size on a non-multiple', () => {
    expect(() => assertCartonMultiple(50, 20, 'Product A')).toThrow(TRPCError);
    expect(() => assertCartonMultiple(50, 20, 'Product A')).toThrow(
      'Product A is only sold per carton of 20 pcs',
    );
  });

  it('throws BAD_REQUEST on zero or negative quantity', () => {
    expect(() => assertCartonMultiple(0, 20, 'Product A')).toThrow(TRPCError);
    expect(() => assertCartonMultiple(-40, 20, 'Product A')).toThrow(TRPCError);
    expect(() => assertCartonMultiple(-3, 20, 'Product A')).toThrow(
      'Product A is only sold per carton of 20 pcs',
    );
  });

  it('throws BAD_REQUEST on a fractional quantity', () => {
    expect(() => assertCartonMultiple(20.5, 20, 'Product A')).toThrow(TRPCError);
    expect(() => assertCartonMultiple(0.5, 1, 'Product B')).toThrow(TRPCError);
  });

  it('rejects when packSize is not a positive integer (defensive)', () => {
    expect(() => assertCartonMultiple(60, 0, 'Product A')).toThrow(TRPCError);
  });

  it('shares the single pack-size message with the agent reply path', () => {
    expect(cartonErrorMessage('Product A', 20)).toBe(
      'Product A is only sold per carton of 20 pcs',
    );
    expect(() => assertCartonMultiple(50, 20, 'Product A')).toThrow(
      cartonErrorMessage('Product A', 20),
    );
  });
});

describe('cartonCount', () => {
  it('derives the carton count from pieces', () => {
    expect(cartonCount(60, 20)).toBe(3);
    expect(cartonCount(20, 20)).toBe(1);
    expect(cartonCount(7, 1)).toBe(7);
  });

  it('is the inverse of the pieces value used in money math', () => {
    const packSize = 24;
    const cartons = 2;
    const pieces = cartons * packSize;
    expect(cartonCount(pieces, packSize)).toBe(cartons);
  });
});

describe('nearestCartonMultiples', () => {
  it('brackets a non-multiple quantity with the two nearest valid multiples', () => {
    expect(nearestCartonMultiples(50, 20)).toEqual({ lower: 40, upper: 60 });
    expect(nearestCartonMultiples(25, 20)).toEqual({ lower: 20, upper: 40 });
    expect(nearestCartonMultiples(1, 20)).toEqual({ lower: 0, upper: 20 });
  });

  it('leaves an exact multiple as the lower bound', () => {
    expect(nearestCartonMultiples(60, 20)).toEqual({ lower: 60, upper: 80 });
    expect(nearestCartonMultiples(20, 20)).toEqual({ lower: 20, upper: 40 });
  });

  it('is a no-op bracket for piece-only skus', () => {
    expect(nearestCartonMultiples(7, 1)).toEqual({ lower: 7, upper: 8 });
  });

  it('never returns a negative multiple for a non-positive quantity', () => {
    expect(nearestCartonMultiples(-50, 20)).toEqual({ lower: 0, upper: 20 });
    expect(nearestCartonMultiples(0, 20)).toEqual({ lower: 0, upper: 20 });
  });
});
