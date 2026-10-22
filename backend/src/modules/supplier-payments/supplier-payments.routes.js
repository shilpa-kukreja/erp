import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import { createPaymentSchema } from './supplier-payments.validators.js';
import * as ctrl from './supplier-payments.controller.js';

const WRITE = [ROLES.OWNER, ROLES.OFFICE];
const READ = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE, ROLES.DISPATCH];

const router = express.Router();
router.use(authenticate);

router.post('/', authorize(...WRITE), validate(createPaymentSchema), ctrl.create);
router.get('/aging', authorize(...READ), ctrl.aging);

export default router;