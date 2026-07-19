import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Input, Button, Card, Row, Col, Space, Typography, message } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, EyeOutlined, PhoneOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import { ParentFormDrawer } from './ParentFormDrawer';
import { hasAnyRole } from '../../utils/authRoles';
import './ParentsDirectory.scss';

const { Text } = Typography;

export interface ParentData {
  id: number;
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

interface ParentsDirectoryProps {
  openCreateOnLoad?: boolean;
}

export const ParentsDirectory: React.FC<ParentsDirectoryProps> = ({ openCreateOnLoad = false }) => {
  const [parents, setParents] = useState<ParentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  
  // Drawer visibility controls
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedParent, setSelectedParent] = useState<ParentData | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = React.useMemo(() => {
    const userRaw = localStorage.getItem('pfa_user');
    if (!userRaw) return false;
    try {
      const user = JSON.parse(userRaw);
      return hasAnyRole(user.roles, ['ROLE_ADMIN', 'ADMIN']);
    } catch {
      return false;
    }
  }, []);

  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
  });

  const fetchParents = async (page = 1, size = pagination.pageSize || 10, query = search) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/parents', {
        params: {
          page: page - 1,
          size: size,
          search: query || undefined,
        },
      });

      const apiResponse = response.data;
      // Adapting both nested pagination responses or direct array responses safely
      const payload = apiResponse.body?.content || apiResponse.content || apiResponse.body || apiResponse || [];
      const totalElements = apiResponse.body?.totalElements || apiResponse.totalElements || payload.length || 0;

      setParents(Array.isArray(payload) ? payload : []);
      setPagination({
        current: page,
        pageSize: size,
        total: totalElements,
      });
    } catch (error) {
      message.error('System failed to retrieve guardian registry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  useEffect(() => {
    if (openCreateOnLoad) {
      setSelectedParent(null);
      setDrawerOpen(true);
    }
  }, [openCreateOnLoad]);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchParents(newPagination.current || 1, newPagination.pageSize || 10, search);
  };

  const handleOpenCreate = () => {
    navigate('/dashboard/parents/register');
    setSelectedParent(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (parent: ParentData) => {
    setSelectedParent(parent);
    setDrawerOpen(true);
  };

  const handleOpenParentDetails = (parent: ParentData) => {
    navigate(`/dashboard/parents/${parent.id}`, {
      state: { parentName: `${parent.lastName}, ${parent.firstName}` },
    });
  };

  const columns: ColumnsType<ParentData> = [
    {
      title: 'Guardian Name',
      key: 'fullName',
      fixed: 'left',
      render: (_, record) => <Text strong className="capitalize-text">{`${record.lastName}, ${record.firstName}`}</Text>,
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <PhoneOutlined style={{ color: '#52c41a' }} />
          <Text copyable>{phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => email ? <Text>{email}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Address Context',
      dataIndex: 'address',
      key: 'address',
      render: (addr: string) => addr ? <Text ellipsis={{ tooltip: addr }}>{addr}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: '#722ed1' }} />}
            onClick={() => handleOpenParentDetails(record)}
            title="View parent details"
          />
          {isAdmin && (
            <Button 
              type="text" 
              icon={<EditOutlined style={{ color: '#1890ff' }} />} 
              onClick={() => handleOpenEdit(record)}
              title="Edit parent"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="parents-directory-container">
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flexGrow: 1 }}>
          <h1 style={{ fontSize: 'calc(1.2rem + 1vw)', margin: '0 0 4px 0' }}>Parent & Guardian Directory</h1>
          <p style={{ color: '#8c8c8c', margin: 0, fontSize: '13px' }}>Manage primary contact keys, communication hooks, and billing linkages.</p>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Add New Guardian
        </Button>
      </div>

      <Card className="filter-card" bordered={false} style={{ marginBottom: '24px' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={16} md={18}>
            <Input
              placeholder="Search guardians by name, email, or telephone configuration..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => fetchParents(1)}
              size="large"
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button type="primary" onClick={() => fetchParents(1)} size="large" icon={<SearchOutlined />} style={{ flexGrow: 1 }}>
                Search
              </Button>
              <Button onClick={() => { setSearch(''); fetchParents(1, undefined, ''); }} size="large" icon={<ReloadOutlined />} />
            </div>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={parents}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        className="premium-table"
        bordered={false}
        scroll={{ x: 'max-content' }}
      />

      <ParentFormDrawer 
        visible={drawerOpen} 
        onClose={() => {
          setDrawerOpen(false);
          setSelectedParent(null);
          if (location.pathname === '/dashboard/parents/register') {
            navigate('/dashboard/parents');
          }
        }} 
        parentData={selectedParent} 
        onSuccess={() => fetchParents(pagination.current)}
      />
    </div>
  );
};