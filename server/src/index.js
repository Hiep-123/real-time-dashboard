import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import userRoutes from './routes/userRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import authRouter from './auth.js';
import { generateMockData, getUserLogs } from './controllers/usersController.js';
import { registerNamespaceAuthMiddleware } from './middleware/socketAuthMiddleware.js';
import { poolPromise, sql } from './dbConfig.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  compression: true,
});

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(compression());

app.use('/api/users', userRoutes);
app.use('/api/channel-permissions', permissionRoutes);
app.use('/health', healthRoutes);
app.use('/auth', authRouter);
app.use('/auth', authRoutes);

const serverNamespace = io.of('/server');
const networkNamespace = io.of('/network');
const financeNamespace = io.of('/finance');

[serverNamespace, networkNamespace, financeNamespace].forEach((namespace, index) => {
  const type = ['server', 'network', 'finance'][index];
  registerNamespaceAuthMiddleware(namespace);

  namespace.on('connection', async (socket) => {
    if (!socket.user || !socket.user.channels.includes(type)) {
      console.log(`❌ Không có quyền truy cập namespace ${type} cho user ${socket.user?.id || 'unknown'}`);
      socket.disconnect(true);
      return;
    }

    console.log(`✅ User ${socket.user.id} được phép truy cập namespace ${type}`);

    try {
      const data = await generateMockData(type);
      socket.emit('data', data);

      const logs = await getUserLogs();
      socket.emit('user-log', logs);
    } catch (error) {
      console.error(`❌ Lỗi khi gửi dữ liệu ban đầu cho ${type}:`, error.message);
    }

    socket.on('disconnect', () => {
      console.log(`⚠️ Client ngắt kết nối từ namespace ${type}: ${socket.id}`);
    });

    socket.on('requestData', async () => {
      try {
        const data = await generateMockData(type);
        socket.emit('data', data);

        const logs = await getUserLogs();
        socket.emit('user-log', logs);
      } catch (error) {
        console.error(`❌ Lỗi khi xử lý requestData cho ${type}:`, error.message);
      }
    });

    socket.on('new-log', async (log) => {
      try {
        const pool = await poolPromise;
        if (log.user_id !== 'unknown') {
          const userCheck = await pool.request()
            .input('user_id', sql.VarChar(50), log.user_id)
            .query('SELECT user_id FROM users WHERE user_id = @user_id');
          if (!userCheck.recordset.length) {
            console.error(`❌ user_id ${log.user_id} không tồn tại`);
            return;
          }
        }
        await pool.request()
          .input('user_id', sql.VarChar(50), log.user_id)
          .input('action', sql.VarChar(100), log.action.substring(0, 100))
          .input('details', sql.NVarChar, log.details || null)
          .query(`
            INSERT INTO logs (user_id, action, details, timestamp)
            VALUES (@user_id, @action, @details, GETDATE())
          `);
        const logs = await getUserLogs();
        namespace.emit('user-log', logs);
        console.log(`📜 Đã phát log mới qua WebSocket /${type}:`, logs.length);
      } catch (error) {
        console.error(`❌ Lỗi khi lưu và phát log mới cho ${type}:`, error.message);
      }
    });
  });

  setInterval(async () => {
    try {
      const data = await generateMockData(type);
      namespace.emit('data', data);

      const logs = await getUserLogs();
      console.log(`📜 Emitting user-log for ${type}:`, logs.length);
      namespace.emit('user-log', logs);
    } catch (error) {
      console.error(`❌ Lỗi khi gửi dữ liệu định kỳ cho ${type}:`, error.message);
    }
  }, 4000);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
  console.log(`📊 Server WebSocket sẵn sàng cho các kết nối`);
  console.log(`🔗 Kiểm tra sức khỏe: http://localhost:${PORT}/health`);
});