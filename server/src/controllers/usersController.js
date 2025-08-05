import bcrypt from 'bcrypt';
import { poolPromise, sql } from '../dbConfig.js';

export const getUsers = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Không cung cấp token' });
    try {
        const pool = await poolPromise;
        const usersResult = await pool.request()
            .query('SELECT user_id, username, role_id FROM users');
        res.json(usersResult.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error.message, error.stack);
        res.status(500).json({ error: 'Lỗi khi lấy danh sách người dùng', details: error.message });
    }
};

export const addUser = async (req, res) => {
    const { username, password, role_id } = req.body;
    const user_id = `user_${Date.now()}`.substring(0, 50);
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .input('username', sql.VarChar, username)
            .input('password_hash', sql.VarChar, bcrypt.hashSync(password, 12))
            .input('role_id', sql.VarChar, role_id)
            .query('INSERT INTO users (user_id, username, password_hash, role_id) VALUES (@user_id, @username, @password_hash, @role_id)');

        await pool.request()
            .input('user_id', sql.VarChar(50), req.user?.id || 'unknown')
            .input('action', sql.VarChar(100), 'add_user')
            .input('details', sql.NVarChar, `Thêm người dùng ${username}`)
            .query(`
                INSERT INTO logs (user_id, action, details, timestamp)
                VALUES (@user_id, @action, @details, GETDATE())
            `);

        res.status(201).json({ message: 'Người dùng được thêm thành công', user_id });
    } catch (error) {
        console.error('Lỗi khi thêm người dùng:', error.message, error.stack);
        res.status(500).json({ error: 'Lỗi khi thêm người dùng', details: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { user_id } = req.params;
    const { username, password, role_id } = req.body;
    try {
        const pool = await poolPromise;
        const updateFields = [];
        const request = pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .input('username', sql.VarChar, username)
            .input('role_id', sql.VarChar, role_id);

        updateFields.push('username = @username');
        updateFields.push('role_id = @role_id');

        if (password) {
            const password_hash = bcrypt.hashSync(password, 12);
            request.input('password_hash', sql.VarChar, password_hash);
            updateFields.push('password_hash = @password_hash');
        }

        const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE user_id = @user_id
    `;
        await request.query(query);

        await pool.request()
            .input('user_id', sql.VarChar(50), req.user?.id || 'unknown')
            .input('action', sql.VarChar(100), 'update_user')
            .input('details', sql.NVarChar, `Cập nhật người dùng ${username}`)
            .query(`
                INSERT INTO logs (user_id, action, details, timestamp)
                VALUES (@user_id, @action, @details, GETDATE())
            `);

        res.json({ message: 'Người dùng được cập nhật thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật người dùng:', error.message, error.stack);
        res.status(500).json({ error: 'Lỗi khi cập nhật người dùng', details: error.message });
    }
};

export const deleteUser = async (req, res) => {
    const { user_id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .query('DELETE FROM logs WHERE user_id = @user_id');
        await pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .query('DELETE FROM user_channel_permissions WHERE user_id = @user_id');
        await pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .query('DELETE FROM users WHERE user_id = @user_id');

        await pool.request()
            .input('user_id', sql.VarChar(50), req.user?.id || 'unknown')
            .input('action', sql.VarChar(100), 'delete_user')
            .input('details', sql.NVarChar, `Xóa người dùng ${user_id}`)
            .query(`
                INSERT INTO logs (user_id, action, details, timestamp)
                VALUES (@user_id, @action, @details, GETDATE())
            `);

        res.json({ message: 'Người dùng được xóa thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa người dùng:', error.message, error.stack);
        res.status(500).json({ error: 'Lỗi khi xóa người dùng', details: error.message });
    }
};

export const generateMockData = async (type) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const data = {
        timestamp,
        metrics: {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            network: Math.random() * 1000,
            disk: Math.random() * 100
        },
        events: [
            {
                id: Date.now(),
                type: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)],
                message: `Sự kiện ${type} ${Math.floor(Math.random() * 1000)}`,
                timestamp
            }
        ],
        users: Math.floor(Math.random() * 1000) + 100,
        transactions: Math.floor(Math.random() * 5000) + 1000
    };

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('channel_id', sql.VarChar, type)
            .input('cpu', sql.Decimal(5, 2), data.metrics.cpu)
            .input('memory', sql.Decimal(5, 2), data.metrics.memory)
            .input('network', sql.Decimal(10, 2), data.metrics.network)
            .input('disk', sql.Decimal(5, 2), data.metrics.disk)
            .input('users', sql.Int, data.users)
            .input('transactions', sql.Int, data.transactions)
            .input('timestamp', sql.DateTime, new Date(data.timestamp))
            .query(`
        INSERT INTO metrics (channel_id, cpu, memory, network, disk, users, transactions, timestamp)
        VALUES (@channel_id, @cpu, @memory, @network, @disk, @users, @transactions, @timestamp)
      `);

        await pool.request()
            .input('channel_id', sql.VarChar, type)
            .input('event_type', sql.VarChar, data.events[0].type)
            .input('message', sql.NVarChar, data.events[0].message)
            .input('timestamp', sql.DateTime, new Date(data.events[0].timestamp))
            .query(`
        INSERT INTO events (channel_id, event_type, message, timestamp)
        VALUES (@channel_id, @event_type, @message, @timestamp)
      `);
    } catch (error) {
        console.error(`Lỗi lưu dữ liệu vào cơ sở dữ liệu cho ${type}:`, error);
    }

    console.log(`📤 Gửi dữ liệu giả lập cho ${type} với timestamp: ${timestamp}`);
    return data;
};

export const getUserLogs = async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT TOP 50 * FROM logs 
      ORDER BY timestamp DESC
    `);

        return result.recordset.map(log => ({
            log_id: log.log_id,
            userId: log.user_id,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp,
        }));
    } catch (error) {
        console.error('❌ Lỗi khi lấy log người dùng:', error.message);
        throw error;
    }
};

export const getMetricsLog = async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT TOP 50 * FROM metrics 
      ORDER BY timestamp DESC
    `);
        return result.recordset.map(metric => ({
            channel_id: metric.channel_id,
            cpu: metric.cpu,
            memory: metric.memory,
            network: metric.network,
            disk: metric.disk,
            users: metric.users,
            transactions: metric.transactions,
            timestamp: metric.timestamp,
        }));
    } catch (error) {
        console.error('❌ Lỗi khi lấy log metrics:', error.message);
        throw error;
    }
};

export const addUserLog = async (req, res) => {
    const { user_id, action, details } = req.body;
    try {
        if (!user_id || !action) {
            return res.status(400).json({ error: 'user_id và action là bắt buộc' });
        }
        const pool = await poolPromise;
        const userCheck = await pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .query('SELECT user_id FROM users WHERE user_id = @user_id');
        if (!userCheck.recordset.length && user_id !== 'unknown') {
            return res.status(400).json({ error: 'user_id không tồn tại trong bảng users' });
        }
        await pool.request()
            .input('user_id', sql.VarChar(50), user_id)
            .input('action', sql.VarChar(100), action)
            .input('details', sql.NVarChar, details || null)
            .query(`
        INSERT INTO logs (user_id, action, details, timestamp)
        VALUES (@user_id, @action, @details, GETDATE())
      `);
        const logs = await getUserLogs();
        res.status(201).json({ message: 'Log đã được lưu', logs });
    } catch (error) {
        console.error('❌ Lỗi khi lưu log:', error.message);
        res.status(500).json({ error: 'Lỗi server khi lưu log', details: error.message });
    }
};