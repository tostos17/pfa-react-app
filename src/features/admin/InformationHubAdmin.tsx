import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Select, Button, Space, Typography, message, Modal, Form, Input, InputNumber, Row, Col, DatePicker, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, CheckCircleOutlined, StopOutlined, FilterOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

interface InformationHubResponse {
    id: number;
    title: string;
    summary: string;
    content: string;
    infoType: 'UPCOMING_MATCH' | 'RESUMPTION' | 'SUMMER_CAMP' | 'GENERAL_NOTICE';
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    coverImageUrl?: string;
    publishAt: string;
    expiresAt?: string;
    attributes: Record<string, any>;
    createdAt: string;
}

export const InformationHubAdmin: React.FC = () => {
    const [announcements, setAnnouncements] = useState<InformationHubResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<InformationHubResponse | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Filters
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    const [form] = Form.useForm();
    const currentInfoType = Form.useWatch('infoType', form);

    useEffect(() => {
        fetchAnnouncements();
    }, [filterType, filterStatus]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filterType) params.type = filterType;
            if (filterStatus) params.status = filterStatus;

            const res = await apiClient.get('/admin/information-hub', { params });
            if (res.data && res.data.body) {
                setAnnouncements(res.data.body.content || res.data.body);
            }
        } catch (err) {
            message.error("Failed to load announcements log.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAnnouncement = async (values: any) => {
        setSubmitting(true);
        try {
            // Reconstruct nested JSON payload metrics attributes safely from flat form values
            const attributes: Record<string, any> = {};
            if (values.infoType === 'UPCOMING_MATCH') {
                attributes.opponent = values.opponent;
                attributes.venue = values.venue;
                attributes.kickoffTime = values.kickoffTime.toISOString();
                attributes.streamLink = values.streamLink;
            } else if (values.infoType === 'RESUMPTION') {
                attributes.openingDate = values.openingDate.format('YYYY-MM-DD');
                attributes.targetTermId = values.targetTermId;
            } else if (values.infoType === 'SUMMER_CAMP') {
                attributes.registrationFee = values.registrationFee;
                attributes.deadlineDate = values.deadlineDate.format('YYYY-MM-DD');
                attributes.campDuration = values.campDuration;
            }

            const payload = {
                title: values.title,
                summary: values.summary,
                content: values.content,
                infoType: values.infoType,
                coverImageUrl: values.coverImageUrl,
                publishAt: values.publishAt.toISOString(),
                expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
                attributes
            };

            // Hardcoded fallback context ID or pulled dynamically via security context configurations
            await apiClient.post('/admin/information-hub?adminId=1', payload);
            message.success("Announcement created successfully as a DRAFT.");
            setIsCreateModalOpen(false);
            form.resetFields();
            fetchAnnouncements();
        } catch (err) {
            message.error("Failed to persist announcement parameters.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: number, status: 'PUBLISHED' | 'ARCHIVED' | 'DRAFT') => {
        try {
            await apiClient.patch(`/admin/information-hub/${id}/status?status=${status}`);
            message.success(`Announcement is now successfully ${status.toLowerCase()}.`);
            fetchAnnouncements();
            if (selectedAnnouncement?.id === id) {
                setIsPreviewModalOpen(false);
            }
        } catch (err) {
            message.error("Failed to update status state context mapping lifecycle.");
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        try {
            await apiClient.delete(`/admin/information-hub/${id}`);
            message.success("Record deleted cleanly from registry logs.");
            fetchAnnouncements();
        } catch (err) {
            message.error("Could not drop targeted resource row index.");
        }
    };

    const handleOpenPreview = (record: InformationHubResponse) => {
        setSelectedAnnouncement(record);
        setIsPreviewModalOpen(true);
    };

    const columns: ColumnsType<InformationHubResponse> = [
        { title: 'Ref ID', dataIndex: 'id', key: 'id', width: 80 },
        { title: 'Headline Title', dataIndex: 'title', key: 'title', width: 250, render: (text) => <Text strong>{text}</Text> },
        {
            title: 'Info Type',
            dataIndex: 'infoType',
            key: 'infoType',
            width: 160,
            render: (type) => {
                const configurations: Record<string, { color: string, name: string }> = {
                    UPCOMING_MATCH: { color: 'volcano', name: 'Upcoming Match' },
                    RESUMPTION: { color: 'purple', name: 'Resumption Notice' },
                    SUMMER_CAMP: { color: 'cyan', name: 'Summer Camp' },
                    GENERAL_NOTICE: { color: 'blue', name: 'General Announcement' }
                };
                return <Tag color={configurations[type]?.color}>{configurations[type]?.name}</Tag>;
            }
        },
        {
            title: 'Lifecycle Status',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status) => {
                const statusMap: Record<string, { status: "default" | "success" | "warning", text: string }> = {
                    DRAFT: { status: 'warning', text: 'Draft' },
                    PUBLISHED: { status: 'success', text: 'Live' },
                    ARCHIVED: { status: 'default', text: 'Archived' }
                };
                return <Badge status={statusMap[status]?.status} text={statusMap[status]?.text} />;
            }
        },
        {
            title: 'Schedule Launch Date',
            dataIndex: 'publishAt',
            key: 'publishAt',
            width: 180,
            render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm')
        },
        {
            title: 'Dashboard Controls',
            key: 'actions',
            align: 'center',
            width: 260,
            fixed: 'right' as const,
            render: (_, record) => (
                <Space size="middle">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenPreview(record)}>View / Push</Button>
                    {record.status === 'DRAFT' && (
                        <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />} onClick={() => handleUpdateStatus(record.id, 'PUBLISHED')}>Publish</Button>
                    )}
                    {record.status === 'PUBLISHED' && (
                        <Button size="small" danger ghost icon={<StopOutlined />} onClick={() => handleUpdateStatus(record.id, 'ARCHIVED')}>Take Down</Button>
                    )}
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAnnouncement(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>Information Hub & Public Content Stream</Title>
                    <Text type="secondary">Manage dynamic structured news items matching widgets consumed by the public landing website interface.</Text>
                </Col>
                <Col xs={24} sm={6} style={{ textAlign: 'right', marginTop: '12px' }}>
                    <Button type="primary" size="large" icon={<PlusOutlined />} block onClick={() => setIsCreateModalOpen(true)}>
                        Compose Announcement
                    </Button>
                </Col>
            </Row>

            {/* Filter Panel */}
            <Card style={{ marginBottom: '24px' }} bodyStyle={{ padding: '16px' }}>
                <Space wrap>
                    <FilterOutlined style={{ color: '#bfbfbf' }} />
                    <Select placeholder="Filter Variant Type" value={filterType} onChange={setFilterType} style={{ width: 180 }} allowClear>
                        <Option value="UPCOMING_MATCH">Upcoming Match</Option>
                        <Option value="RESUMPTION">Resumption Notice</Option>
                        <Option value="SUMMER_CAMP">Summer Camp</Option>
                        <Option value="GENERAL_NOTICE">General Notice</Option>
                    </Select>
                    <Select placeholder="Filter Flow Status" value={filterStatus} onChange={setFilterStatus} style={{ width: 150 }} allowClear>
                        <Option value="DRAFT">Draft</Option>
                        <Option value="PUBLISHED">Published / Live</Option>
                        <Option value="ARCHIVED">Archived</Option>
                    </Select>
                </Space>
            </Card>

            {/* Main Data View Table */}
            <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Table
                    columns={columns}
                    dataSource={announcements}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* COMPOSER WIZARD MODAL */}
            <Modal title="Compose Hub Announcement Master Item" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)} footer={null} width={720} destroyOnClose>
                <Form form={form} layout="vertical" onFinish={handleCreateAnnouncement} initialValues={{ infoType: 'GENERAL_NOTICE', publishAt: dayjs() }}>
                    <Row gutter={16}>
                        <Col xs={24} md={16}>
                            <Form.Item name="title" label="Announcement Headline / Title" rules={[{ required: true, message: 'Headline mandatory' }]}>
                                <Input placeholder="e.g., Academy Campus Resume Date Operations" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="infoType" label="Information Architecture Blueprint Block" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="GENERAL_NOTICE">General Announcement</Option>
                                    <Option value="UPCOMING_MATCH">Upcoming Exhibition Match</Option>
                                    <Option value="RESUMPTION">Resumption Notice</Option>
                                    <Option value="SUMMER_CAMP">Summer Camp Portal</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="summary" label="Brief Subtitle Summary Catchphrase">
                        <Input placeholder="Short introductory visual teaser string text for catalog feeds..." />
                    </Form.Item>

                    <Form.Item name="content" label="Full Statement Core Content Markdown Body" rules={[{ required: true, message: 'Core message block context is empty' }]}>
                        <Input.TextArea rows={5} placeholder="Provide descriptive specifications detail content layout logs context..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}><Form.Item name="publishAt" label="Automatic Live Release Schedule Date" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="expiresAt" label="Automatic Pull Down / Expiry Time Boundary"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>

                    <Form.Item name="coverImageUrl" label="Promotional Cover Banner Image Web Asset Link (URL)">
                        <Input placeholder="e.g., Cloudinary Content Bucket CDN asset object pathway..." />
                    </Form.Item>

                    {/* DYNAMIC SUB-SCHEMAS EXTENSION LAYOUT BLOCK VIA JSON WATCH CHECKS */}
                    {currentInfoType === 'UPCOMING_MATCH' && (
                        <Card title={<Space><InfoCircleOutlined /> <Text type="secondary">Match Card Component Attributes Sub-payload Context Specs</Text></Space>} size="small" style={{ marginBottom: '24px', background: '#fff2e8' }}>
                            <Row gutter={16}>
                                <Col span={12}><Form.Item name="opponent" label="Opponent Club Name" rules={[{ required: true }]}><Input placeholder="e.g. Chelsea Academy U15" /></Form.Item></Col>
                                <Col span={12}><Form.Item name="venue" label="Stadium Arena Venue Ground" rules={[{ required: true }]}><Input placeholder="e.g. Agege Stadium Main Complex" /></Form.Item></Col>
                                <Col span={12}><Form.Item name="kickoffTime" label="Kick-off Clock Time" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                                <Col span={12}><Form.Item name="streamLink" label="Live Stream Transmission Hyperlink (YouTube)"><Input placeholder="https://..." /></Form.Item></Col>
                            </Row>
                        </Card>
                    )}

                    {currentInfoType === 'RESUMPTION' && (
                        <Card title={<Space><InfoCircleOutlined /> <Text type="secondary">Resumption Notice Attributes Payload Context Specs</Text></Space>} size="small" style={{ marginBottom: '24px', background: '#f9f0ff' }}>
                            <Row gutter={16}>
                                <Col span={12}><Form.Item name="openingDate" label="Gates Open / Verification Resumption Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                                <Col span={12}><Form.Item name="targetTermId" label="Linked Registration Billing Calendar Operating Term ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} placeholder="e.g. 5" /></Form.Item></Col>
                            </Row>
                        </Card>
                    )}

                    {currentInfoType === 'SUMMER_CAMP' && (
                        <Card title={<Space><InfoCircleOutlined /> <Text type="secondary">Summer Camp Widget Structural Configuration Metrics Attributes</Text></Space>} size="small" style={{ marginBottom: '24px', background: '#e6fffb' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="registrationFee" label="Participation Registration Entrance Pass Cost (₦)" rules={[{ required: true }]}>
                                        <InputNumber
                                            min={0}
                                            style={{ width: '100%' }}
                                            formatter={val => `₦ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            /* FIXED: Added 'as any' casting override */
                                            parser={val => (val ? val.replace(/₦\s?|(,*)/g, '') : '') as any}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}><Form.Item name="deadlineDate" label="Form Purchase Allocation Closure Date Deadline" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                                <Col span={24}><Form.Item name="campDuration" label="Camp Core Operating Calendar Horizon Span Timeline Window Description" rules={[{ required: true }]}><Input placeholder="e.g., 3 Weeks (August 10th - August 31st)" /></Form.Item></Col>
                            </Row>
                        </Card>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Space>
                            <Button onClick={() => setIsCreateModalOpen(false)}>Discard</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>Commit to Draft Base Queue</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* PREVIEW AND STATE MANIPULATION DRAWER-MODAL */}
            <Modal title="Announcement Publication Review Board Summary Panel" open={isPreviewModalOpen} onCancel={() => setIsPreviewModalOpen(false)} width={600} footer={[
                <Button key="close" onClick={() => setIsPreviewModalOpen(false)}>Close Review Panel</Button>
            ]}>
                {selectedAnnouncement && (
                    <div>
                        <div style={{ marginBottom: '20px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
                            <Space style={{ marginBottom: '8px' }}>
                                <Tag color="blue">{selectedAnnouncement.infoType}</Tag>
                                <Badge status={selectedAnnouncement.status === 'PUBLISHED' ? 'success' : 'warning'} text={selectedAnnouncement.status} />
                            </Space>
                            <Title level={4}>{selectedAnnouncement.title}</Title>
                            {selectedAnnouncement.summary && <Text type="secondary" italic style={{ display: 'block', marginBottom: '8px' }}>"{selectedAnnouncement.summary}"</Text>}
                        </div>

                        <div style={{ margin: '16px 0', background: '#fafafa', padding: '16px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                            <Text strong style={{ display: 'block', marginBottom: '4px' }}>Core Narrative Body Context Statement:</Text>
                            {selectedAnnouncement.content}
                        </div>

                        {/* Rendering Context Specific Nested JSON Metadata Blocks */}
                        {Object.keys(selectedAnnouncement.attributes || {}).length > 0 && (
                            <Card size="small" title="Structured UI Layout Variable Attributes Object Payload Dictionary" style={{ marginBottom: '24px', background: '#f5f5f5' }}>
                                {Object.entries(selectedAnnouncement.attributes).map(([key, val]) => (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <Text strong type="secondary">{key}:</Text>
                                        <Text>{typeof val === 'number' && key.toLowerCase().includes('fee') ? `₦${val.toLocaleString()}` : String(val)}</Text>
                                    </div>
                                ))}
                            </Card>
                        )}

                        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignContent: 'center' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>Scheduled: {dayjs(selectedAnnouncement.publishAt).format('YYYY-MM-DD HH:mm')}</Text>
                            <Space>
                                {selectedAnnouncement.status !== 'PUBLISHED' && (
                                    <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleUpdateStatus(selectedAnnouncement.id, 'PUBLISHED')}>Go Live Now</Button>
                                )}
                                {selectedAnnouncement.status === 'PUBLISHED' && (
                                    <Button danger size="small" icon={<StopOutlined />} onClick={() => handleUpdateStatus(selectedAnnouncement.id, 'ARCHIVED')}>Revoke Access</Button>
                                )}
                            </Space>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};