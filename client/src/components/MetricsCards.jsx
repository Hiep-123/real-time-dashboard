import { useDashboardStore } from '../store/useDashboardStore';

const MetricsCards = ({ channel }) => {
  const { data } = useDashboardStore();

  if (!data || !data[channel]) return null;

  const metrics = [
    {
      title: 'Sử dụng CPU',
      value: `${data[channel].metrics.cpu.toFixed(1)}%`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: data[channel].metrics.cpu > 80 ? 'high' : data[channel].metrics.cpu > 50 ? 'medium' : 'low'
    },
    {
      title: 'Sử dụng Bộ nhớ',
      value: `${data[channel].metrics.memory.toFixed(1)}%`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: data[channel].metrics.memory > 80 ? 'high' : data[channel].metrics.memory > 50 ? 'medium' : 'low'
    },
    {
      title: 'Lưu lượng Mạng',
      value: `${data[channel].metrics.network.toFixed(0)} MB/s`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: data[channel].metrics.network > 800 ? 'high' : data[channel].metrics.network > 400 ? 'medium' : 'low'
    },
    {
      title: 'Sử dụng Đĩa',
      value: `${data[channel].metrics.disk.toFixed(1)}%`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: data[channel].metrics.disk > 80 ? 'high' : data[channel].metrics.disk > 50 ? 'medium' : 'low'
    },
    {
      title: 'Người dùng Hoạt động',
      value: data[channel].users.toLocaleString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: 'normal'
    }
  ];

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getIcon = (title) => {
    switch (title) {
      case 'Sử dụng CPU':
        return '🖥️';
      case 'Sử dụng Bộ nhớ':
        return '🧠';
      case 'Lưu lượng Mạng':
        return '🌐';
      case 'Sử dụng Đĩa':
        return '💾';
      case 'Người dùng Hoạt động':
        return '👥';
      default:
        return '📊';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {metric.title}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metric.value}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${metric.bgColor}`}>
              <span className="text-2xl">{getIcon(metric.title)}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className={`font-medium ${getTrendColor(metric.trend)}`}>
                {metric.trend === 'high' ? 'Cao' : 
                 metric.trend === 'medium' ? 'Trung bình' : 
                 metric.trend === 'low' ? 'Thấp' : 'Bình thường'}
              </span>
              <div className={`ml-2 w-2 h-2 rounded-full ${getTrendColor(metric.trend).replace('text-', 'bg-')}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsCards;