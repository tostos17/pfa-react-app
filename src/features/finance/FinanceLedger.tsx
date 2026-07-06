import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Statistic, Tag, Input, Button, Modal, Form, Select, InputNumber, Space, Typography, message, Checkbox, Spin } from 'antd';
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

// 🌟 INVOICE MODEL INTERFACE MATCHING BACKEND DTO ARCHITECTURE
interface UnpaidInvoice {
    invoiceId: number | string;
    amountDue: number;
    status: string;
    description?: string;
}

// 🌟 NEW INTERFACE MATCHING PaymentAllocationResponseDto FROM BACKEND
interface PaymentAllocationResponseDto {
    id: number;
    paymentId: number;
    invoiceId: number;
    amountAllocated: number;
    invoiceCategory: string;
    invoiceDescription: string;
}

export const FinanceLedger: React.FC = () => {
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchingInvoices, setFetchingInvoices] = useState<boolean>(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false);

    // Track fetched unpaid invoices for the currently active modal scope
    const [availableInvoices, setAvailableInvoices] = useState<UnpaidInvoice[]>([]);

    const [form] = Form.useForm();
    const [invoiceForm] = Form.useForm();

    // Listen to changes on fields inside the Payment Form state instance
    const selectedAccountId = Form.useWatch('accountId', form);
    const selectedInvoiceIds = Form.useWatch('invoiceIds', form) || [];

    // Audit Trail State Hooks
    const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
    const [activeInvoiceId, setActiveInvoiceId] = useState<string | number | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentAllocationResponseDto[]>([]);
    const [fetchingHistory, setFetchingHistory] = useState<boolean>(false);

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
                    typeof item.accountId === 'string' &&
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
            setLedger([]);
        } finally {
            setLoading(false);
        }
    };

    // 🌟 ASYNC INVOICE FETCH DEPENDENCY TRIGGER
    useEffect(() => {
        const fetchPendingInvoices = async () => {
            if (!selectedAccountId) {
                setAvailableInvoices([]);
                form.setFieldValue('invoiceIds', []);
                return;
            }

            setFetchingInvoices(true);
            try {
                const response = await apiClient.get(`/finance/invoices/finance/accounts/${selectedAccountId}/unsettled-invoices`);
                if (response?.data?.success && Array.isArray(response.data.body)) {
                    setAvailableInvoices(response.data.body);
                } else {
                    setAvailableInvoices([]);
                }
            } catch (err) {
                console.error("Failed to pull account liabilities:", err);
                message.error("Could not load pending invoices for calculation.");
            } finally {
                setFetchingInvoices(false);
            }
        };

        fetchPendingInvoices();
    }, [selectedAccountId, form]);

    useEffect(() => { fetchLedgerMatrix(); }, []);

    // 🌟 UPDATED ASYNC FETCH AUDIT TRAIL DATA CONNECTOR CONSUMING THE NEW SETTLEMENTS ENDPOINT
    const handleViewPaymentHistory = async (invoiceId: string | number) => {
        setActiveInvoiceId(invoiceId);
        setHistoryModalOpen(true);
        setFetchingHistory(true);
        try {
            const response = await apiClient.get(`/admin/audit/invoices/${invoiceId}/settlements`);
            if (response?.data?.success && Array.isArray(response.data.body)) {
                setPaymentHistory(response.data.body);
            } else {
                setPaymentHistory([]);
            }
        } catch (err) {
            console.error("Failed to fetch payment history:", err);
            message.error("Could not load payment allocation log from server.");
        } finally {
            setFetchingHistory(false);
        }
    };

    // 🌟 DYNAMIC METRIC CALCULATIONS
    const totalProjectedRevenue = ledger.reduce((sum, item) =>
        sum + item.broughtForward + item.termTuition + item.nonFeeCharges, 0
    );
    const totalCashCollected = ledger.reduce((sum, item) => sum + item.totalPaid, 0);
    const outstandingReceivables = ledger.reduce((sum, item) => sum + item.outstanding, 0);

    // Fixed Type-Safe Dynamic UI Guard
    const collectiveSum = availableInvoices
        .filter(inv => {
            const selectedIds = Array.isArray(selectedInvoiceIds) ? selectedInvoiceIds : [];
            return selectedIds.map(String).includes(String(inv.invoiceId));
        })
        .reduce((sum, inv) => sum + inv.amountDue, 0);

    const handlePostPayment = async (values: any) => {
        const payload = {
            accountId: String(values.accountId),
            amountPaid: values.amountPaid,
            invoiceIds: values.invoiceIds
        };

        if (payload.amountPaid > collectiveSum) {
            message.error("Overpayment rejected. Remittance amount exceeds collective balance of selected invoices.");
            return;
        }

        try {
            setLoading(true);
            const response = await apiClient.post('/finance/payments', payload);

            if (!response || !response.data || typeof response.data !== 'object') {
                throw new Error("Invalid root API response received.");
            }

            if (response.data.success) {
                message.success(`Payment successfully logged! Ref: ${response.data.body?.referenceNumber || 'N/A'}`);
                setPaymentModalOpen(false);
                form.resetFields();
                setAvailableInvoices([]);
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
                    <p style={{ color: '#637381', margin: 0, fontSize: '13px' }}>Monitor term invoices, process dynamic invoice allocations, and track structural carry-forwards.</p>
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

            {/* PAYMENT RECORD MODAL */}
            <Modal
                title="Post Inbound Payment Receipt"
                open={paymentModalOpen}
                onCancel={() => {
                    setPaymentModalOpen(false);
                    form.resetFields();
                    setAvailableInvoices([]);
                }}
                onOk={() => form.submit()}
                confirmLoading={loading}
                destroyOnClose
            >
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

                    {/* DYNAMIC CHECKBOX SYSTEM MAPPING TARGET INVOICE SELECTIONS */}
                    {selectedAccountId && (
                        <Spin spinning={fetchingInvoices} tip="Loading player invoices...">
                            <Form.Item
                                name="invoiceIds"
                                label="Select Outstanding Invoices to Cover"
                                rules={[{ required: true, type: 'array', min: 1, message: 'At least one target invoice ID must be selected' }]}
                            >
                                <Checkbox.Group style={{ width: '100%' }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {availableInvoices.length === 0 ? (
                                            <Text type="secondary" italic>No open liabilities or outstanding statements found for this account.</Text>
                                        ) : (
                                            availableInvoices.map(invoice => (
                                                <Space key={invoice.invoiceId} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                    <Checkbox value={invoice.invoiceId}>
                                                        Invoice #{invoice.invoiceId} — <Text type="danger" style={{ fontWeight: 500 }}>₦{invoice.amountDue.toLocaleString()}</Text> {invoice.description ? `(${invoice.description})` : ''}
                                                    </Checkbox>
                                                    <Button 
                                                        type="link" 
                                                        size="small" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewPaymentHistory(invoice.invoiceId);
                                                        }}
                                                    >
                                                        View History
                                                    </Button>
                                                </Space>
                                            ))
                                        )}
                                    </Space>
                                </Checkbox.Group>
                            </Form.Item>
                        </Spin>
                    )}

                    {selectedInvoiceIds.length > 0 && (
                        <>
                            <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#f5f5f5', borderRadius: '4px' }}>
                                <Text>Total Selected Invoices Liability: <Text strong style={{ color: '#ff4d4f' }}>₦{collectiveSum.toLocaleString()}</Text></Text>
                            </div>

                            <Form.Item
                                name="amountPaid"
                                label="Payment Remittance Amount (₦)"
                                rules={[
                                    { required: true, message: 'Please input an amount' },
                                    {
                                        validator: (_, value) => {
                                            if (!value || value <= 0) {
                                                return Promise.reject(new Error('Amount paid must be greater than zero'));
                                            }
                                            if (value > collectiveSum) {
                                                return Promise.reject(new Error('Remittance amount exceeds the collective balance of selected invoices'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <InputNumber
                                    formatter={value => `₦ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={(value) => (value ? value.replace(/₦\s?|(,*)/g, '') : '') as any}
                                    style={{ width: '100%' }}
                                    min={0.01}
                                    step={0.01}
                                    placeholder="Enter allocated amount"
                                />
                            </Form.Item>
                        </>
                    )}
                </Form>
            </Modal>

            {/* GENERATE MISCELLANEOUS INVOICE MODAL */}
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

            {/* UPDATED INVOICE PAYMENT HISTORY AUDIT MODAL TO DISPLAY ALLOCATIONS */}
            <Modal
                title={`Settlement History — Invoice #${activeInvoiceId}`}
                open={historyModalOpen}
                onCancel={() => {
                    setHistoryModalOpen(false);
                    setPaymentHistory([]);
                    setActiveInvoiceId(null);
                }}
                footer={[
                    <Button key="close" type="primary" onClick={() => setHistoryModalOpen(false)}>
                        Close Audit Trail
                    </Button>
                ]}
                width={650}
                destroyOnClose
            >
                <Table
                    loading={fetchingHistory}
                    dataSource={paymentHistory}
                    rowKey="id"
                    size="middle"
                    pagination={false}
                    columns={[
                        {
                            title: 'Allocation ID / Payment ID',
                            key: 'ids',
                            render: (_, record) => (
                                <Space direction="vertical" size={0}>
                                    <Text strong>Alloc #{record.id}</Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>Payment Reference: #{record.paymentId}</Text>
                                </Space>
                            )
                        },
                        {
                            title: 'Category',
                            dataIndex: 'invoiceCategory',
                            key: 'invoiceCategory',
                            render: (category) => category ? <Tag color="blue">{category}</Tag> : '—'
                        },
                        {
                            title: 'Description',
                            dataIndex: 'invoiceDescription',
                            key: 'invoiceDescription',
                            render: (desc) => <Text style={{ fontSize: '13px' }}>{desc || '—'}</Text>
                        },
                        {
                            title: 'Amount Allocated',
                            dataIndex: 'amountAllocated',
                            key: 'amountAllocated',
                            align: 'right',
                            render: (val) => <Text style={{ color: '#00b074', fontWeight: 600 }}>₦{val.toLocaleString()}</Text>
                        }
                    ]}
                />
            </Modal>
        </div>
    );
};