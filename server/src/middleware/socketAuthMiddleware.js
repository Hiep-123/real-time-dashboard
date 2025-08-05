import jwt from 'jsonwebtoken';
import { poolPromise, sql } from '../dbConfig.js';

export const registerNamespaceAuthMiddleware = (namespace) => {
  namespace.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.error(`No token provided for ${namespace.name}`);
      return next(new Error('Không có token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      const pool = await poolPromise;
      const result = await pool.request()
        .input('user_id', sql.VarChar, decoded.id)
        .query(`
          SELECT ucp.channel_id
          FROM user_channel_permissions ucp
          WHERE ucp.user_id = @user_id
        `);

      const channels = result.recordset.map(r => r.channel_id);

      socket.user = {
        id: decoded.id,
        role: decoded.role,
        channels
      };

      if (!channels.includes(namespace.name.slice(1))) {
        return next(new Error('Không có quyền truy cập'));
      }

      next();
    } catch (err) {
      console.error(`❌ Lỗi xác thực namespace ${namespace.name}:`, err.message);
      next(new Error('Token không hợp lệ'));
    }
  });
};