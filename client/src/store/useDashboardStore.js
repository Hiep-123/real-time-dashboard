import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { websocketService } from '../services/websocketService';

// Hàm debounce để giới hạn tần suất cập nhật
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  data: {
    server: null,
    network: null,
    finance: null
  },
  lastUpdate: {
    server: null,
    network: null,
    finance: null
  },
  isLoading: true,
  error: null,
  historicalData: {
    server: [],
    network: [],
    finance: []
  },
  dataPointsCount: {
    server: 0,
    network: 0,
    finance: 0
  },
  maxHistoryLength: 50,
  user: null,
  permissions: { channels: [] }
};

export const useDashboardStore = create(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setConnecting: (isConnecting) => set({ isConnecting }),
    setConnected: (isConnected) => set({
      isConnected,
      isConnecting: false,
      connectionError: null
    }),
    setConnectionError: (error) => set({
      connectionError: error,
      isConnecting: false,
      isConnected: false
    }),

    updateData: debounce((data, channel = 'server') => {
      const { historicalData, dataPointsCount, maxHistoryLength } = get();

      // Kiểm tra trùng lặp dựa trên timestamp từ server
      if (historicalData[channel].length > 0 && historicalData[channel][historicalData[channel].length - 1].timestamp === data.timestamp) {
        console.warn(`⚠️ Bỏ qua dữ liệu trùng lặp cho ${channel} với timestamp: ${data.timestamp}`);
        return;
      }

      const newHistoricalData = {
        ...historicalData,
        [channel]: [
          ...historicalData[channel],
          { ...data, timestamp: data.timestamp } // Sử dụng timestamp từ server
        ].slice(-maxHistoryLength)
      };

      set({
        data: { ...get().data, [channel]: data },
        lastUpdate: { ...get().lastUpdate, [channel]: data.timestamp },
        historicalData: newHistoricalData,
        dataPointsCount: {
          ...dataPointsCount,
          [channel]: dataPointsCount[channel] + 1
        },
        isLoading: false,
        error: null
      });

      console.log(`📊 Đã thêm điểm dữ liệu cho ${channel}. Tổng số điểm: ${dataPointsCount[channel] + 1}`);
    }, 500), // Debounce 500ms

    setError: (error) => set({ error, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    setUser: (user, permissions) => set({ user, permissions }),
    clearUser: () => set({ user: null, permissions: { channels: [] } }),
    reset: () => set({
      ...initialState,
      dataPointsCount: { server: 0, network: 0, finance: 0 }
    }),

    getConnectionStatus: () => {
      const { isConnected, isConnecting, connectionError } = get();
      if (isConnected) return 'connected';
      if (isConnecting) return 'connecting';
      if (connectionError) return 'error';
      return 'disconnected';
    },

    getMetricsData: (channel = 'server') => {
      const { historicalData } = get();
      return historicalData[channel].map(item => ({
        timestamp: new Date(item.timestamp),
        cpu: item.metrics.cpu,
        memory: item.metrics.memory,
        network: item.metrics.network,
        disk: item.metrics.disk,
      }));
    },

    getDataPointsCount: (channel = 'server') => {
      return get().dataPointsCount[channel] || 0;
    },

    initialize: (channels = ['server']) => {
      set({ isConnecting: true });

      // Ngắt tất cả kết nối hiện có trước khi khởi tạo
      websocketService.disconnectAll();

      channels.forEach((channel) => {
        const namespace = channel.startsWith('/') ? channel : `/${channel}`;
        const socket = websocketService.connect(namespace);

        websocketService.on(namespace, 'connect', () => {
          console.log(`✅ Đã kết nối WebSocket ${namespace}`);
          set({ isConnected: true, isConnecting: false, connectionError: null });
        });

        websocketService.on(namespace, 'disconnect', (reason) => {
          console.log(`❎ Ngắt kết nối WebSocket ${namespace}: ${reason}`);
          if (reason !== 'io client disconnect') {
            setTimeout(() => {
              websocketService.connect(namespace);
            }, 1000);
          } else {
            set({ isConnected: false, connectionError: reason });
          }
        });

        websocketService.on(namespace, 'connect_error', (error) => {
          console.error(`🚨 Lỗi kết nối WebSocket ${namespace}: ${error.message}`);
          set({ isConnecting: false, connectionError: error.message });
        });

        websocketService.on(namespace, 'data', (data) => {
          console.log(`📥 Nhận dữ liệu cho ${channel}:`, data);
          get().updateData(data, channel);
        });
      });
    },

    setToken: (token) => {
      websocketService.setToken(token);
    }
  }))
);