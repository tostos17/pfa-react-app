import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Space, Table, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';

const { Title, Text } = Typography;

interface ParentChildPlayer {
  playerId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  healthy?: boolean | null;
  healthConcernDescription?: string | null;
  passportUrl?: string | null;
}

const normalizeChildrenPayload = (data: unknown): ParentChildPlayer[] => {
  if (Array.isArray(data)) {
    return data as ParentChildPlayer[];
  }

  if (data && typeof data === 'object') {
    const body = (data as Record<string, unknown>).body;
    if (Array.isArray(body)) {
      return body as ParentChildPlayer[];
    }

    if (body && typeof body === 'object') {
      const content = (body as Record<string, unknown>).content;
      if (Array.isArray(content)) {
        return content as ParentChildPlayer[];
      }
    }
  }

  return [];
};

export const ParentChildrenRoster: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [children, setChildren] = useState<ParentChildPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [parentName, setParentName] = useState('');

  const pathUsername = location.pathname.split('/').filter(Boolean).pop();

  useEffect(() => {
    const state = location.state as { parentName?: string; username?: string } | null;
    const username = state?.username || pathUsername || '';
    setParentName(state?.parentName || '');

    if (!username) {
      message.error('No guardian was selected for this roster view.');
      return;
    }

    const fetchChildren = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/parents/${encodeURIComponent(username)}/my-roster`);
        setChildren(normalizeChildrenPayload(response.data));
      } catch {
        message.error('Failed to load this guardian\'s children.');
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchChildren();
  }, [location.pathname, location.state, pathUsername]);

  const columns: ColumnsType<ParentChildPlayer> = [
    {
      title: 'Child Name',
      key: 'childName',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{`${record.firstName} ${record.middleName ? `${record.middleName} ` : ''}${record.lastName}`.trim()}</Text>
          <Text type="secondary">{record.email || 'No email on file'}</Text>
        </Space>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (value: string | null | undefined) => value ? <Text>{value}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Date of Birth',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      render: (value: string | null | undefined) => value ? <Text>{value}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Health Status',
      key: 'healthStatus',
      render: (_, record) => (
        <Tag color={record.healthy === false ? 'volcano' : 'green'}>
          {record.healthy === false ? 'Needs attention' : 'Healthy'}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Guardian Children Roster
          </Title>
          <Text type="secondary">
            {parentName ? `Showing children linked to ${parentName}.` : 'Review the children attached to a guardian account.'}
          </Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/parents')}>
          Back to Guardians
        </Button>
      </div>

      <Alert
        type="info"
        showIcon
        icon={<TeamOutlined />}
        message={parentName ? `Children for ${parentName}` : 'Guardian roster'}
        description="This view lists the players tied to the selected guardian account."
        style={{ marginBottom: '16px' }}
      />

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={children}
          rowKey="playerId"
          loading={loading}
          pagination={false}
          bordered={false}
          locale={{ emptyText: 'No children found for this guardian.' }}
        />
      </Card>
    </div>
  );
};
