import express from 'express';
import validate from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import {
  createUnitSchema, updateUnitSchema, listUnitsQuery, idParam,
  createGodownSchema, updateGodownSchema, listGodownsQuery,
  createProductSchema, updateProductSchema, listProductsQuery,
  createPartySchema, updatePartySchema, listPartiesQuery, effectivePriceQuery,
} from './masterdata.validators.js';
import * as ctrl from './masterdata.controller.js';

const READ = [ROLES.OWNER, ROLES.OFFICE, ROLES.STORE, ROLES.DISPATCH];
const WRITE = [ROLES.OWNER, ROLES.OFFICE];

const router = express.Router();
router.use(authenticate);

// Units
router.get('/units', authorize(...READ), validate(listUnitsQuery), ctrl.listUnits);
router.post('/units', authorize(...WRITE), validate(createUnitSchema), ctrl.createUnit);
router.patch('/units/:id', authorize(...WRITE), validate(updateUnitSchema), ctrl.updateUnit);

// Godowns
router.get('/godowns', authorize(...READ), validate(listGodownsQuery), ctrl.listGodowns);
router.post('/godowns', authorize(...WRITE), validate(createGodownSchema), ctrl.createGodown);
router.patch('/godowns/:id', authorize(...WRITE), validate(updateGodownSchema), ctrl.updateGodown);

// Products
router.get('/products', authorize(...READ), validate(listProductsQuery), ctrl.listProducts);
router.get('/products/:id', authorize(...READ), validate(idParam), ctrl.getProduct);
router.post('/products', authorize(...WRITE), validate(createProductSchema), ctrl.createProduct);
router.patch('/products/:id', authorize(...WRITE), validate(updateProductSchema), ctrl.updateProduct);

// Parties
router.get('/parties', authorize(...READ), validate(listPartiesQuery), ctrl.listParties);
router.get('/parties/:id', authorize(...READ), validate(idParam), ctrl.getParty);
router.post('/parties', authorize(...WRITE), validate(createPartySchema), ctrl.createParty);
router.patch('/parties/:id', authorize(...WRITE), validate(updatePartySchema), ctrl.updateParty);
router.get('/parties/:partyId/effective-price/:productId', authorize(...READ), validate(effectivePriceQuery), ctrl.effectivePrice);

// Seed
router.post('/seed-defaults', authorize(ROLES.OWNER), ctrl.seedDefaults);


// After existing units routes:
router.delete('/units/:id', authorize(ROLES.OWNER), validate(idParam), ctrl.deleteUnit);

// After existing godowns routes:
router.delete('/godowns/:id', authorize(ROLES.OWNER), validate(idParam), ctrl.deleteGodown);

// After existing products routes:
router.delete('/products/:id', authorize(ROLES.OWNER), validate(idParam), ctrl.deleteProduct);

// After existing parties routes:
router.delete('/parties/:id', authorize(ROLES.OWNER), validate(idParam), ctrl.deleteParty);

export default router;