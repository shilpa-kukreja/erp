import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import { createPurchaseSchema, idParam, listPurchaseQuery } from './purchase.validators.js';
import * as ctrl from './purchase.controller.js';

const READ = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE, ROLES.DISPATCH];
const WRITE = [ROLES.OWNER, ROLES.STORE, ROLES.OFFICE];

const router = express.Router();
router.use(authenticate);

router.get('/',        authorize(...READ), validate(listPurchaseQuery), ctrl.list);
router.get('/:id',     authorize(...READ), validate(idParam), ctrl.getOne);
router.post('/',       authorize(...WRITE), validate(createPurchaseSchema), ctrl.create);
router.post('/:id/confirm', authorize(...WRITE), validate(idParam), ctrl.confirm);

export default router;