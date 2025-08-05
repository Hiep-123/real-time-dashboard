import { poolPromise, sql } from '../dbConfig.js';
import jwt from 'jsonwebtoken';

export const getPermissions = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Không cung cấp token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user_id = req.query.user_id || decoded.id;
    const pool = await poolPromise;
    const channelResult = await pool.request()
      .input('user_id', sql.VarChar, user_id)
      .query('SELECT ucp.channel_id, ucp.access_level FROM user_channel_permissions ucp WHERE ucp.user_id = @user_id');
    const username = (await pool.request()
      .input('user_id', sql.VarChar, user_id)
      .query('SELECT username FROM users WHERE user_id = @user_id')).recordset[0]?.username || 'Người dùng';
    res.json({
      channels: channelResult.recordset.map(r => r.channel_id),
      dashboards: [],
      username,
      role: (await pool.request()
        .input('user_id', sql.VarChar, user_id)
        .query('SELECT role_id FROM users WHERE user_id = @user_id')).recordset[0]?.role_id
    });
  } catch (error) {
    console.error('Lỗi trong /auth/permissions:', error.message, error.stack);
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

export const addChannelPermission = async (req, res) => {
  const { user_id, channel_id, access_level } = req.body;
  try {
    const pool = await poolPromise;
    const existingPermission = await pool.request()
      .input('user_id', sql.VarChar, user_id)
      .input('channel_id', sql.VarChar, channel_id)
      .query(`
        SELECT 1 FROM user_channel_permissions 
        WHERE user_id = @user_id AND channel_id = @channel_id
      `);

    if (existingPermission.recordset.length > 0) {
      return res.status(400).json({ error: 'Quyền kênh đã được gán cho người dùng này' });
    }

    await pool.request()
      .input('user_id', sql.VarChar, user_id)
      .input('channel_id', sql.VarChar, channel_id)
      .input('access_level', sql.VarChar, access_level)
      .query(`
        INSERT INTO user_channel_permissions (user_id, channel_id, access_level)
        VALUES (@user_id, @channel_id, @access_level)
      `);
    res.status(201).json({ message: 'Quyền kênh được gán thành công' });
  } catch (error) {
    console.error('Lỗi khi gán quyền kênh:', error.message, error.stack);
    res.status(500).json({ error: 'Lỗi khi gán quyền kênh', details: error.message });
  }
};

export const deleteChannelPermission = async (req, res) => {
  const { user_id, channel_id } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('user_id', sql.VarChar, user_id)
      .input('channel_id', sql.VarChar, channel_id)
      .query(`
        DELETE FROM user_channel_permissions 
        WHERE user_id = @user_id AND channel_id = @channel_id
      `);
    res.status(200).json({ message: 'Quyền kênh đã được xóa thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa quyền kênh:', error.message, error.stack);
    res.status(500).json({ error: 'Lỗi khi xóa quyền kênh', details: error.message });
  }
};