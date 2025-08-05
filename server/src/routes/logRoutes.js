// server/src/routes/logRoutes.js
import express from 'express';
import { downloadMetricsAsCsv } from '../controllers/logsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Định nghĩa route để tải file
router.get('/metrics/download', authMiddleware, downloadMetricsAsCsv);

// Sử dụng 'export default' thay vì 'module.exports'
export default router;