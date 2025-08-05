import express from 'express';
import { getPermissions } from '../controllers/permissionsController.js';

const router = express.Router();

router.get('/permissions', getPermissions);

export default router;