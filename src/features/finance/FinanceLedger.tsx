import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Statistic, Tag, Input, Button, Modal, Form, Select, InputNumber, Space, Typography, message } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';

const { Text } = Typography;
const { Option } = Select;

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

export const FinanceLedger: React.FC = () => {
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false);
    const [form] = Form.useForm();
    const [invoiceForm] = Form.useForm();

    const fetchLedgerMatrix = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/finance/ledger-summary');

            if (!response || !response.data || typeof response.data !== 'object') {
                throw new Error("Invalid root API response received.");
            }

            if (response.data.success) {
                const bodyData = response.data.body;

                if (!bodyData || !Array.isArray(bodyData)) {
                    throw new Error("API reports success, but data body is missing or is not an array.");
                }

                const isValidStructure = bodyData.every((item: any) =>
                    item &&
                    typeof item.accountId === 'number' &&
                    typeof item.playerName === 'string' &&
                    typeof item.outstanding === 'number'
                );

                if (!isValidStructure) {
                    throw new Error("Data schema mismatch: One or more entry properties are missing or corrupted.");
                }

                setLedger(bodyData);
            } else {
                throw new Error(response.data.message || "Server flagged transaction status success as false.");
            }
        } catch (error: any) {
            console.error("Ledger response verification failed:", error);
            message.error(error.message || "Failed to load ledger records from server.");
            setLedger([]); // Fallback safely to clear stale screen records
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLedgerMatrix(); }, []);

    // 🌟 DYNAMIC METRIC CALCULATIONS
    const totalProjectedRevenue = ledger.reduce((sum, item) => 
        sum + item.broughtForward + item.termTuition + item.nonFeeCharges, 0
    );
    const totalCashCollected = ledger.reduce((sum, item) => sum + item.totalPaid, 0);
    const outstandingReceivables = ledger.reduce((sum, item) => sum + item.outstanding, 0);

    const handlePostPayment = async (values: any) => {
        const payload = {
            accountId: values.accountId, // Fixed: Kept as a raw number to match Backend Long validation schema
            amountPaid: values.amountPaid,
            paymentMethod: values.paymentMethod,
            referenceNumber: values.referenceNumber || null
        };

        try {
            setLoading(true);
            const response = await apiClient.post('/finance/payments', payload);

            if (!response || !response.data || typeof response.data !== 'object') {
                throw new Error("Invalid root API response received.");
            }

            if (response.data.success) {
                message.success('Payment successfully logged. Ledger account rebalanced.');
                setPaymentModalOpen(false);
                form.resetFields();
                fetchLedgerMatrix();
            } else {
                throw new Error(response.data.message || "Payment rejected by verification processing engine.");
            }
        } catch (err: any) {
            console.error("Payment submission failed: ", err);
            message.error(err.message || 'Failed to file payment into active ledger.');
        } finally {
            setLoading(false);
        }
    };

    const handlePostInvoice = async (values: any) => {
        try {
            setLoading(true);
            const response = await apiClient.post('/finance/invoices', values);
            
            if (response && response.data && response.data.success) {
                message.success('Non-fee statement item applied to target account profile.');
                setInvoiceModalOpen(false);
                invoiceForm.resetFields();
                fetchLedgerMatrix();
            } else {
                throw new Error(response.data?.message || "Invoice tracking record creation rejected.");
            }
        } catch (err: any) {
            console.error("Invoice submission failed: ", err);
            message.error(err.message || 'Failed to apply custom item charge to player.');
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnsType<LedgerEntry> = [
        {
            title: 'Athlete Name',
            dataIndex: 'playerName',
            key: 'playerName',
            render: (text) => <Text strong className="capitalize-text">{text}</Text>
        },
        {
            title: 'Brought Forward',
            dataIndex: 'broughtForward',
            render: (val) => <Text type={val > 0 ? "danger" : "secondary"}>₦{val.toLocaleString()}</Text>
        },
        {
            title: 'Term Tuition',
            dataIndex: 'termTuition',
            render: (val) => `₦${val.toLocaleString()}`
        },
        {
            title: 'Other Invoices',
            dataIndex: 'nonFeeCharges',
            render: (val) => val > 0 ? <Tag color="orange">₦{val.toLocaleString()}</Tag> : '—'
        },
        {
            title: 'Total Collected',
            dataIndex: 'totalPaid',
            render: (val) => <Text style={{ color: '#00b074', fontWeight: 500 }}>₦{val.toLocaleString()}</Text>
        },
        {
            title: 'Net Outstanding',
            dataIndex: 'outstanding',
            render: (val) => val === 0 ? (
                <Tag color="green">Settled</Tag>
            ) : (
                <Tag color="red" style={{ fontWeight: 600 }}>₦{val.toLocaleString()}</Tag>
            )
        }
    ];

    return (
        <div className="finance-ledger-container">
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: 'calc(1.2rem + 1vw)', margin: '0 0 4px 0' }}>Accounts & Tuition Ledger</h1>
                    <p style={{ color: '#637381', margin: 0, fontSize: '13px' }}>Monitor term invoices, process card/cash receipts, and track structural carry-forwards.</p>
                </div>
                <Space size="middle">
                    <Button icon={<FileTextOutlined />} size="large" onClick={() => setInvoiceModalOpen(true)}>
                        Charge Non-Fee Item
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setPaymentModalOpen(true)}>
                        Record Fee Payment
                    </Button>
                </Space>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <Statistic title="Total Projected Revenue" value={totalProjectedRevenue} prefix="₦" valueStyle={{ color: '#1890ff', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <Statistic title="Total Cash Collected" value={totalCashCollected} prefix="₦" valueStyle={{ color: '#00b074', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <Statistic title="Outstanding Receivables" value={outstandingReceivables} prefix="₦" valueStyle={{ color: '#ff4d4f', fontWeight: 700 }} />
                    </Card>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={ledger}
                rowKey="accountId"
                loading={loading}
                className="premium-table"
                scroll={{ x: 'max-content' }}
            />

            <Modal title="Post Inbound Payment Receipt" open={paymentModalOpen} onCancel={() => setPaymentModalOpen(false)} onOk={() => form.submit()} confirmLoading={loading} destroyOnClose>
                <Form form={form} layout="vertical" onFinish={handlePostPayment} style={{ paddingTop: '12px' }}>
                    <Form.Item name="accountId" label="Select Target Athlete Account" rules={[{ required: true, message: 'Please select an athlete account' }]}>
                        <Select placeholder="Choose player ledger profile">
                            {ledger.map(item => (
                                <Option key={item.accountId} value={item.accountId}>
                                    {item.playerName} ({item.category})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="amountPaid" label="Payment Remittance Amount (₦)" rules={[{ required: true, message: 'Please input an amount' }]}>
                        <InputNumber formatter={value => `₦ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} style={{ width: '100%' }} min={1000} />
                    </Form.Item>
                    <Form.Item name="paymentMethod" label="Payment Mode" rules={[{ required: true, message: 'Please select a payment mode' }]}>
                        <Select placeholder="Select method">
                            <Option value="BANK_TRANSFER">Direct Electronic Bank Transfer</Option>
                            <Option value="CASH">Cash Over Counter</Option>
                            <Option value="CARD">POS Terminal / Card Receipt</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="referenceNumber" label="Transaction Reference Number (Optional)">
                        <Input placeholder="e.g. Bank reference ID or receipt code" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="Generate Miscellaneous Non-Fee Charge" open={invoiceModalOpen} onCancel={() => setInvoiceModalOpen(false)} onOk={() => invoiceForm.submit()} confirmLoading={loading} destroyOnClose>
                <Form form={invoiceForm} layout="vertical" onFinish={handlePostInvoice} style={{ paddingTop: '12px' }}>
                    <Form.Item name="accountId" label="Select Athlete Target Account" rules={[{ required: true, message: 'Please select an athlete account' }]}>
                        <Select placeholder="Choose player account">
                            {ledger.map(item => (
                                <Option key={item.accountId} value={item.accountId}>
                                    {item.playerName} ({item.category})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="itemType" label="Charge Category" rules={[{ required: true, message: 'Please select a charge category' }]}>
                        <Select placeholder="Select item type">
                            <Option value="JERSEY">Official Matchday Jersey Kit</Option>
                            <Option value="REGISTRATION">New Registration Assessment Fee</Option>
                            <Option value="TOURNAMENT">League/Tournament Entry Pass</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label="Cost Price (₦)" rules={[{ required: true, message: 'Please enter the cost price' }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                    <Form.Item name="description" label="Invoice Item Specifications" rules={[{ required: true, message: 'Please describe the line item specifications' }]}>
                        <Input placeholder="e.g., Size XL Home Kit Print #10" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};