import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Statistic, Tag, Input, Button, Modal, Form, Select, InputNumber, Space, Typography, message, Checkbox, Spin, Tabs, DatePicker } from 'antd';
import { FileTextOutlined, PlusOutlined, SolutionOutlined, AuditOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
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

interface UnpaidInvoice {
    invoiceId: number | string;
    amountDue: number;
    status: string;
    description?: string;
}

interface PaymentAllocationResponseDto {
    id: number;
    paymentId: number;
    invoiceId: number;
    amountAllocated: number;
    invoiceCategory: string;
    invoiceDescription: string;
}

interface ExpenseResponse {
    id: number;
    title: string;
    description: string;
    amount: number;
    category: string;
    expenseDate: string;
    status: string;
    receiptUrl: string;
    termId: number;
    termName: string;
    sessionName: string;
}

interface ExpenseAuditSummary {
    termId: number;
    termName: string;
    sessionName: string;
    totalInvoicedRevenue: number;
    totalApprovedExpenses: number;
    netProfitMargin: number;
    breakdownByCategory: Record<string, number>;
}

interface TermResponseDto {
    id: number;
    name: string;
    isCurrentActive: boolean;
}

interface SessionResponseDto {
    id: number;
    name: string;
    isActive: boolean;
    terms: TermResponseDto[];
}

export const FinanceLedger: React.FC = () => {
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchingInvoices, setFetchingInvoices] = useState<boolean>(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
    const [selectedAccount, setSelectedAccount] = useState<LedgerEntry | null>(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
    const [selectedInvoices, setSelectedInvoices] = useState<Record<string | number, boolean>>({});
    const [allocatedAmounts, setAllocatedAmounts] = useState<Record<string | number, number>>({});
    const [paymentReference, setPaymentReference] = useState<string>('');
    const [allocationsModalOpen, setAllocationsModalOpen] = useState<boolean>(false);
    const [allocations, setAllocations] = useState<PaymentAllocationResponseDto[]>([]);
    const [loadingAllocations, setLoadingAllocations] = useState<boolean>(false);

    const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
    const [loadingExpenses, setLoadingExpenses] = useState<boolean>(false);
    const [sessions, setSessions] = useState<SessionResponseDto[]>([]);
    const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
    const [submittingExpense, setSubmittingExpense] = useState<boolean>(false);

    const [auditSummary, setAuditSummary] = useState<ExpenseAuditSummary | null>(null);
    const [, setLoadingAudit] = useState<boolean>(false);

    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');

    const [form] = Form.useForm();

    useEffect(() => {
        fetchLedgerData();
        fetchExpenseLedger();
        fetchCalendarContexts();
    }, [filterStatus, filterCategory]);

    const fetchLedgerData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/v1/finance/ledger/summary');
            if (res.data && res.data.body) {
                setLedger(res.data.body);
            }
        } catch (err) {
            message.error("Failed to load central student financial ledger.");
        } finally {
            setLoading(false);
        }
    };

    const fetchExpenseLedger = async () => {
        setLoadingExpenses(true);
        try {
            const params: Record<string, string> = {};
            if (filterStatus) params.status = filterStatus;
            if (filterCategory) params.category = filterCategory;

            const res = await apiClient.get('/api/v1/finance/expenses', { params });
            if (res.data && res.data.body) {
                setExpenses(res.data.body);
            }
        } catch (err) {
            message.error("Could not fetch academy expense records.");
        } finally {
            setLoadingExpenses(false);
        }
    };

    const fetchCalendarContexts = async () => {
        try {
            const res = await apiClient.get('/api/v1/admin/calendar/sessions/lastfive');
            if (res.data && res.data.body) {
                setSessions(res.data.body);
            }
        } catch (err) {
            console.error("Failed to load academic calendars for configurations.");
        }
    };

    const handleRunFinancialAudit = async (termId: number) => {
        setLoadingAudit(true);
        try {
            const res = await apiClient.get(`/api/v1/finance/expenses/audit/terms/${termId}`);
            if (res.data && res.data.body) {
                setAuditSummary(res.data.body);
                message.success(`Financial audit summary calculated for ${res.data.body.termName} Term.`);
            }
        } catch (err) {
            message.error("Failed to run term profit & margin audit metrics.");
        } finally {
            setLoadingAudit(false);
        }
    };

    const handleRecordExpenseSubmit = async (values: any) => {
        setSubmittingExpense(true);
        try {
            const payload = {
                title: values.title,
                description: values.description,
                amount: values.amount,
                category: values.category,
                expenseDate: values.expenseDate.format('YYYY-MM-DD'),
                receiptUrl: values.receiptUrl,
                termId: values.termId
            };
            await apiClient.post('/api/v1/finance/expenses', payload);
            message.success("Expense registered and logged under approval queue workflow.");
            setExpenseModalOpen(false);
            form.resetFields();
            fetchExpenseLedger();
        } catch (err) {
            message.error("Failed to store expense parameters.");
        } finally {
            setSubmittingExpense(false);
        }
    };

    const handleEvaluateExpense = async (id: number, targetStatus: 'APPROVED' | 'REJECTED') => {
        try {
            await apiClient.patch(`/api/v1/finance/expenses/${id}/status?status=${targetStatus}`);
            message.success(`Expense successfully marked as ${targetStatus}.`);
            fetchExpenseLedger();
            if (auditSummary && auditSummary.termId) {
                handleRunFinancialAudit(auditSummary.termId);
            }
        } catch (err) {
            message.error("Failed to submit evaluation status modification change.");
        }
    };

    const openPaymentModal = async (record: LedgerEntry) => {
        setSelectedAccount(record);
        setPaymentModalOpen(true);
        setFetchingInvoices(true);
        try {
            const res = await apiClient.get(`/api/v1/finance/invoices/finance/accounts/${record.accountId}/unsettled-invoices`);
            if (res.data && res.data.body) {
                setUnpaidInvoices(res.data.body);
                const initialSelections: Record<string | number, boolean> = {};
                const initialAmounts: Record<string | number, number> = {};
                res.data.body.forEach((inv: UnpaidInvoice) => {
                    initialSelections[inv.invoiceId] = true;
                    initialAmounts[inv.invoiceId] = inv.amountDue;
                });
                setSelectedInvoices(initialSelections);
                setAllocatedAmounts(initialAmounts);
            }
        } catch (err) {
            message.error("Failed to pull matching outstanding invoices.");
        } finally {
            setFetchingInvoices(false);
        }
    };

    const handleCheckboxChange = (invoiceId: string | number, checked: boolean) => {
        setSelectedInvoices(prev => ({ ...prev, [invoiceId]: checked }));
    };

    const handleAmountChange = (invoiceId: string | number, value: number | null) => {
        if (value !== null) {
            setAllocatedAmounts(prev => ({ ...prev, [invoiceId]: value }));
        }
    };

    const handlePostAllocatedPayments = async () => {
        if (!selectedAccount) return;
        if (!paymentReference.trim()) {
            message.warning("A tracking payment reference string identifier is mandatory.");
            return;
        }

        const allocationsList = Object.keys(selectedInvoices)
            .filter(id => selectedInvoices[id])
            .map(id => ({
                invoiceId: Number(id),
                amountAllocated: allocatedAmounts[id] || 0
            }))
            .filter(alloc => alloc.amountAllocated > 0);

        if (allocationsList.length === 0) {
            message.warning("Select at least one active billing allocation row.");
            return;
        }

        try {
            const payload = {
                accountId: selectedAccount.accountId,
                referenceNumber: paymentReference,
                allocations: allocationsList
            };
            await apiClient.post('/api/v1/finance/payments/allocate', payload);
            message.success("Payment posted and applied successfully!");
            setPaymentModalOpen(false);
            setPaymentReference('');
            fetchLedgerData();
        } catch (err) {
            message.error("Failed to execute balance allocations.");
        }
    };

    const viewPaymentAllocations = async (record: LedgerEntry) => {
        setAllocationsModalOpen(true);
        setLoadingAllocations(true);
        try {
            const res = await apiClient.get(`/api/v1/finance/payments/allocations/account/${record.accountId}`);
            if (res.data && res.data.body) {
                setAllocations(res.data.body);
            }
        } catch (err) {
            message.error("Unable to resolve historical allocations.");
        } finally {
            setLoadingAllocations(false);
        }
    };

    const ledgerColumns: ColumnsType<LedgerEntry> = [
        { title: 'Acc #', dataIndex: 'accountId', key: 'accountId', width: 80 },
        { title: 'Player Athlete', dataIndex: 'playerName', key: 'playerName', width: 180, render: (text) => <Text strong>{text}</Text> },
        { title: 'Category Group', dataIndex: 'category', key: 'category', width: 130 },
        { title: 'Bf Balance', dataIndex: 'broughtForward', key: 'broughtForward', align: 'right', width: 120, render: (val) => `₦${val.toLocaleString()}` },
        { title: 'Tuition Fee', dataIndex: 'termTuition', key: 'termTuition', align: 'right', width: 120, render: (val) => `₦${val.toLocaleString()}` },
        { title: 'Other Charges', dataIndex: 'nonFeeCharges', key: 'nonFeeCharges', align: 'right', width: 120, render: (val) => `₦${val.toLocaleString()}` },
        { title: 'Total Paid', dataIndex: 'totalPaid', key: 'totalPaid', align: 'right', width: 120, render: (val) => <Text style={{ color: '#00b074' }}>₦{val.toLocaleString()}</Text> },
        { title: 'Outstanding Balance', dataIndex: 'outstanding', key: 'outstanding', align: 'right', width: 140, render: (val) => <Tag color={val > 0 ? 'red' : 'green'}>₦{val.toLocaleString()}</Tag> },
        {
            title: 'Control Terminal Operations',
            key: 'actions',
            align: 'center',
            width: 220,
            fixed: 'right' as const,
            render: (_, record) => (
                <Space>
                    <Button type="primary" size="small" onClick={() => openPaymentModal(record)}>Post Payment</Button>
                    <Button size="small" icon={<FileTextOutlined />} onClick={() => viewPaymentAllocations(record)}>History</Button>
                </Space>
            )
        }
    ];

    const expenseColumns: ColumnsType<ExpenseResponse> = [
        { title: 'Ref ID', dataIndex: 'id', key: 'id', width: 80 },
        {
            title: 'Expenditure Item', dataIndex: 'title', key: 'title', width: 220, render: (text, rec) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{rec.description || 'No specs given'}</Text>
                </Space>
            )
        },
        { title: 'Category', dataIndex: 'category', key: 'category', width: 150, render: (cat) => <Tag color="blue">{cat}</Tag> },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 130, render: (amt) => <Text strong style={{ color: '#ff4d4f' }}>₦{amt.toLocaleString()}</Text> },
        { title: 'Date Incurred', dataIndex: 'expenseDate', key: 'expenseDate', width: 120 },
        { title: 'Term Scope Context', dataIndex: 'termName', key: 'termName', width: 180, render: (t, rec) => `${t} (${rec.sessionName})` },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (status) => {
                let color = 'gold';
                if (status === 'APPROVED') color = 'green';
                if (status === 'REJECTED') color = 'red';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Audit Actions', key: 'actions', align: 'center', width: 220, fixed: 'right' as const, render: (_, record) => (
                <Space>
                    {record.status === 'PENDING' && (
                        <>
                            <Button type="primary" size="small" ghost onClick={() => handleEvaluateExpense(record.id, 'APPROVED')}>Approve</Button>
                            <Button type="primary" danger size="small" ghost onClick={() => handleEvaluateExpense(record.id, 'REJECTED')}>Reject</Button>
                        </>
                    )}
                    <Button size="small" icon={<AuditOutlined />} onClick={() => handleRunFinancialAudit(record.termId)}>Audit Term</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
            <Tabs defaultActiveKey="1" type="card">

                <Tabs.TabPane tab="Student Account Balances Ledger" key="1">
                    <Card title={<Title level={4} style={{ margin: 0 }}>Central Student Accounts Ledger Summary</Title>} bordered={false} style={{ marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <Table
                            columns={ledgerColumns}
                            dataSource={ledger}
                            rowKey="accountId"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                </Tabs.TabPane>

                <Tabs.TabPane tab="Academy Expenses & Margins Audit" key="2">
                    {auditSummary && (
                        <Card title={<Space><AuditOutlined style={{ color: '#1890ff' }} /> <Text strong>Term Financial Margin Audit Dashboard: {auditSummary.termName} ({auditSummary.sessionName})</Text></Space>} style={{ marginBottom: '24px', border: '1px solid #1890ff', background: '#f0f5ff' }}>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={8}>
                                    <Statistic title="Total Invoiced Gross Revenue" value={auditSummary.totalInvoicedRevenue} precision={2} prefix="₦" valueStyle={{ color: '#52c41a' }} />
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Statistic title="Total Approved Expenses Overhead" value={auditSummary.totalApprovedExpenses} precision={2} prefix="₦" valueStyle={{ color: '#ff4d4f' }} />
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Statistic title="Net Operating Margin (Profit/Loss)" value={auditSummary.netProfitMargin} precision={2} prefix="₦" valueStyle={{ color: auditSummary.netProfitMargin >= 0 ? '#237804' : '#a8071a', fontWeight: 'bold' }} />
                                </Col>
                            </Row>

                            {Object.keys(auditSummary.breakdownByCategory).length > 0 && (
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #d9d9d9' }}>
                                    <Text type="secondary" strong style={{ display: 'block', marginBottom: '8px' }}>Approved Costs Distribution Breakdown:</Text>
                                    <Space wrap>
                                        {Object.entries(auditSummary.breakdownByCategory).map(([cat, amt]: [string, number]) => (
                                            <Tag key={cat} color="volcano" style={{ padding: '4px 8px' }}>
                                                {cat}: <strong>₦{amt.toLocaleString()}</strong>
                                            </Tag>
                                        ))}
                                    </Space>
                                </div>
                            )}
                        </Card>
                    )}

                    <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '12px 24px' }}>
                        <Row justify="space-between" align="middle" gutter={[16, 16]}>
                            <Col xs={24} md={18}>
                                <Space wrap style={{ width: '100%' }}>
                                    <FilterOutlined style={{ color: '#8c8c8c' }} />
                                    <Select placeholder="Filter Status" value={filterStatus} onChange={setFilterStatus} style={{ width: 140 }} allowClear>
                                        <Option value="PENDING">Pending Approval</Option>
                                        <Option value="APPROVED">Approved</Option>
                                        <Option value="REJECTED">Rejected</Option>
                                    </Select>
                                    <Select placeholder="Filter Category" value={filterCategory} onChange={setFilterCategory} style={{ width: 160 }} allowClear>
                                        <Option value="EQUIPMENT">Equipment Purchases</Option>
                                        <Option value="FACILITY_MAINTENANCE">Facility & Grounds</Option>
                                        <Option value="LOGISTICS">Logistics & Events</Option>
                                        <Option value="SALARIES">Staff Salaries & Remunerations</Option>
                                    </Select>
                                </Space>
                            </Col>
                            <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setExpenseModalOpen(true)} block style={{ maxWidth: '200px' }}>
                                    Log New Expense
                                </Button>
                            </Col>
                        </Row>
                    </Card>

                    <Card title="Operational Expenditures Ledger" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <Table
                            columns={expenseColumns}
                            dataSource={expenses}
                            rowKey="id"
                            loading={loadingExpenses}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                </Tabs.TabPane>
            </Tabs>

            <Modal title="Log Academy Operational Expense" open={expenseModalOpen} onCancel={() => setExpenseModalOpen(false)} footer={null} destroyOnClose>
                <Form form={form} layout="vertical" onFinish={handleRecordExpenseSubmit}>
                    <Form.Item name="title" label="Expense Title / Voucher Header" rules={[{ required: true, message: 'Please input a voucher reference title' }]}>
                        <Input placeholder="e.g. Purchase of Training Base Footballs" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="amount" label="Overhead Cost Amount (₦)" rules={[{ required: true, message: 'Expense costs required' }]}>
                                <InputNumber min={0.01} style={{ width: '100%' }} placeholder="0.00" formatter={value => `₦ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => (value ? value.replace(/₦\s?|(,*)/g, '') : '') as any} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="category" label="Expenditure Stream Category" rules={[{ required: true }]}>
                                <Select placeholder="Select Stream Code">
                                    <Option value="EQUIPMENT">Equipment Purchases</Option>
                                    <Option value="FACILITY_MAINTENANCE">Facility & Grounds</Option>
                                    <Option value="LOGISTICS">Logistics & Events</Option>
                                    <Option value="SALARIES">Staff Salaries & Remunerations</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="expenseDate" label="Incurrence Date Stamp" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" defaultValue={dayjs()} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="termId" label="Target Academic Operating Term" rules={[{ required: true, message: 'Must bind to an auditing timeframe context' }]}>
                                <Select placeholder="Link to Term">
                                    {sessions.flatMap(s => s.terms.map(t => (
                                        <Option key={t.id} value={t.id}>{s.name} - {t.name} Term</Option>
                                    )))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="receiptUrl" label="Receipt Documentation Reference Attachment Link">
                        <Input placeholder="e.g., Cloudinary S3 File System Object Bucket Storage Identifier" />
                    </Form.Item>

                    <Form.Item name="description" label="Detailed Specifications Notes">
                        <Input.TextArea rows={3} placeholder="Provide descriptive context for the accounting review trail..." />
                    </Form.Item>

                    <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: '16px' }}>
                        <Space>
                            <Button onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={submittingExpense}>Record Expense Entry</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title={`Post Payments Allocation Statement — ${selectedAccount?.playerName || ''}`} open={paymentModalOpen} onCancel={() => setPaymentModalOpen(false)} footer={null} width={700} destroyOnClose>
                {fetchingInvoices ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}><Spin size="large" /></div>
                ) : (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <Text strong style={{ display: 'block', marginBottom: '6px' }}>Bank Transaction Reference Number / Code:</Text>
                            <Input placeholder="Enter reference ID (e.g. TXN-98231)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} prefix={<SolutionOutlined />} />
                        </div>
                        <Table dataSource={unpaidInvoices} rowKey="invoiceId" pagination={false} size="small" scroll={{ x: 'max-content' }} columns={[
                            { title: 'Select', dataIndex: 'invoiceId', width: 60, render: (id) => <Checkbox checked={!!selectedInvoices[id]} onChange={(e) => handleCheckboxChange(id, e.target.checked)} /> },
                            { title: 'Invoice Details', dataIndex: 'description', render: (text, row) => <Space direction="vertical" size={0}><Text strong>{row.status}</Text><Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text></Space> },
                            { title: 'Balance Due', dataIndex: 'amountDue', align: 'right', render: (val) => `₦${val.toLocaleString()}` },
                            { title: 'Payment Allocated Amount', dataIndex: 'invoiceId', align: 'right', render: (id) => <InputNumber min={0} disabled={!selectedInvoices[id]} value={allocatedAmounts[id]} onChange={(val) => handleAmountChange(id, val)} formatter={value => `₦ ${value}`.replace(/\B(?=(\d{3})+(?!\\d))/g, ',')} parser={(value) => (value ? value.replace(/₦\s?|(,*)/g, '') : '') as any} style={{ width: 140 }} /> }
                        ]} />
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Space><Button onClick={() => setPaymentModalOpen(false)}>Cancel</Button><Button type="primary" onClick={handlePostAllocatedPayments}>Post Balance Application</Button></Space>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal title="Payment Allocation History Ledgers" open={allocationsModalOpen} onCancel={() => setAllocationsModalOpen(false)} footer={[<Button key="close" onClick={() => setAllocationsModalOpen(false)}>Close Ledger</Button>]} width={750}>
                <Table dataSource={allocations} rowKey="id" loading={loadingAllocations} size="small" pagination={{ pageSize: 8 }} scroll={{ x: 'max-content' }} columns={[
                    { title: 'Allocation Key ID', dataIndex: 'id', render: (record) => <Space direction="vertical" size={0}><Text strong>Alloc #{record.id}</Text><Text type="secondary" style={{ fontSize: '11px' }}>Payment Reference: #{record.paymentId}</Text></Space> },
                    { title: 'Category', dataIndex: 'invoiceCategory', render: (category) => category ? <Tag color="blue">{category}</Tag> : '—' },
                    { title: 'Description', dataIndex: 'invoiceDescription', render: (desc) => <Text style={{ fontSize: '13px' }}>{desc || '—'}</Text> },
                    { title: 'Amount Allocated', dataIndex: 'amountAllocated', align: 'right', render: (val) => <Text style={{ color: '#00b074', fontWeight: 600 }}>₦{val.toLocaleString()}</Text> }
                ]} />
            </Modal>
        </div>
    );
};