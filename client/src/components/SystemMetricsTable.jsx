import { useMemo, useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import axios from 'axios';
import io from 'socket.io-client';

const SystemMetricsTable = () => {
    const [metrics, setMetrics] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3001/api/users/metrics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Lỗi khi lấy log metrics: ${response.statusText}`);
            }
            const data = await response.json();
            setMetrics(data);
            setIsLoading(false);
        } catch (error) {
            console.error('❌ Lỗi khi lấy log metrics qua API:', error.message);
            setError(error.message);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();

        const token = localStorage.getItem('authToken');
        const sockets = [
            io('http://localhost:3001/server', { auth: { token } }),
            io('http://localhost:3001/network', { auth: { token } }),
            io('http://localhost:3001/finance', { auth: { token } }),
        ];

        sockets.forEach((socket, index) => {
            const channel = ['server', 'network', 'finance'][index];
            socket.on('connect', () => console.log(`✅ Đã kết nối WebSocket /${channel}`));

            socket.on('data', (data) => {
                setMetrics(prev => [
                    {
                        channel_id: channel,
                        cpu: data.metrics.cpu.toFixed(2),
                        memory: data.metrics.memory.toFixed(2),
                        network: data.metrics.network.toFixed(2),
                        disk: data.metrics.disk.toFixed(2),
                        users: data.users,
                        transactions: data.transactions,
                        timestamp: data.timestamp,
                    },
                    ...prev.slice(0, 49),
                ]);
            });

            socket.on('connect_error', (error) => {
                console.error(`❌ Lỗi kết nối WebSocket /${channel}:`, error.message);
            });
        });

        return () => {
            sockets.forEach(socket => socket.disconnect());
        };
    }, []);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get('http://localhost:3001/api/logs/metrics/download', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'metrics_log.csv';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Lỗi khi tải file CSV:', error);
            alert('Không thể tải file. Vui lòng thử lại.');
        } finally {
            setIsDownloading(false);
        }
    };

    const data = useMemo(() => metrics.map(metric => ({
        timestamp: new Date(metric.timestamp).toLocaleString('vi-VN'),
        channel_id: metric.channel_id,
        cpu: metric.cpu ?? 'N/A',
        memory: metric.memory ?? 'N/A',
        network: metric.network ?? 'N/A',
        disk: metric.disk ?? 'N/A',
        users: metric.users ?? 'N/A',
        transactions: metric.transactions ?? 'N/A',
    })), [metrics]);

    const columns = useMemo(() => [
        { name: 'Thời gian', selector: row => row.timestamp, sortable: true },
        { name: 'Kênh', selector: row => row.channel_id, sortable: true },
        { name: 'CPU (%)', selector: row => row.cpu, sortable: true },
        { name: 'Bộ nhớ (%)', selector: row => row.memory, sortable: true },
        { name: 'Mạng (MB/s)', selector: row => row.network, sortable: true },
        { name: 'Ổ đĩa (%)', selector: row => row.disk, sortable: true },
        { name: 'Người dùng', selector: row => row.users, sortable: true },
        { name: 'Giao dịch', selector: row => row.transactions, sortable: true },
    ], []);
    
    // --- PHẦN SỬA LỖI ---
    // Định nghĩa style cho theme tối MỘT CÁCH AN TOÀN ở đây
    const customStyles = {
        table: { style: { backgroundColor: '#111827' } }, // Nền chính của bảng
        headRow: { style: { backgroundColor: '#1f2937', color: '#d1d5db', borderBottom: '1px solid #374151' } },
        headCells: { style: { fontSize: '14px', fontWeight: '600' } },
        rows: { style: { backgroundColor: '#111827', color: '#d1d5db', borderBottom: '1px solid #374151' } },
        pagination: { style: { backgroundColor: '#1f2937', color: '#d1d5db', borderTop: '1px solid #374151' } },
    };

    if (isLoading) return <div className="p-6 text-center text-gray-400">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-6 text-center text-red-400">Lỗi: {error}</div>;

    return (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Log Metrics Hệ thống</h2>
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
                >
                    {isDownloading ? 'Đang xử lý...' : 'Tải về (CSV)'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                pagination
                paginationPerPage={10}
                paginationRowsPerPageOptions={[10, 20, 50]}
                customStyles={customStyles} // Truyền style vào đây
            />
        </div>
    );
};

export default SystemMetricsTable;