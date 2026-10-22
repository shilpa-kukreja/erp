import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createPaymentSchema = z.object({
  body: z.object({
    supplierId: objectId,
    amountPaise: z.number().int().min(1),
    mode: z.enum(['cash', 'bank', 'upi', 'cheque']),
    referenceNo: z.string().trim().max(100).optional(),
    paidAt: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
    notes: z.string().trim().max(500).optional(),
    allocations: z.array(
      z.object({
        billId: objectId,
        amountPaise: z.number().int().min(1),
      })
    ).optional(),
  }),
});