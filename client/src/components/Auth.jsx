import { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import axios from 'axios';

const Auth = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { setToken } = useDashboardStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Gửi yêu cầu đăng nhập:', { username, password });
      const response = await axios.post('http://localhost:3001/auth/login', {
        username,
        password
      });
      console.log('Phản hồi đăng nhập:', response.data);
      setToken(response.data.token); // Đảm bảo lưu token
      setError(null);
      onLogin();
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Lỗi đăng nhập:', err.response?.data || err.message);
      setError('Thông tin đăng nhập không hợp lệ');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Đăng nhập</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên người dùng</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 p-2 w-full border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 p-2 w-full border rounded-lg"
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;