import { useState } from 'react';
import { Component } from 'react';
import Dashboard from './Dashboard';
import UserManagement from '../components/User/UserManagement';
import SystemMetricsTable from './SystemMetricsTable';
import UserLogTable from './UserLogTable';
import { useDashboardStore } from '../store/useDashboardStore';
import { websocketService } from '../services/websocketService';
import { FaUser, FaTachometerAlt, FaCog, FaSignOutAlt, FaUsers, FaTable } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500">Có lỗi xảy ra. Vui lòng thử lại.</div>;
    }
    return this.props.children;
  }
}

const MainLayout = ({ userPermissions, username }) => {
  const [selectedFeature, setSelectedFeature] = useState('dashboard');
  const { reset, user } = useDashboardStore();
  const [showLogout, setShowLogout] = useState(false);
  const role = userPermissions?.role;

  const logUserAction = async (action, details) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('❌ Không có token trong localStorage');
        return;
      }
      const effectiveUserId = user?.id?.substring(0, 50) || null; // Use null instead of 'unknown'
      // await axios.post(
      //   'http://localhost:3001/api/users/logs',
      //   {
      //     user_id: effectiveUserId,
      //     action: action.substring(0, 100),
      //     details,
      //   },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      // console.log(`📜 Đã gửi log: ${action} - ${details}`);
    } catch (error) {
      console.error('❌ Lỗi khi gửi log:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    }
  };

  const handleFeatureChange = (feature) => {
    setSelectedFeature(feature);
    const featureNames = {
      dashboard: 'Xem Dashboard',
      'system-metrics': 'Xem Log Metrics Hệ thống',
      'user-logs': 'Xem Log Người dùng',
      'user-management': 'Xem Quản lý Người dùng',
    };
    logUserAction('access_feature', featureNames[feature]);
  };

  const handleLogout = () => {
    logUserAction('logout', `Người dùng ${username} đăng xuất`);
    localStorage.removeItem('authToken');
    websocketService.setToken(null);
    websocketService.disconnectAll();
    reset();
    toast.success('Đã đăng xuất thành công');
    window.location.href = '/';
  };

  const renderContent = () => {
    switch (selectedFeature) {
      case 'dashboard':
        return <Dashboard userPermissions={userPermissions} />;
      case 'system-metrics':
        return <SystemMetricsTable />;
      case 'user-logs':
        return <UserLogTable />;
      case 'user-management':
        return role === 'admin' ? (
          <ErrorBoundary>
            <UserManagement role={role} />
          </ErrorBoundary>
        ) : (
          <div className="p-4 text-red-500">Bạn không có quyền truy cập chức năng này</div>
        );
      default:
        return <div className="text-gray-600">Chọn một chức năng từ menu</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      <ToastContainer />
      <div className="w-64 bg-gray-800 text-white p-4 flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center mb-6">
            <FaUser className="mr-2" />
            <h2 className="text-xl font-bold">{username || 'Người dùng'}</h2>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => handleFeatureChange('dashboard')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                selectedFeature === 'dashboard' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <FaTachometerAlt className="mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => handleFeatureChange('system-metrics')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                selectedFeature === 'system-metrics' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <FaTable className="mr-2" />
              Log Metrics Hệ thống
            </button>
            <button
              onClick={() => handleFeatureChange('user-logs')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                selectedFeature === 'user-logs' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <FaTable className="mr-2" />
              Log người dùng
            </button>
            {role === 'admin' && (
              <button
                onClick={() => handleFeatureChange('user-management')}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                  selectedFeature === 'user-management' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <FaUsers className="mr-2" />
                Quản lý người dùng
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
          >
            <FaCog className="mr-2 text-xl" />
          </button>
          {showLogout && (
            <div className="absolute top-0 right-0 w-48 bg-gray-700 rounded-lg mt-2 translate-y-[-140%] translate-x-[5%]">
              <button
                onClick={handleLogout}
                className="w-full text-left px-6 py-2 flex items-center text-white hover:bg-gray-600 rounded-lg"
              >
                <FaSignOutAlt className="mr-2" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 p-8 bg-gray-50">
        <div className="container mx-auto">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MainLayout;