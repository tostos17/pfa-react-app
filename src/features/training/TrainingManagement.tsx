import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Card, Tag, Select, Button, Space, Typography, message,
    Modal, Form, Input, Row, Col, DatePicker, TimePicker, Badge, Drawer,
    InputNumber, Divider, Radio, Checkbox, Tabs, Alert, Tooltip
} from 'antd';
import {
    PlusOutlined, CheckCircleOutlined, CalendarOutlined,
    TeamOutlined, EditOutlined, EyeOutlined, ClockCircleOutlined,
    UserOutlined, CheckOutlined, ExclamationCircleOutlined, StopOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import { hasAnyRole } from '../../utils/authRoles';
import dayjs from 'dayjs';
import './TrainingManagement.scss';

const { Text, Title } = Typography;

interface TrainingSessionDTO {
    id: number;
    theme: string;
    date: string;
    startTime: string;
    endTime: string;
    activities: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    isEnded?: boolean;
}

interface AttendeeRosterItem {
    id: number;
    firstName: string;
    lastName: string;
    playerId?: string;
    employeeId?: string;
    status?: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'INJURED';
    remarks?: string;
    hasRecordedAttendance?: boolean;
}

export const TrainingManagement: React.FC = () => {
    const [sessions, setSessions] = useState<TrainingSessionDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Modals & Drawers
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState<boolean>(false);
    const [markUnrecordedAsAbsent, setMarkUnrecordedAsAbsent] = useState<boolean>(true);
    const [selectedSession, setSelectedSession] = useState<TrainingSessionDTO | null>(null);

    // Attendance state
    const [playersRoster, setPlayersRoster] = useState<AttendeeRosterItem[]>([]);
    const [coachesRoster, setCoachesRoster] = useState<AttendeeRosterItem[]>([]);
    const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
    const [submittingAction, setSubmittingAction] = useState<boolean>(false);

    // Interactive filters & batch selection
    const [activeTab, setActiveTab] = useState<string>('pending');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
    const [batchStatus, setBatchStatus] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED' | 'INJURED'>('PRESENT');

    const [form] = Form.useForm();

    // Authenticated User & Roles
    const currentUser = useMemo(() => {
        try {
            const raw = localStorage.getItem('pfa_user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    const isAdminOrDirector = useMemo(() => {
        return hasAnyRole(currentUser?.roles, ['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ADMIN', 'DIRECTOR']);
    }, [currentUser]);

    // Session ended evaluation helper
    const checkIsSessionEnded = (session: TrainingSessionDTO | null): boolean => {
        if (!session) return false;
        if (session.isEnded !== undefined) return Boolean(session.isEnded);
        if (session.status === 'COMPLETED' || session.status === 'CANCELLED') return true;
        if (session.date && session.endTime) {
            try {
                const dateStr = session.date.substring(0, 10);
                const timeStr = session.endTime.length === 5 ? `${session.endTime}:00` : session.endTime;
                const endDateTime = new Date(`${dateStr}T${timeStr}`);
                if (!isNaN(endDateTime.getTime()) && endDateTime.getTime() <= Date.now()) {
                    return true;
                }
            } catch {
                // Ignore fallback
            }
        }
        return false;
    };

    const isSessionEnded = useMemo(() => {
        return checkIsSessionEnded(selectedSession);
    }, [selectedSession]);

    // Editing permission: Allowed before session ends, or anytime for Admin & Director
    const canUpdateAttendance = useMemo(() => {
        return !isSessionEnded || isAdminOrDirector;
    }, [isSessionEnded, isAdminOrDirector]);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/trainings');
            const data = res.data?.body || res.data || [];
            setSessions(data);
        } catch {
            message.error('Failed to load training sessions registry.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (values: any) => {
        const startTime = values.startTime;
        const endTime = values.endTime;
        const totalSessionMinutes = endTime.diff(startTime, 'minute');
        const totalActivitiesMinutes = (values.activitiesList || []).reduce((acc: number, curr: any) => {
            return acc + (Number(curr?.duration) || 0);
        }, 0);

        if (totalActivitiesMinutes > totalSessionMinutes) {
            form.setFields([
                {
                    name: 'activitiesList',
                    errors: [`Total activities time (${totalActivitiesMinutes} mins) cannot exceed session duration (${totalSessionMinutes} mins).`]
                }
            ]);
            return;
        }

        try {
            const serializedActivities = JSON.stringify(
                (values.activitiesList || []).map((act: any) => ({
                    description: act.description,
                    duration: Number(act.duration) || 0
                }))
            );

            const payload = {
                theme: values.theme,
                date: values.date.format('YYYY-MM-DD'),
                startTime: values.startTime.format('HH:mm:ss'),
                endTime: values.endTime.format('HH:mm:ss'),
                activities: serializedActivities
            };

            await apiClient.post('/trainings', payload);
            message.success('Training session scheduled successfully.');
            setIsCreateModalOpen(false);
            form.resetFields();
            fetchSessions();
        } catch {
            message.error('Failed to schedule training session.');
        }
    };

    const openAttendanceRoster = async (session: TrainingSessionDTO) => {
        setSelectedSession(session);
        setIsAttendanceOpen(true);
        setLoadingRoster(true);
        setSearchQuery('');
        setSelectedPlayerIds([]);

        try {
            const res = await apiClient.get(`/trainings/${session.id}`);
            const data = res.data?.body || res.data;
            const updatedSession = data?.session || session;
            setSelectedSession(updatedSession);

            const existingLines = updatedSession?.attendanceLines || [];

            // Active or previously recorded players
            const players = (data?.eligiblePlayers || []).filter((p: any) => {
                const hasExisting = existingLines.some((l: any) => l.attendeeType === 'PLAYER' && Number(l.player?.id) === Number(p.id));
                if (updatedSession.status === 'COMPLETED' || updatedSession.isEnded) {
                    return hasExisting || p.status === 'ACTIVE' || !p.status;
                }
                return p.status === 'ACTIVE' || !p.status;
            }).map((p: any) => {
                const existing = existingLines.find((l: any) => l.attendeeType === 'PLAYER' && Number(l.player?.id) === Number(p.id));
                return {
                    ...p,
                    status: existing ? existing.status : undefined,
                    remarks: existing ? existing.remarks || '' : '',
                    hasRecordedAttendance: Boolean(existing)
                };
            });

            // Coaches roster
            const coaches = (data?.eligibleCoaches || []).map((c: any) => {
                const existing = existingLines.find((l: any) => l.attendeeType === 'COACH' && Number(l.coach?.id) === Number(c.id));
                return {
                    ...c,
                    status: existing ? existing.status : undefined,
                    remarks: existing ? existing.remarks || '' : '',
                    hasRecordedAttendance: Boolean(existing)
                };
            });

            setPlayersRoster(players);
            setCoachesRoster(coaches);

            // Default tab: If session ended, show all. If active, show pending arrivals.
            if (checkIsSessionEnded(updatedSession)) {
                setActiveTab('all');
            } else {
                setActiveTab('pending');
            }
        } catch {
            message.error('Failed to fetch session attendance rosters.');
            setIsAttendanceOpen(false);
        } finally {
            setLoadingRoster(false);
        }
    };

    // Incremental arrival registration for one or multiple players
    const handleRegisterArrival = async (playerIds: number[], status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'INJURED' = 'PRESENT') => {
        if (!selectedSession || !canUpdateAttendance || playerIds.length === 0) return;

        setSubmittingAction(true);
        try {
            const records = playerIds.map(id => {
                const playerItem = playersRoster.find(p => p.id === id);
                return {
                    id,
                    attendeeType: 'PLAYER',
                    status,
                    remarks: playerItem?.remarks || ''
                };
            });

            const res = await apiClient.post(`/trainings/${selectedSession.id}/attendance`, { records });
            const responseData = res.data?.body || res.data;

            // Update local state without wiping other records
            setPlayersRoster(prev => prev.map(p => {
                if (playerIds.includes(p.id)) {
                    return {
                        ...p,
                        status,
                        hasRecordedAttendance: true
                    };
                }
                return p;
            }));

            // Remove registered players from selection
            setSelectedPlayerIds(prev => prev.filter(id => !playerIds.includes(id)));

            if (selectedSession.status === 'SCHEDULED' && responseData?.sessionStatus === 'IN_PROGRESS') {
                setSelectedSession(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
                fetchSessions();
            }

            const countText = playerIds.length === 1 ? 'Player arrival' : `${playerIds.length} player arrivals`;
            message.success(`${countText} registered successfully.`);
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || 'Failed to register player attendance.';
            message.error(errMsg);
        } finally {
            setSubmittingAction(false);
        }
    };

    // Individual roster status adjustment
    const handleStatusChange = (id: number, type: 'PLAYER' | 'COACH', status: any) => {
        if (!canUpdateAttendance) return;
        if (type === 'PLAYER') {
            setPlayersRoster(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        } else {
            setCoachesRoster(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        }
    };

    // Individual remarks adjustment
    const handleRemarksChange = (id: number, type: 'PLAYER' | 'COACH', remarks: string) => {
        if (!canUpdateAttendance) return;
        if (type === 'PLAYER') {
            setPlayersRoster(prev => prev.map(item => item.id === id ? { ...item, remarks } : item));
        } else {
            setCoachesRoster(prev => prev.map(item => item.id === id ? { ...item, remarks } : item));
        }
    };

    // Save individual attendee record (player or coach)
    const handleSaveAttendee = async (item: AttendeeRosterItem, type: 'PLAYER' | 'COACH') => {
        if (!selectedSession || !canUpdateAttendance) return;

        setSubmittingAction(true);
        try {
            const targetStatus = item.status || 'PRESENT';
            const records = [{
                id: item.id,
                attendeeType: type,
                status: targetStatus,
                remarks: item.remarks || ''
            }];

            await apiClient.post(`/trainings/${selectedSession.id}/attendance`, { records });

            if (type === 'PLAYER') {
                setPlayersRoster(prev => prev.map(p => p.id === item.id ? { ...p, status: targetStatus, hasRecordedAttendance: true } : p));
            } else {
                setCoachesRoster(prev => prev.map(c => c.id === item.id ? { ...c, status: targetStatus, hasRecordedAttendance: true } : c));
            }

            message.success(`Saved attendance record for ${item.firstName} ${item.lastName}.`);
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || 'Failed to save attendance record.';
            message.error(errMsg);
        } finally {
            setSubmittingAction(false);
        }
    };

    // Conclude / End training session
    const handleEndSession = async () => {
        if (!selectedSession) return;

        setSubmittingAction(true);
        try {
            await apiClient.post(`/trainings/${selectedSession.id}/end`, {
                markUnrecordedAsAbsent
            });

            message.success('Training session concluded successfully.');
            setIsEndSessionModalOpen(false);

            // Refresh session details to reflect COMPLETED state and updated rosters
            await openAttendanceRoster(selectedSession);
            fetchSessions();
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || 'Failed to conclude session.';
            message.error(errMsg);
        } finally {
            setSubmittingAction(false);
        }
    };

    // Multi-select toggle
    const toggleSelectPlayer = (id: number) => {
        if (!canUpdateAttendance) return;
        setSelectedPlayerIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Select/Deselect visible pending players
    const handleSelectAllPending = () => {
        if (!canUpdateAttendance) return;
        const pendingIds = playersRoster.filter(p => !p.hasRecordedAttendance).map(p => p.id);
        const allSelected = pendingIds.length > 0 && pendingIds.every(id => selectedPlayerIds.includes(id));
        if (allSelected) {
            setSelectedPlayerIds(prev => prev.filter(id => !pendingIds.includes(id)));
        } else {
            setSelectedPlayerIds(prev => Array.from(new Set([...prev, ...pendingIds])));
        }
    };

    // Real-time roster counters
    const rosterStats = useMemo(() => {
        const total = playersRoster.length;
        const present = playersRoster.filter(p => p.hasRecordedAttendance && p.status === 'PRESENT').length;
        const pending = playersRoster.filter(p => !p.hasRecordedAttendance).length;
        const other = playersRoster.filter(p => p.hasRecordedAttendance && p.status !== 'PRESENT').length;
        return { total, present, pending, other };
    }, [playersRoster]);

    // Filtered players according to active tab and search query
    const filteredPlayers = useMemo(() => {
        return playersRoster.filter(player => {
            const matchesQuery = `${player.firstName} ${player.lastName} ${player.playerId || ''}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            if (!matchesQuery) return false;

            if (activeTab === 'pending') return !player.hasRecordedAttendance;
            if (activeTab === 'present') return player.hasRecordedAttendance && player.status === 'PRESENT';
            if (activeTab === 'other') return player.hasRecordedAttendance && player.status !== 'PRESENT';
            return true; // 'all'
        });
    }, [playersRoster, activeTab, searchQuery]);

    // Sessions Table Columns
    const columns: ColumnsType<TrainingSessionDTO> = [
        {
            title: 'Training Context',
            key: 'theme',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong style={{ fontSize: '15px' }}>{record.theme}</Text>
                    <Space size="middle" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        <span><CalendarOutlined /> {record.date} ({record.startTime.substring(0, 5)} - {record.endTime.substring(0, 5)})</span>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Activities / Drills',
            dataIndex: 'activities',
            key: 'activities',
            render: (text) => {
                if (!text) return <Text type="secondary" style={{ fontStyle: 'italic' }}>No activities logged</Text>;
                try {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed)) {
                        return (
                            <Space direction="vertical" size={2}>
                                {parsed.map((act: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <Badge status="processing" style={{ fontSize: '6px' }} />
                                        <Text style={{ fontSize: '13px' }}>{act.description}</Text>
                                        <Tag color="cyan" style={{ fontSize: '11px', margin: 0 }}>{act.duration} mins</Tag>
                                    </div>
                                ))}
                            </Space>
                        );
                    }
                } catch {
                    // Fallback for plain text
                }
                return <Text>{text}</Text>;
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (_, record) => {
                const ended = checkIsSessionEnded(record);
                if (record.status === 'COMPLETED' || ended) {
                    return <Tag color="green" icon={<CheckCircleOutlined />}>COMPLETED</Tag>;
                }
                if (record.status === 'IN_PROGRESS') {
                    return <Tag color="processing" icon={<ClockCircleOutlined />}>IN PROGRESS</Tag>;
                }
                if (record.status === 'CANCELLED') {
                    return <Tag color="red">CANCELLED</Tag>;
                }
                return <Tag color="blue">SCHEDULED</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => {
                const ended = checkIsSessionEnded(record);
                return (
                    <Space>
                        <Button
                            type={ended ? (isAdminOrDirector ? 'primary' : 'default') : 'primary'}
                            icon={ended ? (isAdminOrDirector ? <EditOutlined /> : <EyeOutlined />) : <CheckCircleOutlined />}
                            onClick={() => openAttendanceRoster(record)}
                        >
                            {ended ? (isAdminOrDirector ? 'Edit Attendance' : 'View Attendance') : 'Take Attendance'}
                        </Button>
                    </Space>
                );
            }
        }
    ];

    return (
        <div className="training-management-root">
            <div className="page-header">
                <div className="page-title-group">
                    <Title level={2}>Academy Training Center</Title>
                    <Text className="page-subtitle">Schedule sessions, plan drills, and track dynamic live attendance as athletes arrive.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsCreateModalOpen(true)}>
                    Schedule Training Session
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={sessions}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* MODAL: SCHEDULE SESSION */}
            <Modal
                title="Schedule Academy Training Session"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                footer={null}
                width={650}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreateSession} initialValues={{ date: dayjs(), startTime: dayjs().hour(9).minute(0), endTime: dayjs().hour(11).minute(0) }}>
                    <Form.Item name="theme" label="Session Focus Theme" rules={[{ required: true, message: 'Focus theme required' }]}>
                        <Input placeholder="e.g. Counter-attacking shape and quick transitions" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="date" label="Training Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="activitiesList" label="Drill Activities & Durations (Time Allotted)">
                        <Form.List name="activitiesList" initialValue={[{ description: '', duration: undefined }, { description: '', duration: undefined }, { description: '', duration: undefined }]}>
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Row gutter={8} key={key} align="middle" style={{ marginBottom: '8px' }}>
                                            <Col span={14}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'description']}
                                                    rules={[{ required: true, message: 'Activity description required' }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Input placeholder="e.g. Warm up and light jogging" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={7}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'duration']}
                                                    rules={[
                                                        { required: true, message: 'Duration required' },
                                                        { type: 'number', min: 1, message: 'Must be at least 1 min' }
                                                    ]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <InputNumber placeholder="Minutes" min={1} style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3} style={{ textAlign: 'center' }}>
                                                {fields.length > 1 && (
                                                    <Button type="link" danger onClick={() => remove(name)}>
                                                        Remove
                                                    </Button>
                                                )}
                                            </Col>
                                        </Row>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: '8px' }}>
                                        Add Activity Row
                                    </Button>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: '16px' }}>
                        <Space>
                            <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">Publish Session</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* DRAWER: LIVE ATTENDANCE REGISTRY */}
            <Drawer
                title={
                    <Space direction="vertical" size={1}>
                        <Text strong style={{ fontSize: '16px' }}>Attendance: {selectedSession?.theme}</Text>
                        <Space size="middle" style={{ fontSize: '12px', color: '#6b7280' }}>
                            <span><CalendarOutlined /> {selectedSession?.date}</span>
                            <span><ClockCircleOutlined /> {selectedSession?.startTime.substring(0, 5)} - {selectedSession?.endTime.substring(0, 5)}</span>
                            {selectedSession?.status === 'IN_PROGRESS' && <Tag color="processing">LIVE TRAINING</Tag>}
                        </Space>
                    </Space>
                }
                width={780}
                onClose={() => setIsAttendanceOpen(false)}
                open={isAttendanceOpen}
                destroyOnClose
                extra={
                    !isSessionEnded ? (
                        <Button
                            danger
                            icon={<StopOutlined />}
                            onClick={() => setIsEndSessionModalOpen(true)}
                        >
                            End Training Session
                        </Button>
                    ) : null
                }
            >
                {loadingRoster ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <Badge status="processing" text="Fetching real-time attendance rosters..." />
                    </div>
                ) : (
                    <div className="attendance-drawer-content">
                        {/* Session State Alert */}
                        {isSessionEnded && !isAdminOrDirector && (
                            <Alert
                                message="Session Concluded — Attendance Locked"
                                description="This training session has ended. In accordance with academy policy, only Administrators and Directors can update attendance after a session has ended."
                                type="warning"
                                showIcon
                                icon={<ExclamationCircleOutlined />}
                            />
                        )}

                        {isSessionEnded && isAdminOrDirector && (
                            <Alert
                                message="Session Concluded — Admin / Director Override Active"
                                description="You have administrative privileges to review and update attendance records for this concluded session."
                                type="info"
                                showIcon
                            />
                        )}

                        {!isSessionEnded && (
                            <Alert
                                message="Active Session — Dynamic Arrival Tracking"
                                description="Check in athletes one or more at a time as they arrive at the training pitch. Attendance updates save immediately and remain editable until the session ends."
                                type="success"
                                showIcon
                            />
                        )}

                        {/* Top Live Stat Cards Grid */}
                        <div className="stat-cards-grid">
                            <div className="stat-card stat-total">
                                <div className="stat-info">
                                    <div className="stat-label">Total Roster</div>
                                    <div className="stat-value">{rosterStats.total}</div>
                                </div>
                                <TeamOutlined className="stat-icon" />
                            </div>
                            <div className="stat-card stat-present">
                                <div className="stat-info">
                                    <div className="stat-label">Present</div>
                                    <div className="stat-value">{rosterStats.present}</div>
                                </div>
                                <CheckCircleOutlined className="stat-icon" />
                            </div>
                            <div className="stat-card stat-pending">
                                <div className="stat-info">
                                    <div className="stat-label">Pending Arrival</div>
                                    <div className="stat-value">{rosterStats.pending}</div>
                                </div>
                                <ClockCircleOutlined className="stat-icon" />
                            </div>
                            <div className="stat-card stat-other">
                                <div className="stat-info">
                                    <div className="stat-label">Absent / Other</div>
                                    <div className="stat-value">{rosterStats.other}</div>
                                </div>
                                <UserOutlined className="stat-icon" />
                            </div>
                        </div>

                        {/* Tabs & Search Navigation */}
                        <Tabs
                            activeKey={activeTab}
                            onChange={(key) => setActiveTab(key)}
                            items={[
                                { key: 'pending', label: `Pending Arrival (${rosterStats.pending})` },
                                { key: 'present', label: `Present (${rosterStats.present})` },
                                { key: 'all', label: `All Players (${rosterStats.total})` },
                                { key: 'other', label: `Absent / Other (${rosterStats.other})` },
                                { key: 'coaches', label: `Coaching Staff (${coachesRoster.length})` }
                            ]}
                        />

                        {activeTab !== 'coaches' && (
                            <>
                                {/* Batch Actions Panel when players are selected */}
                                {selectedPlayerIds.length > 0 && canUpdateAttendance && (
                                    <div className="batch-actions-panel">
                                        <div className="selection-count">
                                            <Badge count={selectedPlayerIds.length} style={{ backgroundColor: '#2563eb' }} />
                                            <span>athletes selected for check-in</span>
                                        </div>
                                        <div className="actions-controls">
                                            <Select
                                                value={batchStatus}
                                                onChange={(val) => setBatchStatus(val)}
                                                size="middle"
                                                style={{ width: 120 }}
                                            >
                                                <Select.Option value="PRESENT">Present</Select.Option>
                                                <Select.Option value="ABSENT">Absent</Select.Option>
                                                <Select.Option value="EXCUSED">Excused</Select.Option>
                                                <Select.Option value="INJURED">Injured</Select.Option>
                                            </Select>
                                            <Button
                                                type="primary"
                                                icon={<CheckOutlined />}
                                                loading={submittingAction}
                                                onClick={() => handleRegisterArrival(selectedPlayerIds, batchStatus)}
                                            >
                                                Register Arrival ({selectedPlayerIds.length})
                                            </Button>
                                            <Button onClick={() => setSelectedPlayerIds([])}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Filter Toolbar */}
                                <div className="filter-toolbar">
                                    <Input
                                        placeholder="Search by athlete name or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        allowClear
                                        className="search-input"
                                    />
                                    {canUpdateAttendance && activeTab === 'pending' && (
                                        <Button
                                            size="small"
                                            onClick={handleSelectAllPending}
                                        >
                                            {playersRoster.filter(p => !p.hasRecordedAttendance).every(p => selectedPlayerIds.includes(p.id)) && playersRoster.filter(p => !p.hasRecordedAttendance).length > 0
                                                ? 'Deselect All Pending'
                                                : 'Select All Pending Arrivals'}
                                        </Button>
                                    )}
                                </div>

                                {/* Attendees List */}
                                <div className="attendee-list">
                                    {filteredPlayers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                                            {searchQuery ? 'No athletes match your search.' : 'No athletes in this filter.'}
                                        </div>
                                    ) : (
                                        filteredPlayers.map(player => {
                                            const isSelected = selectedPlayerIds.includes(player.id);
                                            const statusClass = !player.hasRecordedAttendance
                                                ? 'is-pending'
                                                : `is-${(player.status || 'present').toLowerCase()}`;

                                            return (
                                                <div
                                                    key={player.id}
                                                    className={`attendee-card ${statusClass} ${isSelected ? 'is-selected' : ''}`}
                                                >
                                                    <div className="attendee-left">
                                                        {canUpdateAttendance && (
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectPlayer(player.id)}
                                                                className="attendee-checkbox"
                                                            />
                                                        )}
                                                        <div className="attendee-meta">
                                                            <span className="attendee-name">{player.firstName} {player.lastName}</span>
                                                            <span className="attendee-sub">
                                                                <span>{player.playerId || 'PFA-ATHLETE'}</span>
                                                                {player.hasRecordedAttendance ? (
                                                                    <Tag
                                                                        color={
                                                                            player.status === 'PRESENT' ? 'green' :
                                                                            player.status === 'ABSENT' ? 'red' :
                                                                            player.status === 'EXCUSED' ? 'blue' : 'purple'
                                                                        }
                                                                        style={{ margin: 0, fontSize: '11px' }}
                                                                    >
                                                                        {player.status}
                                                                    </Tag>
                                                                ) : (
                                                                    <Tag color="orange" style={{ margin: 0, fontSize: '11px' }}>
                                                                        NOT CHECKED IN
                                                                    </Tag>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="attendee-right">
                                                        {!player.hasRecordedAttendance && canUpdateAttendance && (
                                                            <Button
                                                                type="primary"
                                                                size="small"
                                                                icon={<CheckOutlined />}
                                                                className="quick-checkin-btn"
                                                                loading={submittingAction}
                                                                onClick={() => handleRegisterArrival([player.id], 'PRESENT')}
                                                            >
                                                                Check In (Arrived)
                                                            </Button>
                                                        )}

                                                        <Radio.Group
                                                            value={player.status}
                                                            onChange={(e) => handleStatusChange(player.id, 'PLAYER', e.target.value)}
                                                            disabled={!canUpdateAttendance}
                                                            size="small"
                                                        >
                                                            <Radio.Button value="PRESENT">Present</Radio.Button>
                                                            <Radio.Button value="ABSENT">Absent</Radio.Button>
                                                            <Radio.Button value="EXCUSED">Excused</Radio.Button>
                                                            <Radio.Button value="INJURED">Injured</Radio.Button>
                                                        </Radio.Group>

                                                        <Input
                                                            placeholder="Remarks"
                                                            value={player.remarks}
                                                            onChange={(e) => handleRemarksChange(player.id, 'PLAYER', e.target.value)}
                                                            disabled={!canUpdateAttendance}
                                                            size="small"
                                                            className="remarks-input"
                                                        />

                                                        {canUpdateAttendance && (
                                                            <Tooltip title="Save or update this athlete's status">
                                                                <Button
                                                                    size="small"
                                                                    icon={<CheckOutlined />}
                                                                    onClick={() => handleSaveAttendee(player, 'PLAYER')}
                                                                    loading={submittingAction}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'coaches' && (
                            <div>
                                <Divider orientation="left"><TeamOutlined style={{ marginRight: '6px' }} /> Coaching Staff & Officials</Divider>
                                {coachesRoster.length === 0 ? (
                                    <Text type="secondary" style={{ fontStyle: 'italic' }}>No coaches registered in the academy directory.</Text>
                                ) : (
                                    coachesRoster.map(coach => (
                                        <div key={coach.id} className="coach-card">
                                            <div className="coach-meta">
                                                <div className="coach-name">{coach.firstName} {coach.lastName}</div>
                                                <div className="coach-sub">{coach.employeeId || 'Official Coaching Staff'}</div>
                                            </div>

                                            <div className="coach-controls">
                                                <Radio.Group
                                                    value={coach.status || 'PRESENT'}
                                                    onChange={(e) => handleStatusChange(coach.id, 'COACH', e.target.value)}
                                                    disabled={!canUpdateAttendance}
                                                    size="small"
                                                >
                                                    <Radio.Button value="PRESENT">Present</Radio.Button>
                                                    <Radio.Button value="ABSENT">Absent</Radio.Button>
                                                    <Radio.Button value="EXCUSED">Excused</Radio.Button>
                                                </Radio.Group>

                                                <Input
                                                    placeholder="Remarks"
                                                    value={coach.remarks}
                                                    onChange={(e) => handleRemarksChange(coach.id, 'COACH', e.target.value)}
                                                    disabled={!canUpdateAttendance}
                                                    size="small"
                                                    className="remarks-input"
                                                />

                                                {canUpdateAttendance && (
                                                    <Button
                                                        size="small"
                                                        icon={<CheckOutlined />}
                                                        onClick={() => handleSaveAttendee(coach, 'COACH')}
                                                        loading={submittingAction}
                                                    >
                                                        Save
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Drawer>

            {/* MODAL: END TRAINING SESSION */}
            <Modal
                title="Conclude Training Session"
                open={isEndSessionModalOpen}
                onCancel={() => setIsEndSessionModalOpen(false)}
                onOk={handleEndSession}
                okText="Conclude Session"
                okButtonProps={{ danger: true, loading: submittingAction }}
                destroyOnClose
            >
                <Space direction="vertical" size={14} style={{ width: '100%', marginTop: '8px' }}>
                    <Text>
                        Are you sure you want to officially end <strong>{selectedSession?.theme}</strong>?
                    </Text>

                    <Alert
                        message="Post-Session Lock Notice"
                        description="Once the session is concluded, attendance records will be locked. Only Academy Administrators and Directors will have permission to modify attendance afterward."
                        type="info"
                        showIcon
                    />

                    {rosterStats.pending > 0 && (
                        <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <Checkbox
                                checked={markUnrecordedAsAbsent}
                                onChange={(e) => setMarkUnrecordedAsAbsent(e.target.checked)}
                            >
                                <Text strong>Auto-mark remaining {rosterStats.pending} unrecorded athletes as ABSENT</Text>
                            </Checkbox>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginLeft: '24px' }}>
                                Athletes who have not arrived or been checked in will have an ABSENT record created.
                            </div>
                        </div>
                    )}
                </Space>
            </Modal>
        </div>
    );
};
