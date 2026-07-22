import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Descriptions, Space, Table, Tag, Typography, message, Tabs, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, HomeOutlined, MailOutlined, PhoneOutlined, TeamOutlined, HistoryOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';

const { Title, Text } = Typography;

interface ParentDetails {
  id: number;
  username?: string;
  title?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  registrationDate?: string | null;
}

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

interface ParentPayment {
  paymentId: number;
  amountPaid: number;
  referenceNumber: string;
  paymentDate: string;
  playerName: string;
  termDisplayName: string;
}

interface UnsettledInvoice {
  invoiceId: number;
  accountId: number;
  playerId: string;
  playerName: string;
  termDisplayName: string;
  totalAmount: number;
  amountDue: number;
  category: string;
  description: string;
  status: string;
  createdAt: string;
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

const normalizeParentDetailsPayload = (data: unknown): ParentDetails | null => {
  if (data && typeof data === 'object') {
    const body = (data as Record<string, unknown>).body;
    if (body && typeof body === 'object') {
      return body as ParentDetails;
    }
  }

  return null;
};

export const ParentChildrenRoster: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, username } = useParams<{ id?: string; username?: string }>();
  const [children, setChildren] = useState<ParentChildPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [parentDetails, setParentDetails] = useState<ParentDetails | null>(null);
  const [parentName, setParentName] = useState('');

  const [payments, setPayments] = useState<ParentPayment[]>([]);
  const [unsettledInvoices, setUnsettledInvoices] = useState<UnsettledInvoice[]>([]);
  const [aggregateSum, setAggregateSum] = useState<number>(0);
  const [financeLoading, setFinanceLoading] = useState(false);

  const parentIdentifier = id || username || location.pathname.split('/').filter(Boolean).pop() || '';

  const fetchFinanceData = async (userNm: string) => {
    setFinanceLoading(true);
    try {
      const [paymentsRes, invoicesRes] = await Promise.all([
        apiClient.get(`/parents/${encodeURIComponent(userNm)}/payments`),
        apiClient.get(`/parents/${encodeURIComponent(userNm)}/children/unsettled-invoices`),
      ]);

      if (paymentsRes.data?.success && Array.isArray(paymentsRes.data.body)) {
        setPayments(paymentsRes.data.body);
      } else {
        setPayments([]);
      }

      if (invoicesRes.data?.success && invoicesRes.data.body) {
        setUnsettledInvoices(invoicesRes.data.body.invoices || []);
        setAggregateSum(invoicesRes.data.body.aggregateSum || 0);
      } else {
        setUnsettledInvoices([]);
        setAggregateSum(0);
      }
    } catch {
      message.error('Failed to load financial records.');
      setPayments([]);
      setUnsettledInvoices([]);
      setAggregateSum(0);
    } finally {
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    const state = location.state as { parentName?: string } | null;
    setParentName(state?.parentName || '');

    if (!parentIdentifier) {
      message.error('No guardian was selected for this details view.');
      return;
    }

    const fetchParentDetails = async () => {
      setLoading(true);
      try {
        const [detailsResponse, rosterResponse] = await Promise.all([
          apiClient.get(`/parents/${encodeURIComponent(parentIdentifier)}`),
          apiClient.get(`/parents/${encodeURIComponent(parentIdentifier)}/my-roster/byId`),
        ]);

        const details = normalizeParentDetailsPayload(detailsResponse.data);
        setParentDetails(details);
        setParentName(
          details ? `${details.lastName || ''}, ${details.firstName || ''}`.trim() : state?.parentName || ''
        );
        setChildren(normalizeChildrenPayload(rosterResponse.data));

        if (details?.username) {
          await fetchFinanceData(details.username);
        }
      } catch {
        message.error('Failed to load this guardian\'s details.');
        setParentDetails(null);
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchParentDetails();
  }, [location.pathname, location.state, parentIdentifier]);

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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const invoiceColumns: ColumnsType<UnsettledInvoice> = [
    {
      title: 'Invoice ID',
      dataIndex: 'invoiceId',
      key: 'invoiceId',
      render: (val: number) => <Text strong>#{val}</Text>,
    },
    {
      title: 'Player Name',
      dataIndex: 'playerName',
      key: 'playerName',
      render: (text: string) => <Text strong style={{ textTransform: 'capitalize' }}>{text}</Text>,
    },
    {
      title: 'Academic Term',
      dataIndex: 'termDisplayName',
      key: 'termDisplayName',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => <Text type="secondary">{desc || '—'}</Text>,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (val: number) => `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDue',
      key: 'amountDue',
      align: 'right',
      render: (val: number) => (
        <Tag color="red" style={{ fontWeight: 600 }}>
          ₦${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => {
        let color = 'default';
        if (status === 'SETTLED') color = 'green';
        if (status === 'PARTIALLY_PAID') color = 'orange';
        if (status === 'UNSETTLED') color = 'red';
        return <Tag color={color} style={{ fontWeight: 600 }}>{status}</Tag>;
      },
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
  ];

  const paymentColumns: ColumnsType<ParentPayment> = [
    {
      title: 'Payment ID',
      dataIndex: 'paymentId',
      key: 'paymentId',
      render: (val: number) => <Text strong>#{val}</Text>,
    },
    {
      title: 'Reference Number',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      render: (ref: string) => <Text strong>{ref}</Text>,
    },
    {
      title: 'Player Name',
      dataIndex: 'playerName',
      key: 'playerName',
      render: (text: string) => <Text strong style={{ textTransform: 'capitalize' }}>{text}</Text>,
    },
    {
      title: 'Academic Term',
      dataIndex: 'termDisplayName',
      key: 'termDisplayName',
    },
    {
      title: 'Amount Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      align: 'right',
      render: (val: number) => <Text type="success" strong>₦${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
  ];

  const fullName = [parentDetails?.title, parentDetails?.firstName, parentDetails?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Parent Details
          </Title>
          <Text type="secondary">
            {parentName ? `Viewing ${parentName}.` : 'Review guardian information and linked children.'}
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
        message={parentName ? `Guardian profile • ${parentName}` : 'Guardian profile'}
        description="This view shows the guardian’s profile details and the children attached to the account."
        style={{ marginBottom: '16px' }}
      />

      <Card bordered={false} style={{ marginBottom: '16px' }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Guardian Name">{fullName || parentName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Username">{parentDetails?.username || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">
            {parentDetails?.phone ? (
              <Space>
                <PhoneOutlined />
                <Text>{parentDetails.phone}</Text>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {parentDetails?.email ? (
              <Space>
                <MailOutlined />
                <Text>{parentDetails.email}</Text>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Address">
            {parentDetails?.address ? (
              <Space>
                <HomeOutlined />
                <Text>{parentDetails.address}</Text>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Registration Date">
            {parentDetails?.registrationDate ? (
              <Space>
                <CalendarOutlined />
                <Text>{parentDetails.registrationDate}</Text>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ marginTop: '16px' }}>
        <Tabs
          defaultActiveKey="children"
          items={[
            {
              key: 'children',
              label: (
                <span>
                  <TeamOutlined />
                  Children Roster ({children.length})
                </span>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={children}
                  rowKey="playerId"
                  loading={loading}
                  pagination={false}
                  bordered={false}
                  locale={{ emptyText: 'No children found for this guardian.' }}
                />
              ),
            },
            {
              key: 'invoices',
              label: (
                <span>
                  <FileTextOutlined />
                  Unsettled Invoices ({unsettledInvoices.length})
                </span>
              ),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                      <Card style={{ background: '#fff2f0', border: '1px solid #ffccc7' }}>
                        <Statistic
                          title={<span style={{ color: '#cf1322' }}>Total Outstanding Balance</span>}
                          value={aggregateSum}
                          precision={2}
                          prefix="₦"
                          valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    columns={invoiceColumns}
                    dataSource={unsettledInvoices}
                    rowKey="invoiceId"
                    loading={financeLoading}
                    pagination={false}
                    bordered={false}
                    locale={{ emptyText: 'No unsettled invoices found for this guardian.' }}
                  />
                </Space>
              ),
            },
            {
              key: 'payments',
              label: (
                <span>
                  <HistoryOutlined />
                  Payment History ({payments.length})
                </span>
              ),
              children: (
                <Table
                  columns={paymentColumns}
                  dataSource={payments}
                  rowKey="paymentId"
                  loading={financeLoading}
                  pagination={false}
                  bordered={false}
                  locale={{ emptyText: 'No payment history found for this guardian.' }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
