import { Router } from 'express';
import multer from 'multer';
import * as salesController from '../controllers/sales.controller';

const router = Router();

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
router.post('/import', upload.single('file'), salesController.importSalesBatch);

// Get transactions list
router.get('/transactions', salesController.getTransactions);

// Get daily summaries list
router.get('/summaries', salesController.getDailySummaries);

export default router;
