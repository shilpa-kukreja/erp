import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const paise = z.number().int().min(0);

const itemSchema = z.object({
  productId: objectId,
  qty: z.number().positive(),
  ratePaise: paise,
  taxRate: z.number().min(0).max(28),
});

export const createPurchaseSchema = z.object({
  body: z.object({
    supplierId: objectId,
    godownId: objectId,
    billNo: z.string().trim().min(1).max(40),
    billDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
    dueDate: z.string().optional().nullable().refine((s) => !s || !isNaN(Date.parse(s)), 'Invalid date'),
    items: z.array(itemSchema).min(1, 'At least one item'),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const idParam = z.object({ params: z.object({ id: objectId }) });

export const listPurchaseQuery = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    supplierId: objectId.optional(),
    godownId: objectId.optional(),
    status: z.enum(['draft', 'confirmed']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});