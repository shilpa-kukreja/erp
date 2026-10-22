import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import { createReturnSchema, listReturnsQuery } from './purchase-returns.validators.js';
import * as ctrl from './purchase-returns.controller.js';

// Senior's prompt: purchase-returns = owner+office+store write; reads = all 4 roles
const WRITE = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE];
const READ = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE, ROLES.DISPATCH];

const router = express.Router();
router.use(authenticate);

router.get('/', authorize(...READ), validate(listReturnsQuery), ctrl.list);
router.post('/', authorize(...WRITE), validate(createReturnSchema), ctrl.create);

export default router;