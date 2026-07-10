import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Avatar, Tag, Card, Row, Col, Space, Typography, Button, message, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, UserOutlined, EyeOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import { PlayerFormDrawer } from './PlayerFormDrawer';
import './PlayerRoster.scss';

const { Text, Title } = Typography;

// Exactly matches the backend PlayerProfileResponse payload mapping structure
interface PlayerProfileResponse {
  playerId: string;
  playerName: string;
  category: string | null;
  parentPhone: string;
  age: string;
  heightCm: number;
  weightKg: number;
  dominantFoot: string;
  position: string;
  preferredJerseyNumber: number | null;
  biography: string | null;
  photo: string | null;
}

export const PlayerRoster: React.FC = () => {
  const [profiles, setProfiles] = useState<PlayerProfileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Drawer states for management
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfileResponse | null>(null);

  const navigate = useNavigate();

  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50'],
  });

  const fetchProfiles = useCallback(async (page = 1, size = pagination.pageSize || 10, search = searchQuery) => {
    setLoading(true);
    try {
      // Direct integration with backend: PlayerProfileController.getPlayerProfiles
      const response = await apiClient.get('/players/profile/all', {
        params: {
          search: search || undefined,
          pageNumber: page - 1, // Backend handles 0-indexed pagination
          pageSize: size,
        },
      });

      const apiResponse = response.data;
      if (apiResponse.success && apiResponse.body) {
        setProfiles(apiResponse.body.content || []);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize: size,
          total: apiResponse.body.totalElements || 0,
        }));
      } else {
        message.error(apiResponse.message || 'Failed to fetch roster details.');
      }
    } catch (error) {
      message.error('Connection failed while retrieving player profile matrices.');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, searchQuery]);

  useEffect(() => {
    fetchProfiles(1);
  }, []);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchProfiles(newPagination.current || 1, newPagination.pageSize || 10, searchQuery);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    fetchProfiles(1, pagination.pageSize || 10, '');
  };

  const openEditDrawer = (record: PlayerProfileResponse) => {
    setSelectedPlayer(record);
    setDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setSelectedPlayer(null);
    setDrawerOpen(true);
  };

  const getDominantFootTag = (foot: string) => {
    const normalize = foot?.toUpperCase();
    if (normalize === 'RIGHT') return <Tag color="blue">Right</Tag>;
    if (normalize === 'LEFT') return <Tag color="orange">Left</Tag>;
    return <Tag color="default">{foot || '—'}</Tag>;
  };

  const columns: ColumnsType<PlayerProfileResponse> = [
    {
      title: 'Photo',
      dataIndex: 'photo',
      key: 'photo',
      width: 75,
      fixed: 'left',
      render: (url: string) => (
        <Avatar src={url} icon={<UserOutlined />} size={44} className="roster-avatar-frame" />
      ),
    },
    {
      title: 'Athlete Name',
      dataIndex: 'playerName',
      key: 'playerName',
      fixed: 'left',
      sorter: (a, b) => a.playerName.localeCompare(b.playerName),
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Squad #',
      dataIndex: 'preferredJerseyNumber',
      key: 'preferredJerseyNumber',
      align: 'center',
      width: 95,
      render: (num) => num ? <Tag color="black" style={{fontWeight: 'bold'}}>{`# ${num}`}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Age Metric',
      dataIndex: 'age',
      key: 'age',
      width: 140,
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      render: (pos: string) => <Tag color="geekblue">{pos || 'UNASSIGNED'}</Tag>,
    },
    {
      title: 'Foot',
      dataIndex: 'dominantFoot',
      key: 'dominantFoot',
      width: 90,
      render: (foot: string) => getDominantFootTag(foot),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => cat ? <Tag color="purple">{cat}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Biometrics',
      key: 'biometrics',
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0} className="biometric-text-stack">
          <span><Text type="secondary">H:</Text> {record.heightCm ? `${record.heightCm} cm` : '—'}</span>
          <span><Text type="secondary">W:</Text> {record.weightKg ? `${record.weightKg} kg` : '—'}</span>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View Profile Analytics">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/players/profile/${record.playerId}`)}
            />
          </Tooltip>
          <Tooltip title="Modify Profile Drawer">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditDrawer(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="player-roster-view-wrapper">
      <div className="roster-view-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Academy Roster Management</Title>
          <Text type="secondary">Monitor active squad metrics, biographical details, and athletic performance classes.</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large" 
          onClick={openCreateDrawer}
        >
          Add Athlete Profile
        </Button>
      </div>

      <Card className="roster-filter-card" bordered={false}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={16} md={18} lg={20}>
            <Input
              placeholder="Search across athlete names, age metrics, or phone numbers..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={() => fetchProfiles(1)}
              size="large"
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6} lg={4}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button type="primary" onClick={() => fetchProfiles(1)} size="large" block>
                Filter
              </Button>
              <Button onClick={handleClearFilters} size="large" icon={<ReloadOutlined />} />
            </Space>
          </Col>
        </Row>
      </Card>

      <div className="roster-table-scroll-container">
        <Table
          columns={columns}
          dataSource={profiles}
          rowKey="playerId"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          bordered={false}
          scroll={{ x: 1100 }}
          className="premium-roster-table"
        />
      </div>

      <PlayerFormDrawer
        visible={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedPlayer(null);
        }}
        playerData={selectedPlayer}
        onSuccess={() => fetchProfiles(pagination.current || 1)}
      />
    </div>
  );
};