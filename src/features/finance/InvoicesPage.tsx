import React, { useState, useEffect, useMemo } from 'react';
import { Table, Card, Tag, Select, Button, Space, Typography, message, Modal, Form, Input, InputNumber } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';

const { Text } = Typography;
const { Option } = Select;

interface InvoiceResponse {
  invoiceId: number;
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

interface LedgerEntry {
  accountId: number;
  playerName: string;
  category: string;
  broughtForward: number;
  termTuition: number;
  nonFeeCharges: number;
  totalPaid: number;
  outstanding: number;
}

// Interfaces matching AcademyCalendarController responses
interface TermResponseDto {
  id: number;
  name: string;
  isCurrentActive: boolean;
  startDate: string;
  endDate: string;
}

interface SessionResponseDto {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  activitiesDescription: string;
  terms: TermResponseDto[];
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Filtering States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>('');
  const [termFilter, setTermFilter] = useState<string>('');

  // Dropdown Data Source States
  const [sessions, setSessions] = useState<SessionResponseDto[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerEntry[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);

  // Modal controls
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  // 1. Fetch sessions from the newly discovered calendar API
  const fetchCalendarData = async () => {
    try {
      const response = await apiClient.get('/admin/calendar/sessions/lastfive');
      if (response?.data?.success && Array.isArray(response.data.body)) {
        setSessions(response.data.body);
      }
    } catch (error) {
      console.error("Failed to load calendar sessions:", error);
    }
  };

  const fetchLedgerAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await apiClient.get('/finance/ledger-summary');
      if (response?.data?.success && Array.isArray(response.data.body)) {
        setLedgerAccounts(response.data.body);
      }
    } catch (error) {
      console.error("Failed to sync ledger matrix selections:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 2. Consume multi-parameter filters directly within our fetch pipeline
  const fetchInvoices = async (status: string, session: string, term: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/finance/invoices', {
        params: {
          ...(status && { status }),
          ...(session && { session }),
          ...(term && { term })
        }
      });

      if (response?.data?.success && Array.isArray(response.data.body)) {
        setInvoices(response.data.body);
      } else {
        throw new Error(response.data?.message || "Invalid API response structure.");
      }
    } catch (error: any) {
      console.error("Invoice response verification failed:", error);
      message.error(error.message || "Failed to load invoice records.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(statusFilter, sessionFilter, termFilter);
  }, [statusFilter, sessionFilter, termFilter]);

  useEffect(() => {
    fetchCalendarData();
    fetchLedgerAccounts();
  }, []);

  // Compute available terms dynamically based on the chosen session filter
  const availableTerms = useMemo(() => {
    if (!sessionFilter) return [];
    const matchedSession = sessions.find(s => s.name === sessionFilter);
    return matchedSession ? matchedSession.terms : [];
  }, [sessionFilter, sessions]);

  // Handle cascading reset if chosen session changes
  const handleSessionChange = (value: string) => {
    setSessionFilter(value);
    setTermFilter(''); // Reset term filter on session alteration
  };

  const handleCreateInvoice = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        accountId: values.accountId ? String(values.accountId) : null,
        amount: values.amount,
        itemType: values.itemType,
        description: values.description
      };

      const response = await apiClient.post('/finance/invoices', payload);

