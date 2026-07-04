import React, { useState } from 'react';
import { Layout, Menu, Avatar, Space, Typography, theme } from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  DollarOutlined, 
  TrophyOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export const AdminDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  
  // Uses Ant Design's built-in design tokens for a crisp, cohesive look
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem('pfa_token');
    localStorage.removeItem('pfa_user');
    navigate('/login');
  };

  const menuItems = [
    { key: '/dashboard', icon: <UserOutlined />, label: 'Players Roster' },
    { key: '/matches', icon: <TrophyOutlined />, label: 'Match Fixtures' },
    { key: '/attendance', icon: <CalendarOutlined />, label: 'Attendance' },
    { key: '/finances', icon: <DollarOutlined />, label: 'Finances' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light"
        style={{ boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)', zIndex: 10 }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          padding: collapsed ? '0' : '0 16px'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1677ff', letterSpacing: '1px' }}>
            {collapsed ? 'PFA' : 'PRO FOOTBALL'}
          </Title>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['/dashboard']}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 16 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: colorBgContainer, 
          padding: '0 24px 0 0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          zIndex: 9
        }}>
          <div 
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '18px',
              padding: '0 24px',
              cursor: 'pointer',
              transition: 'color 0.3s',
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          
          <Space size="large">
            <Space direction="vertical" size={0} style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <Text strong style={{ display: 'block' }}>Academy Administrator</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>Management Portal</Text>
            </Space>
            <Avatar 
              icon={<UserOutlined />} 
              style={{ backgroundColor: '#1677ff', cursor: 'pointer' }} 
            />
            <div 
              onClick={handleLogout}
              style={{ fontSize: '16px', cursor: 'pointer', color: '#ff4d4f', paddingLeft: 8 }}
              title="Logout"
            >
              <LogoutOutlined />
            </div>
          </Space>
        </Header>
        
        <Content style={{ 
          margin: '24px 24px', 
          padding: 24, 
          background: colorBgContainer, 
          minHeight: 280, 
          borderRadius: borderRadiusLG,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};