import { z } from 'zod';
import { PRODUCT_TYPES, TAX_RATES } from '../../models/Product.js';
import { PARTY_TYPES } from '../../models/Party.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const paiseInt = z.number().int().min(0);

export const idParam = z.object({ params: z.object({ id: objectId }) });

// ===== UNITS =====
export const createUnitSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(40),
    symbol: z.string().trim().min(1).max(10),
    type: z.enum(['weight', 'volume', 'count']),
    decimalPlaces: z.number().int().min(0).max(4).optional(),
    isActive: z.boolean().optional(),
  }),
});
export const updateUnitSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(40).optional(),
    symbol: z.string().trim().min(1).max(10).optional(),
    type: z.enum(['weight', 'volume', 'count']).optional(),
    decimalPlaces: z.number().int().min(0).max(4).optional(),
    isActive: z.boolean().optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'No changes provided' }),
});
export const listUnitsQuery = z.object({
  query: z.object({
    page: z.string().optional(), limit: z.string().optional(),
    search: z.string().optional(),
    type: z.enum(['weight', 'volume', 'count']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

// ===== GODOWNS =====
export const createGodownSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    address: z.string().trim().max(300).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});
export const updateGodownSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().max(300).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'No changes provided' }),
});
export const listGodownsQuery = z.object({
  query: z.object({
    page: z.string().optional(), limit: z.string().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

// ===== PRODUCTS =====
export const createProductSchema = z.object({
  body: z.object({
    type: z.enum(PRODUCT_TYPES),
    name: z.string().trim().min(2).max(120),
    sku: z.string().trim().min(1).max(40).toUpperCase(),
    unit: objectId,
    hsnCode: z.string().trim().max(12).optional(),
    taxRate: z.number().int().refine((v) => TAX_RATES.includes(v), 'Invalid tax rate'),
    basePricePaise: paiseInt,
    costPerUnitPaise: paiseInt.optional(),
    reorderPoint: z.number().min(0).optional(),
    reorderQty: z.number().min(0).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
});
export const updateProductSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    type: z.enum(PRODUCT_TYPES).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    sku: z.string().trim().min(1).max(40).toUpperCase().optional(),
    unit: objectId.optional(),
    hsnCode: z.string().trim().max(12).optional(),
    taxRate: z.number().int().refine((v) => TAX_RATES.includes(v), 'Invalid tax rate').optional(),
    basePricePaise: paiseInt.optional(),
    costPerUnitPaise: paiseInt.optional(),
    reorderPoint: z.number().min(0).optional(),
    reorderQty: z.number().min(0).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'No changes provided' }),
});
export const listProductsQuery = z.object({
  query: z.object({
    page: z.string().optional(), limit: z.string().optional(),
    search: z.string().optional(),
    type: z.enum(PRODUCT_TYPES).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

// ===== PARTIES =====
const pricingRuleBody = z.object({ productId: objectId, pricePaise: paiseInt });

export const createPartySchema = z.object({
  body: z.object({
    type: z.enum(PARTY_TYPES),
    name: z.string().trim().min(2).max(120),
    gstin: z.string().trim().max(15).toUpperCase().optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.union([z.string().trim().email(), z.literal('')]).optional(),
    address: z.object({
      line1: z.string().trim().max(200).optional(),
      city: z.string().trim().max(60).optional(),
      state: z.string().trim().max(60).optional(),
      pincode: z.string().trim().max(10).optional(),
    }).optional(),
    pricingRules: z.array(pricingRuleBody).optional(),
    creditLimitPaise: paiseInt.optional(),
    creditDays: z.number().int().min(0).max(365).optional(),
    isActive: z.boolean().optional(),
  }),
});
export const updatePartySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    type: z.enum(PARTY_TYPES).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    gstin: z.string().trim().max(15).toUpperCase().optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.union([z.string().trim().email(), z.literal('')]).optional(),
    address: z.object({
      line1: z.string().trim().max(200).optional(),
      city: z.string().trim().max(60).optional(),
      state: z.string().trim().max(60).optional(),
      pincode: z.string().trim().max(10).optional(),
    }).optional(),
    pricingRules: z.array(pricingRuleBody).optional(),
    creditLimitPaise: paiseInt.optional(),
    creditDays: z.number().int().min(0).max(365).optional(),
    isActive: z.boolean().optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'No changes provided' }),
});
export const listPartiesQuery = z.object({
  query: z.object({
    page: z.string().optional(), limit: z.string().optional(),
    search: z.string().optional(),
    type: z.enum(PARTY_TYPES).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});
export const effectivePriceQuery = z.object({
  params: z.object({ partyId: objectId, productId: objectId }),
});