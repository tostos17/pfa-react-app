import React, { useState, useEffect } from 'react';
import {
    Table, Card, Tag, Select, Button, Space, Typography, message,
    Modal, Form, Input, Row, Col, DatePicker, TimePicker, Badge, Drawer, InputNumber, Divider, Radio
} from 'antd';
import {
    PlusOutlined, TrophyOutlined, PlayCircleOutlined, CheckCircleOutlined,
    CalendarOutlined, TeamOutlined, HistoryOutlined, SolutionOutlined, EditOutlined, EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';
import dayjs from 'dayjs';
import './TrainingManagement.scss';

const { Text, Title } = Typography;
const { Option } = Select;

interface TrainingSessionDTO {
    id: number;
    theme: string;
    date: string;
    startTime: string;
    endTime: string;
    activities: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

interface AttendeeRosterItem {
    id: number;
    firstName: string;
    lastName: string;
    playerId?: string;
    employeeId?: string;
    status?: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'INJURED';
    remarks?: string;
}

export const TrainingManagement: React.FC = () => {
    const [sessions, setSessions] = useState<TrainingSessionDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSessionDTO | null>(null);

    // Attendance state
    const [playersRoster, setPlayersRoster] = useState<AttendeeRosterItem[]>([]);
    const [coachesRoster, setCoachesRoster] = useState<AttendeeRosterItem[]>([]);
    const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
    const [submittingAttendance, setSubmittingAttendance] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [form] = Form.useForm();

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/trainings');
            setSessions(res.data?.body || res.data || []);
        } catch (err) {
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
        } catch (err) {
            message.error('Failed to schedule training session.');
        }
    };

    const openAttendanceRoster = async (session: TrainingSessionDTO) => {
        setSelectedSession(session);
        setIsAttendanceOpen(true);
        setLoadingRoster(true);
        setSearchQuery('');

        try {
            const res = await apiClient.get(`/trainings/${session.id}`);
            const data = res.data?.body || res.data;
            const existingLines = data?.session?.attendanceLines || [];

            // Map players with their current attendance status if it exists.
            // Filter out non-active players unless they have an existing attendance record (historical logs).
            const players = (data?.eligiblePlayers || []).filter((p: any) => {
                if (session.status === 'COMPLETED') {
                    return existingLines.some((l: any) => l.attendeeType === 'PLAYER' && Number(l.player?.id) === Number(p.id));
                }
                return p.status === 'ACTIVE' || !p.status;
            }).map((p: any) => {
                const existing = existingLines.find((l: any) => l.attendeeType === 'PLAYER' && Number(l.player?.id) === Number(p.id));
                return {
                    ...p,
                    status: existing ? existing.status : 'PRESENT',
                    remarks: existing ? existing.remarks || '' : ''
                };
            });

            // Map coaches with their current attendance status if it exists
            const coaches = (data?.eligibleCoaches || []).map((c: any) => {
                const existing = existingLines.find((l: any) => l.attendeeType === 'COACH' && Number(l.coach?.id) === Number(c.id));
                return {
                    ...c,
                    status: existing ? existing.status : 'PRESENT',
                    remarks: existing ? existing.remarks || '' : ''
                };
            });

            setPlayersRoster(players);
            setCoachesRoster(coaches);
        } catch (err) {
            message.error('Failed to fetch session attendance rosters.');
            setIsAttendanceOpen(false);
        } finally {
            setLoadingRoster(false);
        }
    };

    const handleRosterStatusChange = (id: number, type: 'PLAYER' | 'COACH', status: any) => {
        if (type === 'PLAYER') {
            setPlayersRoster(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        } else {
            setCoachesRoster(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        }
    };

    const handleRosterRemarksChange = (id: number, type: 'PLAYER' | 'COACH', remarks: string) => {
        if (type === 'PLAYER') {
            setPlayersRoster(prev => prev.map(item => item.id === id ? { ...item, remarks } : item));
        } else {
            setCoachesRoster(prev => prev.map(item => item.id === id ? { ...item, remarks } : item));
        }
    };

    const submitAttendanceSheet = async () => {
        if (!selectedSession) return;
        setSubmittingAttendance(true);

        try {
            const records: any[] = [];
            playersRoster.forEach(p => {
                records.push({
                    id: p.id,
                    attendeeType: 'PLAYER',
                    status: p.status || 'PRESENT',
                    remarks: p.remarks || ''
                });
            });
            coachesRoster.forEach(c => {
                records.push({
                    id: c.id,
                    attendeeType: 'COACH',
                    status: c.status || 'PRESENT',
                    remarks: c.remarks || ''
                });
            });

            await apiClient.post(`/trainings/${selectedSession.id}/attendance`, { records });
            message.success('Training session attendance committed successfully.');
            setIsAttendanceOpen(false);
            fetchSessions();
        } catch (err) {
            message.error('Failed to save attendance records.');
        } finally {
            setSubmittingAttendance(false);
        }
    };

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
                } catch (e) {
                    // Fallback for legacy plain text
                }
                return <Text>{text}</Text>;
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const color = status === 'COMPLETED' ? 'green' : status === 'CANCELLED' ? 'red' : 'blue';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Space>
                    <Button
                        type={record.status === 'COMPLETED' ? 'default' : 'primary'}
                        icon={record.status === 'COMPLETED' ? <EyeOutlined /> : <CheckCircleOutlined />}
                        onClick={() => openAttendanceRoster(record)}
                    >
                        {record.status === 'COMPLETED' ? 'View Attendance' : 'Mark Attendance'}
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="training-management-root">
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Academy Training Center</Title>
                    <Text type="secondary">Schedule training sessions, outline drill plans, and manage player and coach attendance sheets.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsCreateModalOpen(true)}>
                    Schedule Training Session
                </Button>
            </div>

            <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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

            {/* DRAWER: MARK ATTENDANCE */}
            <Drawer
                title={`Attendance Registry: ${selectedSession?.theme}`}
                width={700}
                onClose={() => setIsAttendanceOpen(false)}
                open={isAttendanceOpen}
                destroyOnClose
                extra={
                    selectedSession?.status !== 'COMPLETED' && (
                        <Button type="primary" onClick={submitAttendanceSheet} loading={submittingAttendance} icon={<CheckCircleOutlined />}>
                            Save Attendance Sheet
                        </Button>
                    )
                }
            >
                {loadingRoster ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <Badge status="processing" text="Fetching attendance rosters..." />
                    </div>
                ) : (
                    <div>
                        {selectedSession?.status === 'COMPLETED' && (
                            <div style={{ marginBottom: '16px' }}>
                                <Alert message="This training session attendance has been submitted and is locked for verification audit." type="info" showIcon />
                            </div>
                        )}
                        
                        <Divider orientation="left"><TeamOutlines style={{ marginRight: '6px' }} /> Coaching Staff / Officials</Divider>
                        {coachesRoster.length === 0 ? (
                            <Text type="secondary" style={{ fontStyle: 'italic' }}>No coaches registered in the system.</Text>
                        ) : (
                            coachesRoster.map(coach => (
                                <Row key={coach.id} align="middle" style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <Col span={8}>
                                        <Text strong>{coach.firstName} {coach.lastName}</Text>
                                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{coach.employeeId || 'Staff'}</div>
                                    </Col>
                                    <Col span={10}>
                                        <Radio.Group 
                                            value={coach.status} 
                                            onChange={(e) => handleRosterStatusChange(coach.id, 'COACH', e.target.value)}
                                            disabled={selectedSession?.status === 'COMPLETED'}
                                            size="small"
                                        >
                                            <Radio.Button value="PRESENT">Present</Radio.Button>
                                            <Radio.Button value="ABSENT">Absent</Radio.Button>
                                            <Radio.Button value="EXCUSED">Excused</Radio.Button>
                                        </Radio.Group>
                                    </Col>
                                    <Col span={6}>
                                        <Input 
                                            placeholder="Remarks" 
                                            value={coach.remarks} 
                                            onChange={(e) => handleRosterRemarksChange(coach.id, 'COACH', e.target.value)}
                                            disabled={selectedSession?.status === 'COMPLETED'}
                                            size="small"
                                        />
                                    </Col>
                                </Row>
                            ))
                        )}

                        <Divider orientation="left" style={{ marginTop: '24px' }}><TeamOutlined style={{ marginRight: '6px' }} /> Academy Players / Athletes</Divider>
                        
                        <Input 
                            placeholder="Filter players by first or last name..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ marginBottom: '16px' }}
                            allowClear
                        />

                        {(() => {
                            const filteredPlayers = playersRoster.filter(p => 
                                `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                            if (filteredPlayers.length === 0) {
                                return (
                                    <Text type="secondary" style={{ fontStyle: 'italic' }}>
                                        {searchQuery ? 'No matching players found.' : 'No players enrolled in the academy roster.'}
                                    </Text>
                                );
                            }
                            return filteredPlayers.map(player => (
                                <Row key={player.id} align="middle" style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <Col span={8}>
                                        <Text strong>{player.firstName} {player.lastName}</Text>
                                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{player.playerId || 'Player'}</div>
                                    </Col>
                                    <Col span={10}>
                                        <Radio.Group 
                                            value={player.status} 
                                            onChange={(e) => handleRosterStatusChange(player.id, 'PLAYER', e.target.value)}
                                            disabled={selectedSession?.status === 'COMPLETED'}
                                            size="small"
                                        >
                                            <Radio.Button value="PRESENT">Present</Radio.Button>
                                            <Radio.Button value="ABSENT">Absent</Radio.Button>
                                            <Radio.Button value="EXCUSED">Excused</Radio.Button>
                                            <Radio.Button value="INJURED">Injured</Radio.Button>
                                        </Radio.Group>
                                    </Col>
                                    <Col span={6}>
                                        <Input 
                                            placeholder="Remarks" 
                                            value={player.remarks} 
                                            onChange={(e) => handleRosterRemarksChange(player.id, 'PLAYER', e.target.value)}
                                            disabled={selectedSession?.status === 'COMPLETED'}
                                            size="small"
                                        />
                                    </Col>
                                </Row>
                            ));
                        })()}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

// Simple Alert Component inline helper if Alert is not imported
const Alert: React.FC<{ message: string; type: string; showIcon?: boolean }> = ({ message, type }) => {
    return (
        <div style={{ padding: '12px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <Text style={{ fontSize: '13px' }}>{message}</Text>
        </div>
    );
};

const TeamOutlines: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    return <span style={style}>📋</span>;
};
