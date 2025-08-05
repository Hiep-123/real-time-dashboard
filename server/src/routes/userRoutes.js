import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js'
import { getUsers, addUser, updateUser, deleteUser, getUserLogs, getMetricsLog, addUserLog } from '../controllers/usersController.js';

const router = express.Router();

router.get('/', authMiddleware, getUsers);
router.post('/', authMiddleware, addUser);
router.put('/:user_id', authMiddleware, updateUser);
router.delete('/:user_id', authMiddleware, deleteUser);
router.get('/logs', authMiddleware, async (req, res) => {
    try {
        const logs = await getUserLogs();
        res.json(logs);
    } catch (error) {
        console.error('Lỗi khi lấy log người dùng qua API:', error.message);
        res.status(500).json({ error: 'Lỗi khi lấy log người dùng', details: error.message });
    }
});
router.get('/metrics', authMiddleware, async (req, res) => {
    try {
        const metrics = await getMetricsLog();
        res.json(metrics);
    } catch (error) {
        console.error('Lỗi khi lấy log metrics qua API:', error.message);
        res.status(500).json({ error: 'Lỗi khi lấy log metrics', details: error.message });
    }
});
router.post('/logs', authMiddleware, addUserLog);

export default router;