      if (response.data && response.data.success) {
        message.success('Invoice issued successfully.');
        setIsModalVisible(false);
        form.resetFields();
        fetchInvoices(statusFilter, sessionFilter, termFilter);
      } else {
        throw new Error(response.data?.message || 'Invoice publishing validation rejection.');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || 'Failed to dispatch invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<InvoiceResponse> = [
    {
      title: 'Invoice ID',
      dataIndex: 'invoiceId',
      key: 'invoiceId',
      render: (id) => <Text strong>#{id}</Text>,
    },
    {
      title: 'Player Name',
      dataIndex: 'playerName',
      key: 'playerName',
      render: (text) => <Text strong className="capitalize-text">{text}</Text>
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
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (val) => `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDue',
      key: 'amountDue',
      align: 'right',
      render: (val) => val === 0 ? (
        <Tag color="green">Settled</Tag>
      ) : (
        <Tag color="red" style={{ fontWeight: 600 }}>₦${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Tag>
      )
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
  ];

  return (
    <div className="finance-invoices-container" style={{ padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Space direction="horizontal" align="center">
          <FileTextOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
          <div>
            <h1 style={{ fontSize: 'calc(1.2rem + 1vw)', margin: '0 0 4px 0' }}>Invoice Registry</h1>
            <p style={{ color: '#637381', margin: 0, fontSize: '13px' }}>View distributed statements, check dynamic tracking parameters, and process billing adjustments.</p>
          </div>
        </Space>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => setIsModalVisible(true)}
        >
          Create New Invoice
        </Button>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
        {/* Dynamic Multi-Parameter Filtering Operations Panel */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Space direction="vertical" size={2}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Status Context</Text>
            <Select
              value={statusFilter}
              style={{ width: 180 }}
              onChange={setStatusFilter}
            >
              <Option value="">All Statuses</Option>
              <Option value="UNSETTLED">Unsettled</Option>
              <Option value="PARTIALLY_PAID">Partially Paid</Option>
              <Option value="SETTLED">Settled</Option>
            </Select>
          </Space>

          <Space direction="vertical" size={2}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Academic Session</Text>
            <Select
              value={sessionFilter}
              style={{ width: 180 }}
              onChange={handleSessionChange}
              placeholder="Select Session"
            >
              <Option value="">All Sessions</Option>
              {sessions.map(s => (
                <Option key={s.id} value={s.name}>{s.name}</Option>
              ))}
            </Select>
          </Space>

          <Space direction="vertical" size={2}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Session Term</Text>
            <Select
              value={termFilter}
              style={{ width: 180 }}
              onChange={setTermFilter}
              disabled={!sessionFilter}
              placeholder="Choose Term"
            >
              <Option value="">All Terms</Option>
              {availableTerms.map(t => (
                <Option key={t.id} value={t.name}>{t.name} TERM</Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table 
          columns={columns} 
          dataSource={invoices} 
          rowKey="invoiceId" 
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          className="premium-table"
        />
      </Card>

      {/* Creation Modal */}
      <Modal
        title="Issue New Invoice Statement"
        open={isModalVisible}
        onCancel={() => { if(!submitting) { setIsModalVisible(false); form.resetFields(); } }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateInvoice} style={{ marginTop: '16px' }}>
          <Form.Item 
            name="accountId" 
            label="Select Athlete Target Account"
            rules={[{ required: true, message: 'Please select a target account' }]}
          >
            <Select 
              showSearch 
              loading={loadingAccounts} 
              placeholder="Choose player ledger profile" 
              allowClear
              filterOption={(input, option) => {
                if (!option) return false;
                // Safely extract the visible string content or custom data attributes from the option
                const childrenText = String(option.children || '').toLowerCase();
                const valueText = String(option.value || '').toLowerCase();
                const searchInput = input.toLowerCase();
                
                return childrenText.includes(searchInput) || valueText.includes(searchInput);
              }}
            >
              {ledgerAccounts.map(item => (
                <Option key={item.accountId} value={item.accountId}>
                  {item.playerName} ({item.category})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="itemType" label="Charge Item Category" rules={[{ required: true }]}>
              <Select placeholder="Select item type">
                <Option value="TUITION">Tuition Fee Allocation</Option>
                <Option value="JERSEY">Official Matchday Jersey Kit</Option>
                <Option value="REGISTRATION">New Registration Assessment Fee</Option>
                <Option value="TOURNAMENT">League/Tournament Entry Pass</Option>
              </Select>
            </Form.Item>

            <Form.Item name="amount" label="Invoice Billing Cost (₦)" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
              <InputNumber 
                style={{ width: '100%' }} 
                min={0.01} 
                placeholder="0.00" 
                formatter={value => `₦ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? value.replace(/₦\s?|(,*)/g, '') : '') as any}
              />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Statement Description / Specifications" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Provide details..." />
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: '24px' }}>
            <Space>
              <Button disabled={submitting} onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Post Statement</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};