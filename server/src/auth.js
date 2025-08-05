import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { poolPromise, sql } from './dbConfig.js';
import { getPermissions } from './controllers/permissionsController.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT user_id, username, password_hash, role_id FROM users WHERE username = @username');
        const user = result.recordset[0];
        if (!user) {
            return res.status(401).json({ error: 'Tên người dùng hoặc mật khẩu không đúng' });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Tên người dùng hoặc mật khẩu không đúng' });
        }
        const token = jwt.sign(
            { id: user.user_id, role: user.role_id },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );

        // Lưu log đăng nhập
        await pool.request()
            .input('user_id', sql.VarChar(50), user.user_id)
            .input('action', sql.VarChar(100), 'login')
            .input('details', sql.NVarChar, `Người dùng ${username} đăng nhập thành công`)
            .query(`
                INSERT INTO logs (user_id, action, details, timestamp)
                VALUES (@user_id, @action, @details, GETDATE())
            `);

        res.json({ token, user: { id: user.user_id, username: user.username, role: user.role_id } });
    } catch (error) {
        console.error('❌ Lỗi khi đăng nhập:', error.message);
        res.status(500).json({ error: 'Lỗi server khi đăng nhập', details: error.message });
    }
});

router.get('/permissions', getPermissions);

export default router;