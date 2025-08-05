-- Tạo cơ sở dữ liệu
CREATE DATABASE MonitoringDashboard;
GO

USE MonitoringDashboard;
GO

-- Tạo bảng cho vai trò, người dùng, và quyền (tuân thủ 3NF)
CREATE TABLE roles (
  role_id VARCHAR(50) PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  description NVARCHAR(MAX)
);

CREATE TABLE users (
  user_id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE channels (
  channel_id VARCHAR(50) PRIMARY KEY,
  channel_name VARCHAR(100) NOT NULL,
  description NVARCHAR(MAX)
);

CREATE TABLE user_channel_permissions (
  user_id VARCHAR(50),
  channel_id VARCHAR(50),
  access_level VARCHAR(10) CHECK (access_level IN ('read', 'write', 'admin')) NOT NULL,
  PRIMARY KEY (user_id, channel_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);

CREATE TABLE events (
  event_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  channel_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(20) CHECK (event_type IN ('info', 'warning', 'error')) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  timestamp DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);

CREATE TABLE metrics (
  metric_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  channel_id VARCHAR(50) NOT NULL,
  cpu DECIMAL(5,2) NOT NULL,
  memory DECIMAL(5,2) NOT NULL,
  network DECIMAL(10,2) NOT NULL,
  disk DECIMAL(5,2) NOT NULL,
  users INT NOT NULL,
  transactions INT NOT NULL,
  timestamp DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);

CREATE TABLE logs (
  log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  details NVARCHAR(MAX),
  timestamp DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Chèn dữ liệu mẫu
INSERT INTO roles (role_id, role_name, description)
VALUES 
  ('admin', N'Quản trị viên', N'Toàn quyền truy cập tất cả các kênh'),
  ('viewer', N'Người xem', N'Chỉ đọc cho các kênh cụ thể');

INSERT INTO users (user_id, username, password_hash, role_id)
VALUES 

  ('user1', 'admin_user', '$2a$12$JW.kdxDZ9R0FwOirUFH5h.GXE9/K0qSxIxd6C6jTEIpqeQJSyShUG', 'admin'),
  ('user2', 'viewer_user', '$2a$12$JW.kdxDZ9R0FwOirUFH5h.GXE9/K0qSxIxd6C6jTEIpqeQJSyShUG', 'viewer');

INSERT INTO channels (channel_id, channel_name, description)
VALUES 
  ('server', N'Giám sát Server', N'Chỉ số hiệu suất server'),
  ('network', N'Giám sát Mạng', N'Chỉ số lưu lượng mạng'),
  ('finance', N'Giám sát Tài chính', N'Chỉ số giao dịch tài chính');

INSERT INTO user_channel_permissions (user_id, channel_id, access_level)
VALUES 
  ('user1', 'server', 'admin'),
  ('user1', 'network', 'admin'),
  ('user1', 'finance', 'admin'),
  ('user2', 'server', 'read');
GO
