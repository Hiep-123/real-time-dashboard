import jwt from 'jsonwebtoken';
import { poolPromise, sql } from '../dbConfig.js';

// Đổi từ "export const adminAuth" thành "export default"
// Bỏ tên hàm vì nó không cần thiết với export default
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Không cung cấp token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = await poolPromise;
    const roleResult = await pool.request()
      .input('user_id', sql.VarChar, decoded.id)
      .query('SELECT role_id FROM users WHERE user_id = @user_id');

    if (roleResult.recordset[0]?.role_id !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
};