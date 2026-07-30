import React, { useState, useEffect } from 'react';
import { Card, Avatar, Tag, Row, Col, Typography, Spin, Timeline, Alert, Table, Select, Empty, Statistic, Tabs, Divider, Space } from 'antd';
import { UserOutlined, CalendarOutlined, TrophyOutlined, WalletOutlined, FileTextOutlined, ContactsOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';
import { LogoutButton } from '../auth/LogoutButton';
import './ParentDashboard.scss';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export const ParentDashboard: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
    const [childDetails, setChildDetails] = useState<any>(null);
    const [loadingChild, setLoadingChild] = useState<boolean>(false);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await apiClient.get('/portal/parent/dashboard');
                const data = res.data?.body || res.data;
                setDashboardData(data);
                
                if (data.children && data.children.length > 0) {
                    setSelectedChildId(data.children[0].id);
                }
            } catch (err) {
                console.error("Failed to retrieve parent portal data.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (!selectedChildId) return;
        
        const fetchChildDetails = async () => {
            setLoadingChild(true);
            try {
                const res = await apiClient.get(`/portal/parent/child/${selectedChildId}`);
                setChildDetails(res.data?.body || res.data);
            } catch (err) {
                console.error("Failed to retrieve child details.");
            } finally {
                setLoadingChild(false);
            }
        };
        fetchChildDetails();
    }, [selectedChildId]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Loading parent profile & statements..." />
            </div>
        );
    }

    if (!dashboardData || !dashboardData.parent) {
        return (
            <div style={{ padding: '24px' }}>
                <Alert type="error" message="Profile error" description="Unable to load parent dashboard information." showIcon />
            </div>
        );
    }

    const { parent, children, invoices = [], payments = [] } = dashboardData;

    // Calculate outstanding financial metrics
    const totalBilled = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);
    const totalPaid = payments.reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0);
    const outstandingBalance = Math.max(0, totalBilled - totalPaid);
    const outstandingInvoices = invoices.filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'SETTLED');

    // Columns config for invoices ledger table
    const invoiceColumns = [
        {
            title: 'Invoice Ref',
            dataIndex: 'invoiceNumber',
            key: 'invoiceNumber',
            render: (ref: string) => <Text strong><FileTextOutlined /> {ref}</Text>
        },
        {
            title: 'Student/Athlete',
            dataIndex: 'player',
            key: 'player',
            render: (player: any) => <Text>{player ? `${player.firstName} ${player.lastName}` : '—'}</Text>
        },
        {
            title: 'Issue Date',
            dataIndex: 'issueDate',
            key: 'issueDate'
        },
        {
            title: 'Amount Billed',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amt: number) => <Text style={{ fontWeight: 'bold' }}>₦{Number(amt).toLocaleString()}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const color = status === 'PAID' ? 'green' : status === 'PARTIALLY_PAID' ? 'orange' : 'volcano';
                return <Tag color={color}>{status || 'PENDING'}</Tag>;
            }
        }
    ];

    // Columns config for payments ledger table
    const paymentColumns = [
        {
            title: 'Receipt Ref',
            dataIndex: 'receiptNumber',
            key: 'receiptNumber',
            render: (ref: string) => <Text strong>{ref || 'R-Auto'}</Text>
        },
        {
            title: 'Athlete',
            dataIndex: 'player',
            key: 'player',
            render: (player: any) => <Text>{player ? `${player.firstName} ${player.lastName}` : '—'}</Text>
        },
        {
            title: 'Payment Date',
            dataIndex: 'paymentDate',
            key: 'paymentDate'
        },
        {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod'
        },
        {
            title: 'Amount Paid',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amt: number) => <Text type="success" style={{ fontWeight: 'bold' }}>+₦{Number(amt).toLocaleString()}</Text>
        },
        {
            title: 'Receipt',
            key: 'receipt',
            align: 'center' as const,
            render: (_: any, record: any) => {
                if (!record.receiptUrl) return '—';
                return (
                    <a
                        onClick={() => {
                            const token = localStorage.getItem('pfa_token');
                            const url = `${apiClient.defaults.baseURL || 'http://localhost:8080/api/v1'}${record.receiptUrl}?token=${token}`;
                            window.open(url, '_blank');
                        }}
                        style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 500 }}
                    >
                        View & Print
                    </a>
                );
            }
        }
    ];

    return (
        <div className="parent-portal-dashboard-wrapper">
            {/* Header parent info card */}
            <div className="parent-portal-header-banner">
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} md={16}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div>
                                <Title level={2} style={{ color: '#fff', margin: 0 }}>
                                    Guardian Portal: {parent.firstName} {parent.lastName}
                                </Title>
                                <Text style={{ color: '#a0a0a0', fontSize: '14px', display: 'block', marginTop: '6px' }}>
                                    Linked Parent Account • Email: {parent.email} | Phone: {parent.phone}
                                </Text>
                            </div>
                            <LogoutButton className="portal-logout-btn" danger={false} />
                        </div>
                    </Col>
                    <Col xs={24} md={8}>
                        <Row gutter={16} justify="end">
                            <Col span={24} style={{ textAlign: 'right' }}>
                                <div className="balance-badge-widget">
                                    <Statistic 
                                        title={<span style={{ color: '#a0a0a0' }}>Outstanding Invoices Balance</span>} 
                                        value={outstandingBalance} 
                                        precision={2} 
                                        prefix="₦" 
                                        valueStyle={{ color: outstandingBalance > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }} 
                                    />
                                </div>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div>

            <Tabs defaultActiveKey="athletes" className="parent-portal-tabs" style={{ marginTop: '24px' }}>
                {/* TAB 1: Linked Athletes tracking */}
                <TabPane tab={<span><UserOutlined /> Roster & Progress</span>} key="athletes">
                    <Card bordered={false} className="portal-switcher-card">
                        <Space style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                            <Text strong>Select Child Profile:</Text>
                            <Select 
                                style={{ width: 220 }} 
                                value={selectedChildId || undefined} 
                                onChange={setSelectedChildId}
                                placeholder="Choose registered athlete"
                            >
                                {children.map((c: any) => (
                                    <Option key={c.id} value={c.id}>{c.firstName} {c.lastName}</Option>
                                ))}
                            </Select>
                        </Space>
                    </Card>

                    {loadingChild ? (
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <Spin tip="Retrieving child profile data..." />
                        </div>
                    ) : !childDetails ? (
                        <Empty description="No linked athlete details found." />
                    ) : (
                        <Row gutter={[24, 24]} style={{ marginTop: '20px' }}>
                            <Col xs={24} lg={10}>
                                <Card title={`${childDetails.child?.firstName}'s Biometrics & Profile`} className="portal-premium-card">
                                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                        <Avatar src={childDetails.child?.passportUrl} icon={<UserOutlined />} size={80} style={{ border: '2px solid #1890ff' }} />
                                        <Title level={4} style={{ margin: '8px 0 0 0' }}>{childDetails.child?.firstName} {childDetails.child?.lastName}</Title>
                                        <Tag color={childDetails.child?.status === 'ACTIVE' ? 'green' : 'orange'} style={{ marginTop: '4px' }}>
                                            {childDetails.child?.status || 'ACTIVE'}
                                        </Tag>
                                    </div>
                                    <Divider />
                                    <Row gutter={[12, 12]} style={{ fontSize: '13px' }}>
                                        <Col span={12}><Text type="secondary">Jersey #:</Text></Col>
                                        <Col span={12}><Text strong>#{childDetails.child?.profile?.preferredJerseyNumber || '—'}</Text></Col>

                                        <Col span={12}><Text type="secondary">Position:</Text></Col>
                                        <Col span={12}><Tag color="blue">{childDetails.child?.profile?.position || 'UNASSIGNED'}</Tag></Col>

                                        <Col span={12}><Text type="secondary">Dominant Foot:</Text></Col>
                                        <Col span={12}><Text>{childDetails.child?.profile?.dominantFoot || '—'}</Text></Col>

                                        <Col span={12}><Text type="secondary">Height Metric:</Text></Col>
                                        <Col span={12}><Text strong>{childDetails.child?.profile?.heightCm ? `${childDetails.child?.profile?.heightCm} cm` : '—'}</Text></Col>

                                        <Col span={12}><Text type="secondary">Weight Metric:</Text></Col>
                                        <Col span={12}><Text strong>{childDetails.child?.profile?.weightKg ? `${childDetails.child?.profile?.weightKg} kg` : '—'}</Text></Col>

                                        <Col span={12}><Text type="secondary">Date of Birth:</Text></Col>
                                        <Col span={12}><Text>{childDetails.child?.dateOfBirth}</Text></Col>
                                        
                                        <Col span={12}><Text type="secondary">Missed Sessions:</Text></Col>
                                        <Col span={12}>
                                            <Tag color={childDetails.missedTrainingsCount > 0 ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
                                                {childDetails.missedTrainingsCount || 0}
                                            </Tag>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>

                            <Col xs={24} lg={14}>
                                <Card title={<span><CalendarOutlined style={{ color: '#1890ff' }} /> Upcoming Training Sessions</span>} className="portal-premium-card" style={{ marginBottom: '24px' }}>
                                    {childDetails.upcomingTrainings?.length === 0 ? (
                                        <Empty description="No training sessions scheduled at this time." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    ) : (
                                        <Timeline mode="left">
                                            {childDetails.upcomingTrainings?.map((t: any) => (
                                                <Timeline.Item key={t.id} label={`${t.date}`} color="blue">
                                                    <Text strong>{t.theme}</Text>
                                                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                                        Time: {t.startTime} - {t.endTime}
                                                    </div>
                                                </Timeline.Item>
                                            ))}
                                        </Timeline>
                                    )}
                                </Card>

                                <Card title={<span><TrophyOutlined style={{ color: '#fa8c16' }} /> Match Fixtures ({childDetails.child?.profile?.category || 'General'})</span>} className="portal-premium-card">
                                    {childDetails.upcomingMatches?.length === 0 ? (
                                        <Empty description="No upcoming match fixtures." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    ) : (
                                        <Timeline mode="left">
                                            {childDetails.upcomingMatches?.map((m: any) => (
                                                <Timeline.Item key={m.id} label={`${m.date}`} color="orange">
                                                    <Text strong>vs. {m.opponentName}</Text>
                                                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                                        Time: {m.time} | Venue: {m.venue} | Type: {m.type}
                                                    </div>
                                                </Timeline.Item>
                                            ))}
                                        </Timeline>
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    )}
                </TabPane>

                {/* TAB 2: Financial Account details */}
                <TabPane tab={<span><WalletOutlined /> Invoices & Payments</span>} key="finances">
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            <Card title={<span><FileTextOutlined style={{ color: '#1890ff' }} /> Outstanding Invoices</span>} className="portal-premium-card" style={{ marginBottom: '24px' }}>
                                <Table 
                                    dataSource={outstandingInvoices} 
                                    columns={invoiceColumns} 
                                    rowKey="id" 
                                    pagination={{ pageSize: 5 }} 
                                    locale={{ emptyText: <Empty description="No outstanding invoices billed to your account." /> }}
                                />
                            </Card>

                            <Card title={<span><WalletOutlined style={{ color: '#52c41a' }} /> Payment History</span>} className="portal-premium-card">
                                <Table 
                                    dataSource={payments} 
                                    columns={paymentColumns} 
                                    rowKey="id" 
                                    pagination={{ pageSize: 5 }}
                                    locale={{ emptyText: <Empty description="No logged payment transactions registered." /> }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </TabPane>
            </Tabs>
        </div>
    );
};
