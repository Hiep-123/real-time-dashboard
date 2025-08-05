import { useMemo, useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import io from 'socket.io-client';
import { useDashboardStore } from '../store/useDashboardStore';

const UserLogTable = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useDashboardStore();

  const fetchUserLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/api/users/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Lỗi khi lấy log người dùng: ${response.statusText}`);
      }
      const data = await response.json();
      setLogs(data);
      setIsLoading(false);
      console.log('📜 Đã lấy log người dùng qua API:', data.length);
    } catch (error) {
      console.error('❌ Lỗi khi lấy log người dùng qua API:', error.message);
      setError(error.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLogs();

    const token = localStorage.getItem('authToken');
    const sockets = [
      io('http://localhost:3001/server', { auth: { token } }),
      io('http://localhost:3001/network', { auth: { token } }),
      io('http://localhost:3001/finance', { auth: { token } }),
    ];

    sockets.forEach((socket, index) => {
      const channel = ['server', 'network', 'finance'][index];
      socket.on('connect', () => {
        console.log(`✅ Đã kết nối WebSocket /${channel} cho log người dùng`);
        socket.emit('new-log', {
          user_id: user?.id?.substring(0, 50) || 'unknown',
          action: 'access_user_logs'.substring(0, 100),
          details: 'Xem Log Người dùng',
        });
      });

      socket.on('user-log', (data) => {
        console.log(`📥 Nhận log người dùng qua WebSocket /${channel}:`, data.length);
        setLogs(data.slice(0, 50));
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ Lỗi kết nối WebSocket /${channel}:`, error.message);
        setError(`Lỗi kết nối WebSocket /${channel}: ${error.message}`);
      });
    });

    return () => {
      sockets.forEach(socket => socket.disconnect());
      console.log('⚠️ Ngắt kết nối tất cả WebSocket cho log người dùng');
    };
  }, [user]);

  const data = useMemo(() => {
    return logs.map(log => ({
      timestamp: new Date(log.timestamp).toLocaleString('vi-VN'),
      userId: log.userId,
      action: log.action,
      details: log.details || 'Không có chi tiết',
    }));
  }, [logs]);

  const columns = useMemo(
    () => [
      {
        name: 'Thời gian',
        selector: row => row.timestamp,
        sortable: true,
        sortFunction: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      },
      {
        name: 'ID Người dùng',
        selector: row => row.userId,
        sortable: true,
      },
      {
        name: 'Hành động',
        selector: row => row.action,
        sortable: true,
      },
      {
        name: 'Chi tiết',
        selector: row => row.details,
        sortable: true,
      },
    ],
    []
  );

  const customStyles = {
    table: { style: { backgroundColor: '#fff', border: '1px solid #e5e7eb' } },
    headCells: {
      style: {
        padding: '8px 16px',
        backgroundColor: '#f9fafb',
        color: '#374151',
        fontSize: '14px',
        fontWeight: '600',
        borderBottom: '1px solid #e5e7eb',
      },
    },
    cells: { style: { padding: '8px 16px', fontSize: '14px', color: '#4b5563' } },
    pagination: { style: { borderTop: '1px solid #e5e7eb', padding: '8px' } },
  };

  return (
    <div className="card p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Log Người dùng</h2>
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Đang tải...</div>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Lỗi: {error}</div>
            <button
              onClick={fetchUserLogs}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : data.length > 0 ? (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={data}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[10, 20, 30, 40, 50]}
            customStyles={customStyles}
            noDataComponent={
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Không có log</div>
                  <div className="text-sm">Đang đợi dữ liệu log...</div>
                </div>
              </div>
            }
          />
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Tổng số log: {data.length}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Không có log</div>
            <div className="text-sm">Đang đợi dữ liệu log...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLogTable;