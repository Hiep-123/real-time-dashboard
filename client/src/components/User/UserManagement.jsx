import { useState, useEffect } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import DataTable from 'react-data-table-component';
import Modal from 'react-modal';
import './UserManagement.css';

// Đặt ứng dụng root cho Modal
Modal.setAppElement('#root');

const UserManagement = ({ role }) => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role_id: 'viewer', channels: [] });
  const [editUser, setEditUser] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [availableChannels] = useState(['server', 'network', 'finance']);
  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    if (role !== 'admin') return;
    const token = localStorage.getItem('authToken');
    fetch('http://localhost:3001/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Dữ liệu từ API:', data);
        if (Array.isArray(data)) setUsers(data);
        else setUsers([]);
        data.forEach(user => {
          fetch(`http://localhost:3001/auth/permissions?user_id=${user.user_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(permData => {
              setUserPermissions(prev => ({
                ...prev,
                [user.user_id]: permData.channels || []
              }));
            })
            .catch(error => console.error('Lỗi khi lấy quyền:', error));
        });
      })
      .catch(error => {
        console.error('Lỗi khi fetch users:', error);
        setUsers([]);
      });
  }, [role]);

  const handleAssignChannelPermission = (user_id, channel_id) => {
    if (role !== 'admin') return;
    const token = localStorage.getItem('authToken');
    fetch('http://localhost:3001/api/channel-permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ user_id, channel_id, access_level: 'read' })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(() => {
        return fetch(`http://localhost:3001/auth/permissions?user_id=${user_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json());
      })
      .then(data => {
        setUserPermissions(prev => ({
          ...prev,
          [user_id]: data.channels || []
        }));
        useDashboardStore.getState().setUser(null, { channels: data.channels });
      })
      .catch(error => console.error('Lỗi khi gán quyền channel:', error));
  };

  const handleAddUser = () => {
    if (role !== 'admin') return;
    const token = localStorage.getItem('authToken');
    fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ username: newUser.username, password: newUser.password, role_id: newUser.role_id })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const newUserId = data.user_id;
        const permissionPromises = newUser.channels.map(channel => {
          return fetch('http://localhost:3001/api/channel-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ user_id: newUserId, channel_id: channel, access_level: 'read' })
          });
        });
        return Promise.all(permissionPromises).then(() => {
          setNewUser({ username: '', password: '', role_id: 'viewer', channels: [] });
          setModalType(null);
          fetch('http://localhost:3001/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()).then(data => setUsers(data));
          fetch(`http://localhost:3001/auth/permissions?user_id=${newUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()).then(permData => {
            setUserPermissions(prev => ({
              ...prev,
              [newUserId]: permData.channels || []
            }));
            useDashboardStore.getState().setUser(null, { channels: permData.channels });
          });
        });
      })
      .catch(error => console.error('Lỗi khi thêm user:', error));
  };

  const handleUpdateUser = () => {
    if (role !== 'admin' || !editUser) return;
    const { user_id, username, role_id, channels } = editUser;
    const token = localStorage.getItem('authToken');
    
    // Cập nhật thông tin người dùng
    fetch(`http://localhost:3001/api/users/${user_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ user_id, username, role_id })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(() => {
        // Lấy danh sách kênh hiện tại từ userPermissions
        const currentChannels = userPermissions[user_id] || [];
        // Các kênh cần thêm
        const channelsToAdd = channels.filter(channel => !currentChannels.includes(channel));
        // Các kênh cần xóa
        const channelsToRemove = currentChannels.filter(channel => !channels.includes(channel));

        // Gán các kênh mới
        const addPromises = channelsToAdd.map(channel => {
          return fetch('http://localhost:3001/api/channel-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ user_id, channel_id: channel, access_level: 'read' })
          });
        });

        // Xóa các kênh bị bỏ tích
        const removePromises = channelsToRemove.map(channel => {
          return fetch(`http://localhost:3001/api/channel-permissions`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ user_id, channel_id: channel })
          });
        });

        return Promise.all([...addPromises, ...removePromises]);
      })
      .then(() => {
        setEditUser(null);
        setModalType(null);
        fetch('http://localhost:3001/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => setUsers(data));
        fetch(`http://localhost:3001/auth/permissions?user_id=${user_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(permData => {
          setUserPermissions(prev => ({
            ...prev,
            [user_id]: permData.channels || []
          }));
        });
      })
      .catch(error => console.error('Lỗi khi cập nhật user:', error));
  };

  const handleDeleteUser = () => {
    if (role !== 'admin' || !deleteUserId) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Không tìm thấy token');
      return;
    }
    fetch(`http://localhost:3001/api/users/${deleteUserId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(() => {
        setDeleteUserId(null);
        setModalType(null);
        fetch('http://localhost:3001/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => setUsers(data));
      })
      .catch(error => {
        console.error('Lỗi khi xóa user:', error);
        setUsers([]);
      });
  };

  if (role !== 'admin') {
    return <div className="p-4 text-red-500">Bạn không có quyền truy cập chức năng này</div>;
  }

  // Cấu hình cột cho DataTable
  const columns = [
    {
      name: 'Tên người dùng',
      selector: row => row.username,
      sortable: true,
    },
    {
      name: 'Vai trò',
      selector: row => row.role_id,
      sortable: true,
    },
    {
      name: 'Kênh',
      cell: row => userPermissions[row.user_id]?.join(', ') || 'Chưa gán',
    },
    {
      name: 'Hành động',
      cell: row => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditUser({
                user_id: row.user_id,
                username: row.username,
                role_id: row.role_id,
                channels: userPermissions[row.user_id] || []
              });
              setModalType('edit');
            }}
            className="bg-yellow-500 text-white p-2 rounded"
          >
            Sửa
          </button>
          <button
            onClick={() => {
              setDeleteUserId(row.user_id);
              setModalType('delete');
            }}
            className="bg-red-500 text-white p-2 rounded"
          >
            Xóa
          </button>
          <select
            onChange={e => handleAssignChannelPermission(row.user_id, e.target.value)}
            value=""
            className="p-2 rounded"
          >
            <option value="">Gán kênh</option>
            {availableChannels
              .filter(channel => !userPermissions[row.user_id]?.includes(channel))
              .map(channel => (
                <option key={channel} value={channel}>
                  {channel.charAt(0).toUpperCase() + channel.slice(1)}
                </option>
              ))}
          </select>
        </div>
      ),
    },
  ];

  // CSS tùy chỉnh cho DataTable
  const customStyles = {
    headCells: {
      style: {
        backgroundColor: '#f3f4f6',
        fontWeight: 'bold',
        fontSize: '14px',
      },
    },
    cells: {
      style: {
        fontSize: '14px',
      },
    },
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quản lý người dùng</h2>
      <button
        onClick={() => {
          setNewUser({ username: '', password: '', role_id: 'viewer', channels: [] });
          setModalType('add');
        }}
        className="bg-blue-500 text-white p-2 rounded mb-4"
      >
        Thêm người dùng
      </button>
      <DataTable
        columns={columns}
        data={users}
        customStyles={customStyles}
        pagination
        highlightOnHover
        noDataComponent="Không có người dùng nào"
      />

      {/* Modal chung cho thêm, sửa, xóa */}
      <Modal
        isOpen={modalType !== null}
        onRequestClose={() => {
          setModalType(null);
          setNewUser({ username: '', password: '', role_id: 'viewer', channels: [] });
          setEditUser(null);
          setDeleteUserId(null);
        }}
        className="modal"
        overlayClassName="modal-overlay"
      >
        {modalType === 'add' && (
          <>
            <h2 className="text-xl font-bold mb-4">Thêm người dùng mới</h2>
            <div className="mb-4">
              <input
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Tên người dùng"
                className="p-2 border rounded w-full"
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mật khẩu"
                className="p-2 border rounded w-full"
              />
            </div>
            <div className="mb-4">
              <select
                value={newUser.role_id}
                onChange={e => setNewUser({ ...newUser, role_id: e.target.value })}
                className="p-2 border rounded w-full"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Kênh</label>
              <div className="flex flex-col gap-2">
                {availableChannels.map(channel => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newUser.channels.includes(channel)}
                      onChange={() => {
                        const updatedChannels = newUser.channels.includes(channel)
                          ? newUser.channels.filter(c => c !== channel)
                          : [...newUser.channels, channel];
                        setNewUser({ ...newUser, channels: updatedChannels });
                      }}
                      className="mr-2"
                    />
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddUser}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Thêm
              </button>
              <button
                onClick={() => {
                  setModalType(null);
                  setNewUser({ username: '', password: '', role_id: 'viewer', channels: [] });
                }}
                className="bg-gray-500 text-white p-2 rounded"
              >
                Hủy
              </button>
            </div>
          </>
        )}

        {modalType === 'edit' && editUser && (
          <>
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa người dùng</h2>
            <div className="mb-4">
              <input
                value={editUser.username}
                onChange={e => setEditUser({ ...editUser, username: e.target.value })}
                placeholder="Tên người dùng"
                className="p-2 border rounded w-full"
              />
            </div>
            <div className="mb-4">
              <select
                value={editUser.role_id}
                onChange={e => setEditUser({ ...editUser, role_id: e.target.value })}
                className="p-2 border rounded w-full"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Kênh</label>
              <div className="flex flex-col gap-2">
                {availableChannels.map(channel => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editUser.channels.includes(channel)}
                      onChange={() => {
                        const updatedChannels = editUser.channels.includes(channel)
                          ? editUser.channels.filter(c => c !== channel)
                          : [...editUser.channels, channel];
                        setEditUser({ ...editUser, channels: updatedChannels });
                      }}
                      className="mr-2"
                    />
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateUser}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Lưu
              </button>
              <button
                onClick={() => {
                  setModalType(null);
                  setEditUser(null);
                }}
                className="bg-gray-500 text-white p-2 rounded"
              >
                Hủy
              </button>
            </div>
          </>
        )}

        {modalType === 'delete' && deleteUserId && (
          <>
            <h2 className="text-xl font-bold mb-4">Xác nhận xóa</h2>
            <p className="mb-4">Bạn có chắc chắn muốn xóa người dùng này?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteUser}
                className="bg-red-500 text-white p-2 rounded"
              >
                Xóa
              </button>
              <button
                onClick={() => {
                  setModalType(null);
                  setDeleteUserId(null);
                }}
                className="bg-gray-500 text-white p-2 rounded"
              >
                Hủy
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;