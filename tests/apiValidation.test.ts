import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1, 'Search query or MPN is required').max(150),
  manufacturer: z.string().max(100).optional(),
  technicalRequirement: z.string().max(150).optional(),
  maxSuppliers: z.number().int().min(1).max(10).optional().default(5),
  saveToDatabase: z.boolean().optional().default(false),
  useAgentFallback: z.boolean().optional().default(false),
});

const bomItemSchema = z.object({
  componentId: z.string().min(1, 'Component ID is required'),
  requiredQuantity: z.number().int().positive().default(1),
});

describe('API Route Input Validation (Zod)', () => {
  it('accepts valid component search queries', () => {
    const valid = searchSchema.safeParse({
      query: 'ESP32-WROOM-32',
      manufacturer: 'Espressif',
      technicalRequirement: '3.3V I2C',
      maxSuppliers: 5,
    });
    expect(valid.success).toBe(true);
  });

  it('rejects empty queries', () => {
    const invalid = searchSchema.safeParse({
      query: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects out-of-range supplier counts', () => {
    const invalid = searchSchema.safeParse({
      query: 'ESP32',
      maxSuppliers: 25, // Max allowed is 10
    });
    expect(invalid.success).toBe(false);
  });

  it('validates BOM items quantity must be positive integer', () => {
    const valid = bomItemSchema.safeParse({
      componentId: 'comp_123',
      requiredQuantity: 10,
    });
    expect(valid.success).toBe(true);

    const invalidZero = bomItemSchema.safeParse({
      componentId: 'comp_123',
      requiredQuantity: 0,
    });
    expect(invalidZero.success).toBe(false);

    const invalidNegative = bomItemSchema.safeParse({
      componentId: 'comp_123',
      requiredQuantity: -5,
    });
    expect(invalidNegative.success).toBe(false);
  });
});
