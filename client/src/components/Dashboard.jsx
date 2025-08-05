import { useState, useEffect } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import MetricsCards from './MetricsCards';
import MetricsChart from './MetricsChart';
import LiveDataTable from './LiveDataTable';
import { websocketService } from '../services/websocketService';

const Dashboard = ({ userPermissions }) => {
  const { data, isLoading, error, isConnected, initialize } = useDashboardStore();
  const [selectedChannel, setSelectedChannel] = useState(() => {
    return userPermissions.channels?.[0] || 'server';
  });

  useEffect(() => {
    if (!userPermissions.channels.includes(selectedChannel)) {
      setSelectedChannel(userPermissions.channels?.[0] || 'server');
      websocketService.disconnectAll();
      initialize(userPermissions.channels);
    }
  }, [userPermissions.channels, selectedChannel, initialize]);

  const handleChannelChange = (channel) => {
    if (!userPermissions.channels.includes(channel)) return;
    setSelectedChannel(channel);
    websocketService.disconnectAll();
    initialize([channel]);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-medium text-gray-600 mb-2">
          Đang tải bảng điều khiển...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-2">
          Lỗi tải bảng điều khiển
        </div>
        <div className="text-gray-600">{error}</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg font-medium mb-2">
          Đang kết nối đến server...
        </div>
        <div className="text-gray-500">
          Vui lòng đợi trong khi chúng tôi thiết lập kết nối
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        {userPermissions.channels.map(channel => (
          <button
            key={channel}
            onClick={() => handleChannelChange(channel)}
            className={`px-4 py-2 rounded-lg ${selectedChannel === channel
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
              }`}
          >
            {channel.charAt(0).toUpperCase() + channel.slice(1)}
          </button>
        ))}
      </div>

      {userPermissions.channels.length > 0 ? (
        <>
          <MetricsCards channel={selectedChannel} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Chỉ số hệ thống ({selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)})
              </h2>
              <MetricsChart channel={selectedChannel} />
            </div>
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Sự kiện trực tiếp ({selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)})
              </h2>
              <LiveDataTable channel={selectedChannel} />
            </div>
          </div>
          {data[selectedChannel] && (
            <div className="text-center text-sm text-gray-500">
              Cập nhật lần cuối: {new Date(data[selectedChannel].timestamp).toLocaleString('vi-VN')}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-red-500">
          Bạn không có quyền truy cập bất kỳ kênh nào.
        </div>
      )}
    </div>
  );
};

export default Dashboard;