import { z } from 'zod';
import { PRODUCT_TYPES } from '../../models/Product.js';
import { STOCK_REASONS } from '../../models/StockLedger.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const adjustStockSchema = z.object({
  body: z.object({
    productId: objectId,
    godownId: objectId,
    qtyChange: z.number().refine((v) => v !== 0, 'qtyChange cannot be 0'),
    reason: z.enum(['opening', 'adjustment']),
    note: z.string().trim().max(300).optional(),
  }),
});

export const transferStockSchema = z.object({
  body: z.object({
    productId: objectId,
    fromGodownId: objectId,
    toGodownId: objectId,
    qty: z.number().positive(),
    note: z.string().trim().max(300).optional(),
  }).refine((d) => d.fromGodownId !== d.toGodownId, { message: 'from and to godowns must differ' }),
});

export const reserveStockSchema = z.object({
  body: z.object({
    orderId: objectId,
    items: z.array(z.object({
      productId: objectId,
      godownId: objectId.optional(),
      qty: z.number().positive(),
    })).min(1, 'At least one item required'),
  }),
});

export const orderActionSchema = z.object({
  body: z.object({ orderId: objectId }),
});

export const listBalanceQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    type: z.enum(PRODUCT_TYPES).optional(),
    godownId: objectId.optional(),
    onlyLowStock: z.enum(['true', 'false']).optional(),
    onlyWithStock: z.enum(['true', 'false']).optional(),
  }),
});

export const listLedgerQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    productId: objectId.optional(),
    godownId: objectId.optional(),
    reason: z.enum(STOCK_REASONS).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const listReservationsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    orderId: objectId.optional(),
    status: z.enum(['active', 'consumed', 'released']).optional(),
  }),
});