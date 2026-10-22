import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const bomItemSchema = z.object({
  productId: objectId,
  qty: z.number().positive(),
});

export const createBomSchema = z.object({
  body: z.object({
    productId: objectId,
    outputQty: z.number().positive().default(1),
    items: z.array(bomItemSchema).min(1, 'At least one item'),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const updateBomSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    outputQty: z.number().positive().optional(),
    items: z.array(bomItemSchema).min(1).optional(),
    notes: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'No changes' }),
});

export const createBatchSchema = z.object({
  body: z.object({
    productId: objectId,
    godownId: objectId,
    plannedQty: z.number().positive(),
    mfgDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
    expDate: z.string().optional().nullable().refine((s) => !s || !isNaN(Date.parse(s)), 'Invalid date'),
  }),
});

export const completeBatchSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    producedQty: z.number().min(0),
    wastageQty: z.number().min(0).default(0),
    materialsOverride: z.array(z.object({
      productId: objectId,
      qtyUsed: z.number().min(0),
    })).optional(),
  }),
});

export const idParam = z.object({ params: z.object({ id: objectId }) });

export const listBomsQuery = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    productId: objectId.optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const listBatchesQuery = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    productId: objectId.optional(),
    status: z.enum(['draft', 'completed', 'cancelled']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});