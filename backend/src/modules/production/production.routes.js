import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import {
  createBomSchema, updateBomSchema, listBomsQuery,
  createBatchSchema, completeBatchSchema, listBatchesQuery, idParam,
} from './production.validators.js';
import * as ctrl from './production.controller.js';

const READ = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE, ROLES.DISPATCH];
const WRITE = [ROLES.OWNER, ROLES.STORE, ROLES.OFFICE];

const router = express.Router();
router.use(authenticate);

// BOMs
router.get('/boms',       authorize(...READ),  validate(listBomsQuery), ctrl.listBoms);
router.get('/boms/:id',   authorize(...READ),  validate(idParam),       ctrl.getBom);
router.post('/boms',      authorize(...WRITE), validate(createBomSchema), ctrl.createBom);
router.patch('/boms/:id', authorize(...WRITE), validate(updateBomSchema), ctrl.updateBom);

// Batches
router.get('/batches',         authorize(...READ),  validate(listBatchesQuery), ctrl.listBatches);
router.get('/batches/:id',     authorize(...READ),  validate(idParam),          ctrl.getBatch);
router.post('/batches',        authorize(...WRITE), validate(createBatchSchema), ctrl.createBatch);
router.post('/batches/:id/complete', authorize(...WRITE), validate(completeBatchSchema), ctrl.completeBatch);
router.post('/batches/:id/cancel',   authorize(...WRITE), validate(idParam),             ctrl.cancelBatch);

export default router;