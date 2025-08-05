// server/src/controllers/logsController.js

// Sửa lại dòng import để lấy đúng 'poolPromise'
import { poolPromise } from '../dbConfig.js'; 
import { Parser } from 'json2csv';

/**
 * Lấy tất cả log hệ thống từ CSDL và chuyển thành file CSV để tải về.
 */
export const downloadMetricsAsCsv = async (req, res) => {
  try {
    // Sửa lại cách lấy pool kết nối
    const pool = await poolPromise; 

    // 1. Truy vấn để lấy TẤT CẢ các bản ghi từ bảng metrics
    const result = await pool.request().query(`
      SELECT 
        timestamp, channel_id as channel, cpu, memory, network, disk, users, transactions 
      FROM metrics 
      ORDER BY timestamp DESC
    `);
    
    const logs = result.recordset;

    // 2. Định nghĩa các cột (headers) cho file CSV
    const fields = [
      { label: 'Thời gian', value: 'timestamp' },
      { label: 'Kênh', value: 'channel' },
      { label: 'CPU (%)', value: 'cpu' },
      { label: 'Bộ nhớ (%)', value: 'memory' },
      { label: 'Mạng (MB/s)', value: 'network' },
      { label: 'Ổ đĩa (%)', value: 'disk' },
      { label: 'Người dùng', value: 'users' },
      { label: 'Giao dịch', value: 'transactions' }
    ];
    
    // 3. Sử dụng thư viện json2csv để chuyển đổi dữ liệu
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(logs);

    // 4. Tạo tên file duy nhất và thiết lập HTTP Headers
    const fileName = `metrics_log_${Date.now()}.csv`;
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(fileName);
    
    // Thêm BOM để Excel đọc UTF-8 đúng
    const bom = '\uFEFF';
    res.status(200).send(bom + csv);

  } catch (error) {
    console.error('Lỗi khi xuất file CSV:', error);
    res.status(500).json({ message: 'Lỗi khi xuất file CSV', error: error.message });
  }
};