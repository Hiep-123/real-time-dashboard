import { useEffect, useState } from 'react';
import { useDashboardStore } from './store/useDashboardStore';
import Auth from './components/Auth';
import MainLayout from './components/MainLayout';
import ConnectionStatus from './components/ConnectionStatus';
import axios from 'axios';

function App() {
  const { setToken, initialize, reset } = useDashboardStore();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));
  const [userPermissions, setUserPermissions] = useState({ channels: [] });
  const [username, setUsername] = useState('');
  const [role, setRole] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:3001/auth/permissions', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { channels, username: userNameFromServer, role: userRole } = response.data;
        console.log('✅ Token hợp lệ. Channels:', channels, 'Username:', userNameFromServer, 'Role:', userRole);

        if (Array.isArray(channels)) {
          setToken(token);
          setUserPermissions({ channels, role: userRole });
          setUsername(userNameFromServer);
          setRole(userRole);
          setIsAuthenticated(true);
          initialize(channels);
        } else {
          throw new Error('Phản hồi không chứa danh sách channels hợp lệ');
        }
      } catch (error) {
        console.error('❌ Lỗi xác minh token:', error.response?.data || error.message);
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        reset();
      }
    };

    verifyToken();
  }, [setToken, initialize, reset]);

  useEffect(() => {
    return () => {
      if (!isAuthenticated) {
        reset();
      }
    };
  }, [isAuthenticated, reset]);

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        <>
          <header className="bg-gray-800 shadow-sm border-b border-gray-700">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Real-time Dashboard</h1>
                <p className="text-white">Live system metrics and monitoring</p>
              </div>
              <div className="flex items-center space-x-4">
                <img
                  src="https://tse2.mm.bing.net/th/id/OIP.wE2SX8Fq6JLAaaf93l8vtQHaCY?pid=Api&P=0&h=180"
                  alt="HUTECH Logo"
                  className="h-12 object-contain"
                />
                <p className="text-white text-lg font-semibold">Nhóm 5</p>
              </div>
              <ConnectionStatus />
            </div>
          </header>
          <MainLayout userPermissions={userPermissions} username={username} />
        </>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <Auth onLogin={() => setIsAuthenticated(true)} />
        </div>
      )}
    </div>
  );
}

export default App;