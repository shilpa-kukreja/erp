import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import {
  adjustStockSchema, transferStockSchema, reserveStockSchema, orderActionSchema,
  listBalanceQuerySchema, listLedgerQuerySchema, listReservationsQuerySchema,
} from './stock.validators.js';
import * as ctrl from './stock.controller.js';

const ALL = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE, ROLES.DISPATCH];

const router = express.Router();
router.use(authenticate);

// Reads — all roles
router.get('/balance',      authorize(...ALL), validate(listBalanceQuerySchema), ctrl.listBalances);
router.get('/ledger',       authorize(...ALL), validate(listLedgerQuerySchema), ctrl.listLedger);
router.get('/reservations', authorize(...ALL), validate(listReservationsQuerySchema), ctrl.listReservations);

// Physical stock actions — owner, office, store
router.post('/adjust',   authorize(ROLES.OWNER, ROLES.OFFICE, ROLES.STORE), validate(adjustStockSchema),   ctrl.adjust);
router.post('/transfer', authorize(ROLES.OWNER, ROLES.OFFICE, ROLES.STORE), validate(transferStockSchema), ctrl.transfer);

// Order-lifecycle reservation — owner, office, dispatch (dispatch triggers consume on shipment)
router.post('/reserve', authorize(ROLES.OWNER, ROLES.OFFICE), validate(reserveStockSchema), ctrl.reserve);
router.post('/release', authorize(ROLES.OWNER, ROLES.OFFICE), validate(orderActionSchema),  ctrl.release);
router.post('/consume', authorize(ROLES.OWNER, ROLES.OFFICE, ROLES.DISPATCH), validate(orderActionSchema), ctrl.consume);

export default router;