import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createReturnSchema = z.object({
  body: z.object({
    purchaseBillId: objectId,
    items: z.array(
      z.object({
        productId: objectId,
        qty: z.number().positive(),
      })
    ).min(1, 'At least one item required'),
    reason: z.string().trim().max(500).optional(),
  }),
});

export const listReturnsQuery = z.object({
  query: z.object({
    purchaseBillId: objectId.optional(),
  }),
});