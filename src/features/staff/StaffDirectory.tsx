import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Card, Button, Input, Tag, Space, Typography, Avatar,
    Tabs, Popconfirm, message, Tooltip, Badge, Dropdown, Alert
} from 'antd';
import {
    PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined,
    EyeOutlined, UserOutlined, TeamOutlined, TrophyOutlined,
    SafetyCertificateOutlined, CheckCircleOutlined, StopOutlined,
    MoreOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import { hasAnyRole } from '../../utils/authRoles';
import { StaffFormDrawer } from './StaffFormDrawer';
import { StaffDetailsModal } from './StaffDetailsModal';
import './StaffDirectory.scss';

const { Title, Text } = Typography;

export interface StaffMember {
    id: number;
    username: string;
    role: 'COACH' | 'DIRECTOR' | 'ADMIN';
    roles: string[];
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employeeId: string;
    specialization: string | null;
    licenseLevel: string | null;
    enabled: boolean;
    requirePasswordChange: boolean;
}

interface StaffDirectoryProps {
    openCreateOnLoad?: boolean;
}

export const StaffDirectory: React.FC<StaffDirectoryProps> = ({ openCreateOnLoad = false }) => {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('all');

    const isAdmin = useMemo(() => {
        const userRaw = localStorage.getItem('pfa_user');
        if (!userRaw) return false;
        try {
            const user = JSON.parse(userRaw);
            return hasAnyRole(user?.roles, ['ROLE_ADMIN', 'ADMIN']);
        } catch {
            return false;
        }
    }, []);

    // Drawer and Modal State
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(openCreateOnLoad);
    const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffMember | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
    const [selectedStaffForDetails, setSelectedStaffForDetails] = useState<StaffMember | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchStaff();
        }
    }, [isAdmin]);

    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchStaff = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await apiClient.get('/admin/staff');
            const data = res.data?.body || res.data || [];
            setStaffList(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Staff fetch error:', err);
            if (err?.response?.status === 404) {
                setFetchError(
                    'Backend endpoint /api/v1/admin/staff returned 404 Not Found. If running via Docker, please rebuild the container by executing `docker compose up -d --build node-app` in the pfa-service-manager directory.'
                );
                // Graceful fallback to load available coaches
                try {
                    const fallbackRes = await apiClient.get('/trainings/coaches');
                    const coachesData = fallbackRes.data?.body || fallbackRes.data || [];
                    if (Array.isArray(coachesData) && coachesData.length > 0) {
                        const mappedCoaches: StaffMember[] = coachesData.map((c: any) => ({
                            id: c.id,
                            username: `coach_${c.id}`,
                            role: 'COACH',
                            roles: ['ROLE_COACH'],
                            firstName: c.firstName,
                            lastName: c.lastName,
                            email: '',
                            phone: '',
                            employeeId: c.employeeId || `COA-${c.id}`,
                            specialization: null,
                            licenseLevel: null,
                            enabled: true,
                            requirePasswordChange: false
                        }));
                        setStaffList(mappedCoaches);
                    }
                } catch {
                    // ignore fallback error
                }
            } else if (err?.response?.status === 403) {
                setFetchError('Access denied: Administrator privileges required to view the staff directory.');
                message.error('Access forbidden: Administrator privileges required.');
            } else {
                setFetchError(err?.response?.data?.message || err?.message || 'Failed to load academy staff directory.');
                message.error('Failed to load academy staff directory.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (staff: StaffMember) => {
        try {
            const res = await apiClient.patch(`/admin/staff/${staff.id}/status`, {
                enabled: !staff.enabled
            });
            const newStatus = res.data?.body?.enabled !== undefined ? res.data.body.enabled : !staff.enabled;
            setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, enabled: newStatus } : s));
            message.success(`Staff account for ${staff.firstName} ${staff.lastName} ${newStatus ? 'activated' : 'deactivated'}.`);
        } catch {
            message.error('Failed to update staff account status.');
        }
    };

    const handleOpenEdit = (staff: StaffMember) => {
        setSelectedStaffForEdit(staff);
        setIsDrawerOpen(true);
    };

    const handleOpenCreate = () => {
        setSelectedStaffForEdit(null);
        setIsDrawerOpen(true);
    };

    const handleOpenDetails = (staff: StaffMember) => {
        setSelectedStaffForDetails(staff);
        setIsDetailsModalOpen(true);
    };

    // Live Stat Counters
    const stats = useMemo(() => {
        const total = staffList.length;
        const coaches = staffList.filter(s => s.role === 'COACH').length;
        const directors = staffList.filter(s => s.role === 'DIRECTOR').length;
        const admins = staffList.filter(s => s.role === 'ADMIN').length;
        const active = staffList.filter(s => s.enabled).length;
        return { total, coaches, directors, admins, active };
    }, [staffList]);

    // Filtering logic
    const filteredStaff = useMemo(() => {
        return staffList.filter(staff => {
            const matchesQuery = `${staff.firstName} ${staff.lastName} ${staff.username} ${staff.email} ${staff.employeeId} ${staff.specialization || ''}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            if (!matchesQuery) return false;

            if (activeTab === 'COACH') return staff.role === 'COACH';
            if (activeTab === 'DIRECTOR') return staff.role === 'DIRECTOR';
            if (activeTab === 'ADMIN') return staff.role === 'ADMIN';
            if (activeTab === 'INACTIVE') return !staff.enabled;
            return true; // 'all'
        });
    }, [staffList, searchQuery, activeTab]);

    const columns: ColumnsType<StaffMember> = [
        {
            title: 'Staff Member',
            key: 'member',
            render: (_, record) => {
                const roleColor = record.role === 'DIRECTOR' ? '#d97706' : record.role === 'COACH' ? '#2563eb' : '#7c3aed';
                return (
                    <div className="staff-name-cell">
                        <Avatar
                            style={{ backgroundColor: roleColor, fontWeight: 600 }}
                            size={40}
                        >
                            {record.firstName?.[0]}{record.lastName?.[0]}
                        </Avatar>
                        <div className="staff-info">
                            <span className="staff-fullname">{record.firstName} {record.lastName}</span>
                            <span className="staff-username">@{record.username}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Role & ID',
            key: 'role',
            render: (_, record) => {
                const roleBadge = record.role === 'DIRECTOR' ? (
                    <Tag color="gold" style={{ fontWeight: 600 }}>DIRECTOR</Tag>
                ) : record.role === 'COACH' ? (
                    <Tag color="blue" style={{ fontWeight: 600 }}>COACH</Tag>
                ) : (
                    <Tag color="purple" style={{ fontWeight: 600 }}>ADMIN</Tag>
                );

                return (
                    <Space direction="vertical" size={2}>
                        {roleBadge}
                        <Text style={{ fontSize: 11.5, color: '#6b7280', fontFamily: 'monospace' }}>
                            {record.employeeId}
                        </Text>
                    </Space>
                );
            }
        },
        {
            title: 'Contact Details',
            key: 'contact',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text style={{ fontSize: 13 }}>{record.email || '—'}</Text>
                    {record.phone && (
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Text>
                    )}
                </Space>
            )
        },
        {
            title: 'Credentials & Specialization',
            key: 'specialization',
            render: (_, record) => {
                if (record.role === 'COACH') {
                    return (
                        <Space direction="vertical" size={2}>
                            <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                                {record.specialization || 'Technical Staff'}
                            </Tag>
                            {record.licenseLevel && (
                                <Text style={{ fontSize: 11, color: '#b45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrophyOutlined /> {record.licenseLevel}
                                </Text>
                            )}
                        </Space>
                    );
                }
                return (
                    <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>
                        {record.role === 'DIRECTOR' ? 'Executive Management' : 'System Administration'}
                    </Text>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'enabled',
            key: 'status',
            render: (enabled: boolean) => (
                enabled ? (
                    <Badge status="success" text={<span style={{ color: '#059669', fontWeight: 500 }}>Active</span>} />
                ) : (
                    <Badge status="error" text={<span style={{ color: '#dc2626', fontWeight: 500 }}>Deactivated</span>} />
                )
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title="View Profile">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenDetails(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Profile">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={`${record.enabled ? 'Deactivate' : 'Activate'} staff member?`}
                        description={`Are you sure you want to ${record.enabled ? 'deactivate' : 'activate'} login access for ${record.firstName} ${record.lastName}?`}
                        onConfirm={() => handleToggleStatus(record)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title={record.enabled ? 'Deactivate Account' : 'Activate Account'}>
                            <Button
                                type="text"
                                danger={record.enabled}
                                style={{ color: !record.enabled ? '#16a34a' : undefined }}
                                icon={record.enabled ? <StopOutlined /> : <CheckCircleOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    if (!isAdmin) {
        return (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <Card style={{ maxWidth: 520, margin: '0 auto', padding: '24px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Title level={3} style={{ color: '#dc2626', marginBottom: 8 }}>Access Restricted</Title>
                    <Text type="secondary">
                        The Academy Staff Management module is reserved exclusively for Administrator users.
                    </Text>
                </Card>
            </div>
        );
    }

    return (
        <div className="staff-directory-root">
            <div className="page-header">
                <div className="page-title-group">
                    <Title level={2}>Academy Staff Management</Title>
                    <Text className="page-subtitle">Provision, inspect, and manage credentials for academy directors, coaches, and administrators.</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleOpenCreate}
                >
                    Register Staff Member
                </Button>
            </div>

            {/* Stat Cards Grid */}
            <div className="stat-cards-grid">
                <div className="stat-card stat-total">
                    <div className="stat-info">
                        <div className="stat-label">Total Staff</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                    <TeamOutlined className="stat-icon" />
                </div>
                <div className="stat-card stat-coaches">
                    <div className="stat-info">
                        <div className="stat-label">Coaches</div>
                        <div className="stat-value">{stats.coaches}</div>
                    </div>
                    <TrophyOutlined className="stat-icon" />
                </div>
                <div className="stat-card stat-directors">
                    <div className="stat-info">
                        <div className="stat-label">Directors</div>
                        <div className="stat-value">{stats.directors}</div>
                    </div>
                    <SafetyCertificateOutlined className="stat-icon" />
                </div>
                <div className="stat-card stat-admins">
                    <div className="stat-info">
                        <div className="stat-label">Administrators</div>
                        <div className="stat-value">{stats.admins}</div>
                    </div>
                    <UserOutlined className="stat-icon" />
                </div>
                <div className="stat-card stat-active">
                    <div className="stat-info">
                        <div className="stat-label">Active Access</div>
                        <div className="stat-value">{stats.active}</div>
                    </div>
                    <CheckCircleOutlined className="stat-icon" />
                </div>
            </div>

            {fetchError && (
                <Alert
                    message="Backend Service Sync Required"
                    description={
                        <Space direction="vertical" size={6}>
                            <Text>{fetchError}</Text>
                            <div style={{ marginTop: 4 }}>
                                <Text code style={{ fontSize: 13, padding: '4px 8px', background: '#f3f4f6', borderRadius: 4 }}>
                                    docker compose up -d --build node-app
                                </Text>
                            </div>
                        </Space>
                    }
                    type="warning"
                    showIcon
                    closable
                    onClose={() => setFetchError(null)}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Main Content Card */}
            <Card className="main-content-card">
                <div className="toolbar-row">
                    <Tabs
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key)}
                        style={{ marginBottom: 0 }}
                        items={[
                            { key: 'all', label: `All Staff (${stats.total})` },
                            { key: 'COACH', label: `Coaches (${stats.coaches})` },
                            { key: 'DIRECTOR', label: `Directors (${stats.directors})` },
                            { key: 'ADMIN', label: `Admins (${stats.admins})` },
                            { key: 'INACTIVE', label: `Deactivated (${stats.total - stats.active})` }
                        ]}
                    />

                    <Space>
                        <Input
                            placeholder="Search by name, email, employee ID..."
                            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            allowClear
                            className="search-input"
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchStaff}
                            loading={loading}
                        />
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredStaff}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>

            {/* Drawer for Registering & Editing Staff */}
            <StaffFormDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSuccess={fetchStaff}
                initialData={selectedStaffForEdit}
            />

            {/* Modal for Viewing Full Staff Profile */}
            <StaffDetailsModal
                open={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                staff={selectedStaffForDetails}
                onEdit={handleOpenEdit}
            />
        </div>
    );
};
