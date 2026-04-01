import { Router } from 'express';
import * as warehouseController from '../controllers/warehouse.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getWarehousesQuerySchema,
  warehouseParamSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  getLocationsQuerySchema,
  locationParamSchema,
  createLocationSchema,
  updateLocationSchema
} from '../schemas/warehouse.schema';

const router = Router();

router.use(authenticate);

// WAREHOUSE
router.get(
  '/',
  requirePermission('warehouses:read'),
  validateRequest(getWarehousesQuerySchema),
  warehouseController.getWarehouses
);

router.get(
  '/:id',
  requirePermission('warehouses:read'),
  validateRequest(warehouseParamSchema),
  warehouseController.getWarehouseById
);

router.post(
  '/',
  requirePermission('warehouses:create'),
  validateRequest(createWarehouseSchema),
  warehouseController.createWarehouse
);

router.patch(
  '/:id',
  requirePermission('warehouses:update'),
  validateRequest(updateWarehouseSchema),
  warehouseController.updateWarehouse
);

// WAREHOUSE LOCATIONS
router.get(
  '/locations/search',
  requirePermission('warehouses:read'),
  validateRequest(getLocationsQuerySchema),
  warehouseController.getLocations
);

router.get(
  '/locations/:id',
  requirePermission('warehouses:read'),
  validateRequest(locationParamSchema),
  warehouseController.getLocationById
);

router.post(
  '/locations',
  requirePermission('warehouses:update'), // Update kho = tao location
  validateRequest(createLocationSchema),
  warehouseController.createLocation
);

router.patch(
  '/locations/:id',
  requirePermission('warehouses:update'),
  validateRequest(updateLocationSchema),
  warehouseController.updateLocation
);

export default router;
