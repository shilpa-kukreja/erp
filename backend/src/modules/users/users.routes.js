import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
} from './users.validators.js';
import * as ctrl from './users.controller.js';

const router = express.Router();

// Every route in this module is auth + owner-only
router.use(authenticate, authorize(ROLES.OWNER));

router.get('/', validate(listUsersQuerySchema), ctrl.list);
router.post('/', validate(createUserSchema), ctrl.create);
router.get('/:id', validate(userIdParamSchema), ctrl.getOne);
router.patch('/:id', validate(updateUserSchema), ctrl.update);
router.post('/:id/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);

export default router;