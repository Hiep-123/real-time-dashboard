import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { addChannelPermission, deleteChannelPermission } from '../controllers/permissionsController.js';

const router = express.Router();

router.post('/', authMiddleware, addChannelPermission);
router.delete('/', authMiddleware, deleteChannelPermission);

export default router;