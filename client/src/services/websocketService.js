import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.sockets = {};
    this.isManualDisconnect = false;
    this.baseUrl = 'http://localhost:3001';
    this.token = localStorage.getItem('authToken') || null;
    console.log('Khởi tạo WebSocketService, token ban đầu:', this.token);
  }

  connect(namespace = '/server', url = this.baseUrl) {
    if (this.sockets[namespace]?.connected) {
      console.log(`⚠️ Socket đã tồn tại cho ${namespace}, dùng lại.`);
      return this.sockets[namespace];
    }

    this.isManualDisconnect = false;

    if (!this.token) {
      console.warn(`❌ Không có token để kết nối WebSocket cho ${namespace}`);
      throw new Error('Không có token xác thực');
    }

    try {
      console.log(`🔌 Khởi tạo kết nối WebSocket cho ${namespace} với token:`, this.token);
      this.sockets[namespace] = io(`${url}${namespace}`, {
        transports: ['websocket'],
        timeout: 10000,
        reconnection: false,
        auth: {
          token: this.token
        }
      });

      this.setupEventListeners(namespace);
      return this.sockets[namespace];
    } catch (error) {
      console.error(`❌ Không thể tạo kết nối WebSocket cho ${namespace}:`, error.message);
      throw error;
    }
  }

  setupEventListeners(namespace) {
    const socket = this.sockets[namespace];
    if (!socket) return;

    socket.on('connect', () => {
      console.log(`✅ Kết nối thành công đến WebSocket (${namespace}), socket ID:`, socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`⚠️ Ngắt kết nối từ WebSocket (${namespace}):`, reason);
      if (reason === 'io server disconnect' && !this.isManualDisconnect) {
        console.warn(`⚠️ Server ngắt kết nối do lỗi xác thực (${namespace})`);
      }
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Lỗi kết nối WebSocket (${namespace}):`, error.message);
    });

    socket.on('error', (error) => {
      console.error(`❗ Lỗi từ WebSocket (${namespace}):`, error);
    });
  }

  disconnect(namespace) {
    this.isManualDisconnect = true;
    if (this.sockets[namespace]) {
      console.log(`🔌 Ngắt kết nối thủ công cho ${namespace}`);
      this.sockets[namespace].disconnect();
      delete this.sockets[namespace];
    }
  }

  disconnectAll() {
    this.isManualDisconnect = true;
    Object.keys(this.sockets).forEach(namespace => {
      console.log(`🔌 Ngắt kết nối thủ công cho ${namespace}`);
      this.sockets[namespace].disconnect();
      delete this.sockets[namespace];
    });
  }

  emit(namespace, event, data) {
    if (this.sockets[namespace]?.connected) {
      console.log(`📤 Gửi sự kiện "${event}" đến ${namespace}:`, data);
      this.sockets[namespace].emit(event, data);
    } else {
      console.warn(`⚠️ Socket không kết nối cho ${namespace}, không thể gửi sự kiện: ${event}`);
    }
  }

  on(namespace, event, callback) {
    if (!this.sockets[namespace]) {
      console.warn(`⚠️ Socket chưa tồn tại cho ${namespace}, tự động kết nối...`);
      try {
        this.connect(namespace);
      } catch (e) {
        console.error(`❌ Không thể kết nối để đăng ký sự kiện '${event}' cho ${namespace}:`, e.message);
        return;
      }
    }

    const socket = this.sockets[namespace];
    if (socket) {
      console.log(`✅ Đăng ký lắng nghe sự kiện "${event}" cho ${namespace}`);
      socket.on(event, callback);
    }
  }

  off(namespace, event, callback) {
    if (this.sockets[namespace]) {
      console.log(`🔕 Hủy lắng nghe sự kiện "${event}" cho ${namespace}`);
      this.sockets[namespace].off(event, callback);
    }
  }

  setToken(token) {
    if (this.token !== token) {
      this.token = token;
      localStorage.setItem('authToken', token);
      console.log('🔑 Đã gán token mới cho WebSocket:', token);
      Object.keys(this.sockets).forEach(namespace => {
        if (this.sockets[namespace]) {
          this.sockets[namespace].auth = { token };
          console.log(`🔄 Cập nhật token cho socket ${namespace}:`, token);
        }
      });
    }
  }

  get isConnected() {
    return Object.values(this.sockets).some(socket => socket?.connected) || false;
  }

  get socketId() {
    return Object.values(this.sockets)[0]?.id || null;
  }
}

export const websocketService = new WebSocketService();