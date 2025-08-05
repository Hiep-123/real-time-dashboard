import { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';

const MetricsChart = ({ channel }) => {
  const { getMetricsData, getDataPointsCount } = useDashboardStore();
  const metricsData = getMetricsData(channel);
  const dataPointsCount = getDataPointsCount(channel);

  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const maxValue = 100;
  const chartHeight = 200;
  const chartWidth = 600;

  if (metricsData.length < 1) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-medium">Không có đủ dữ liệu</div>
          <div className="text-sm">Đang đợi ít nhất 2 điểm dữ liệu để vẽ biểu đồ...</div>
        </div>
      </div>
    );
  }

  const createPath = (data, accessor) => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const value = accessor(item);
      const scaledValue = Math.max(0, Math.min(value, maxValue));
      const y = chartHeight - (scaledValue / maxValue) * chartHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };
  
  const handleMouseMove = (event) => {
    const chartRect = event.currentTarget.getBoundingClientRect();
    const xPos = event.clientX - chartRect.left;

    const index = Math.round((xPos / chartRect.width) * (metricsData.length - 1));

    if (index >= 0 && index < metricsData.length) {
      setHoveredData(metricsData[index]);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredData(null);
  };

  const activeIndex = hoveredData ? metricsData.findIndex(d => d.timestamp === hoveredData.timestamp) : -1;
  const activeX = activeIndex !== -1 ? (activeIndex / (metricsData.length - 1)) * chartWidth : 0;

  return (
    // Sử dụng nền trắng và đổ bóng để component nổi bật hơn
    <div className="bg-white p-4 rounded-lg shadow-md">
       <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chỉ số Hệ thống Theo Thời Gian</h3>
         <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span>CPU</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span>Bộ nhớ</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full"></div><span>Mạng</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div><span>Đĩa</span></div>
        </div>
      </div>
      
      {/* Container cho SVG, thêm con trỏ 'crosshair' để báo hiệu tương tác */}
      <div 
        className="relative cursor-crosshair" 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
          {[0, 25, 50, 75, 100].map(v => <line key={v} x1="0" y1={chartHeight - (v/maxValue)*chartHeight} x2={chartWidth} y2={chartHeight - (v/maxValue)*chartHeight} stroke="#e5e7eb" strokeWidth="1" />)}
          
          <path d={createPath(metricsData, item => item.cpu)} stroke="#3b82f6" strokeWidth="2" fill="none" />
          <path d={createPath(metricsData, item => item.memory)} stroke="#22c55e" strokeWidth="2" fill="none" />
          <path d={createPath(metricsData, item => item.network)} stroke="#a855f7" strokeWidth="2" fill="none" />
          <path d={createPath(metricsData, item => item.disk)} stroke="#f97316" strokeWidth="2" fill="none" />
          
          {/* Các chỉ báo khi hover sẽ không bắt sự kiện chuột */}
          {hoveredData && activeIndex !== -1 && (
            <g className="pointer-events-none">
              <line x1={activeX} y1="0" x2={activeX} y2={chartHeight} stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={activeX} cy={chartHeight - (hoveredData.cpu / maxValue) * chartHeight} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
              <circle cx={activeX} cy={chartHeight - (hoveredData.memory / maxValue) * chartHeight} r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
              <circle cx={activeX} cy={chartHeight - (Math.min(hoveredData.network, maxValue) / maxValue) * chartHeight} r="4" fill="#a855f7" stroke="white" strokeWidth="2" />
              <circle cx={activeX} cy={chartHeight - (hoveredData.disk / maxValue) * chartHeight} r="4" fill="#f97316" stroke="white" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* ======================= ĐÂY LÀ THAY ĐỔI QUAN TRỌNG NHẤT ======================= */}
        {/* Tooltip */}
        {hoveredData && (
          <div 
            // 1. Sử dụng 'fixed' thay vì 'absolute'
            // 2. Thêm transform để tooltip không che mất con trỏ chuột
            className="fixed p-3 bg-gray-900 bg-opacity-80 text-white rounded-lg shadow-xl pointer-events-none transform translate-x-3 -translate-y-1/2"
            style={{ 
              left: `${tooltipPosition.x}px`, 
              top: `${tooltipPosition.y}px`,
              // 3. Thêm z-index để đảm bảo nó luôn ở trên cùng
              zIndex: 9999,
              minWidth: '180px'
            }}
          >
            <p className="font-bold text-sm mb-2 border-b border-gray-600 pb-1">{hoveredData.timestamp.toLocaleTimeString('vi-VN')}</p>
            <ul className="text-xs space-y-1 mt-2">
              <li className="flex justify-between items-center"><span>CPU:</span> <strong className="text-blue-400">{hoveredData.cpu.toFixed(1)}%</strong></li>
              <li className="flex justify-between items-center"><span>Bộ nhớ:</span> <strong className="text-green-400">{hoveredData.memory.toFixed(1)}%</strong></li>
              <li className="flex justify-between items-center"><span>Mạng:</span> <strong className="text-purple-400">{hoveredData.network.toFixed(1)} MB/s</strong></li>
              <li className="flex justify-between items-center"><span>Đĩa:</span> <strong className="text-orange-400">{hoveredData.disk.toFixed(1)}%</strong></li>
            </ul>
          </div>
        )}
        {/* =============================================================================== */}

      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Hình ảnh hóa chỉ số thời gian thực</p>
        <p className="mt-1">Điểm dữ liệu: {dataPointsCount}</p>
      </div>
    </div>
  );
};

export default MetricsChart;