import { Router } from 'express';
import multer from 'multer';
import * as salesController from '../controllers/sales.controller';
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();

router.use(authenticate);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Basic checking for excel files
    if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml') || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)'));
    }
  }
});

// Import sales via Excel
router.post('/import', requirePermission('sales:create'), upload.single('file'), salesController.importSalesBatch);

// Get transactions list
router.get('/transactions', requirePermission('sales:read'), salesController.getTransactions);

// Get daily summaries list
router.get('/summaries', requirePermission('sales:read'), salesController.getDailySummaries);

export default router;
