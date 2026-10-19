import { z } from 'zod';
import { ALL_ROLES } from '../../constants/roles.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Min 2 chars').max(100),
    email: z.string().trim().email('Invalid email').toLowerCase(),
    phone: z.string().trim().optional().nullable(),
    password: z.string().min(8, 'Min 8 chars').max(72),
    role: z.enum(ALL_ROLES),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      phone: z.string().trim().optional().nullable(),
      role: z.enum(ALL_ROLES).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No changes provided' }),
});

export const userIdParamSchema = z.object({
  params: z.object({ id: objectId }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.enum(ALL_ROLES).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const resetPasswordSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ newPassword: z.string().min(8, 'Min 8 chars').max(72) }),
});