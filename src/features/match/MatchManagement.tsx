import React, { useState, useEffect } from 'react';
import {
    Table, Card, Tag, Select, Button, Space, Typography, message,
    Modal, Form, Input, Row, Col, DatePicker, TimePicker, Badge, Tabs, Drawer, InputNumber, Divider, Transfer
} from 'antd';
import {
    PlusOutlined, TrophyOutlined, PlayCircleOutlined, CheckCircleOutlined,
    VideoCameraOutlined, EnvironmentOutlined, CalendarOutlined, TeamOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../config/axios';

const { Text, Title } = Typography;
const { Option } = Select;

// Models matching backend MatchResponseDTO
interface MatchResponseDTO {
    id: number;
    categoryName: string;
    opponentName: string;
    date: string;
    time: string;
    venue: string;
    started: boolean;
    isLive: boolean;
    ended: boolean;
    isHomeMatch: boolean;
    isAwayMatch: boolean;
    homeTeamScore: number;
    awayTeamScore: number;
    type: 'FRIENDLY' | 'COMPETITIVE';
    halfDuration: number;
    photoUrls: string[];
    videoUrls: string[];
    startingLineupPlayerIds: number[];
}

interface Player {
    id: number;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
}

export const MatchManagement: React.FC = () => {
    const [matches, setMatches] = useState<MatchResponseDTO[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('scheduled');

    // Modals / Drawers State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isLiveControlOpen, setIsLiveControlOpen] = useState<boolean>(false);
    const [selectedMatch, setSelectedMatch] = useState<MatchResponseDTO | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Live Tracking States
    const [lineupTargetKeys, setLineupTargetKeys] = useState<string[]>([]);
    const [eventTime, setEventTime] = useState<string>('1');

    const [form] = Form.useForm();

    useEffect(() => {
        fetchMatches();
        fetchAcademyRoster();
    }, []);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<any>('/matches');

            // Check if response data is directly an array, or wrapped inside an object (like Spring Page)
            if (Array.isArray(response.data)) {
                setMatches(response.data);
            } else if (response.data && Array.isArray(response.data.content)) {
                setMatches(response.data.content); // Handles Pageable / Page<MatchResponseDTO>
            } else {
                setMatches([]); // Safety fallback
                console.error("Unexpected backend response structural signature:", response.data);
            }
        } catch (err) {
            message.error("Failed to load match schedules.");
            setMatches([]); // Clear state on exception
        } finally {
            setLoading(false);
        }
    };

    const fetchAcademyRoster = async () => {
        try {
            const response = await apiClient.get<any>('/players');

            // Check if response data is directly an array, or wrapped inside an object (like Spring Page)
            if (Array.isArray(response.data)) {
                setPlayers(response.data);
            } else if (response.data && Array.isArray(response.data.content)) {
                setPlayers(response.data.content); // Extracts the array from Page<Player>
            } else {
                setPlayers([]); // Safety fallback
                console.error("Unexpected backend player response signature:", response.data);
            }
        } catch (err) {
            console.error("Failed to load team roster for lineup options.");
            setPlayers([]); // Clear state on exception to prevent map errors
        }
    };

    // Filter schedules based on standard match states
    const filteredMatches = matches.filter(m => {
        if (activeTab === 'live') return m.isLive && !m.ended;
        if (activeTab === 'completed') return m.ended;
        return !m.started && !m.ended; // Scheduled
    });

    // Action: Create Match Schedule
    const handleCreateMatch = async (values: any) => {
        setSubmitting(true);
        try {
            const payload = {
                opponentName: values.opponentName,
                date: values.date.format('YYYY-MM-DD'),
                time: values.time.format('HH:mm:ss'),
                venue: values.venue,
                isHomeMatch: values.matchLocation === 'home',
                isAwayMatch: values.matchLocation === 'away',
                type: values.type,
                halfDuration: values.halfDuration,
                categoryid: values.categoryId || 0
            };

            await apiClient.post('/matches', payload);
            message.success("Match schedule listed successfully!");
            setIsCreateModalOpen(false);
            form.resetFields();
            fetchMatches();
        } catch (err) {
            message.error("Failed to register match schedule.");
        } finally {
            setSubmitting(false);
        }
    };

    // Action: Kick Off Match Live
    const handleStartMatch = async (matchId: number) => {
        try {
            const response = await apiClient.post<MatchResponseDTO>(`/matches/${matchId}/start`);
            message.success("Match is now LIVE!");
            fetchMatches();
            openLiveControlRoom(response.data);
        } catch (err) {
            message.error("Could not trigger kickoff.");
        }
    };

    // Action: Conclude Full-Time
    const handleEndMatch = async (matchId: number) => {
        try {
            await apiClient.post(`/matches/${matchId}/end`);
            message.success("Match finalized. Full-time metrics archived.");
            setIsLiveControlOpen(false);
            fetchMatches();
        } catch (err) {
            message.error("Could not conclude match.");
        }
    };

    // Live Control Room Operations
    const openLiveControlRoom = (match: MatchResponseDTO) => {
        setSelectedMatch(match);
        setLineupTargetKeys(match.startingLineupPlayerIds?.map(String) || []);
        setIsLiveControlOpen(true);
    };

    const handleUpdateLineup = async () => {
        if (!selectedMatch) return;
        try {
            const playerIds = lineupTargetKeys.map(Number);
            const res = await apiClient.put<MatchResponseDTO>(`/matches/${selectedMatch.id}/lineup`, playerIds);
            setSelectedMatch(res.data);
            message.success("Starting XI updated successfully!");
        } catch (err) {
            message.error("Failed to commit lineup configuration.");
        }
    };

    const handleLogGoal = async (scorerId: number, side: 'home' | 'away') => {
        if (!selectedMatch) return;
        try {
            await apiClient.post(`/matches/${selectedMatch.id}/goals?scorerPlayerId=${scorerId}`, {
                matchTime: eventTime
            });
            message.success(`Goal registered for ${side === 'home' ? 'Academy' : 'Opponent'}!`);
            // Re-fetch match properties to update real-time scores
            const res = await apiClient.get<MatchResponseDTO>(`/matches/${selectedMatch.id}`);
            setSelectedMatch(res.data);
            fetchMatches();
        } catch (err) {
            message.error("Failed to log score transaction.");
        }
    };

    const columns: ColumnsType<MatchResponseDTO> = [
        {
            title: 'Fixture Info',
            key: 'fixture',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong style={{ fontSize: '15px' }}>
                        {record.isHomeMatch ? 'PFA Academy' : record.opponentName} <span style={{ color: '#ff4d4f' }}>vs</span> {record.isHomeMatch ? record.opponentName : 'PFA Academy'}
                    </Text>
                    <Space size="middle" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        <span><CalendarOutlined /> {record.date} @ {record.time}</span>
                        <span><EnvironmentOutlined /> {record.venue}</span>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color={type === 'COMPETITIVE' ? 'volcano' : 'blue'}>{type}</Tag>
        },
        {
            title: 'Scoreboard',
            key: 'score',
            align: 'center',
            render: (_, record) => (
                record.started ? (
                    <div style={{ background: '#f5f5f5', padding: '4px 12px', borderRadius: '6px', display: 'inline-block', fontWeight: 'bold', fontSize: '16px' }}>
                        {record.homeTeamScore} - {record.awayTeamScore}
                    </div>
                ) : <Tag>Scheduled</Tag>
            )
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                if (record.ended) return <Badge status="default" text="Concluded" />;
                if (record.isLive) return <Badge status="processing" text="LIVE" />;
                return <Badge status="warning" text="Pending K.O" />;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Space>
                    {!record.started && !record.ended && (
                        <Button type="primary" ghost icon={<PlayCircleOutlined />} onClick={() => handleStartMatch(record.id)}>
                            Kickoff Live
                        </Button>
                    )}
                    {record.isLive && (
                        <Button type="primary" danger icon={<TrophyOutlined />} onClick={() => openLiveControlRoom(record)}>
                            Control Room
                        </Button>
                    )}
                    {record.ended && (
                        <Button icon={<VideoCameraOutlined />} disabled>
                            Media Center
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Match Center</Title>
                    <Text type="secondary">Manage academy fixtures, team selection configurations, and execute dynamic real-time event updates.</Text>
                </Col>
                <Col>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
                        Schedule New Match
                    </Button>
                </Col>
            </Row>

            <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: '16px' }}>
                    <Tabs.TabPane tab={<span>Scheduled Fixtures ({matches.filter(m => !m.started && !m.ended).length})</span>} key="scheduled" />
                    <Tabs.TabPane tab={<span>🔴 Live Match Tracker ({matches.filter(m => m.isLive && !m.ended).length})</span>} key="live" />
                    <Tabs.TabPane tab={<span>Completed Results ({matches.filter(m => m.ended).length})</span>} key="completed" />
                </Tabs>

                <Table
                    columns={columns}
                    dataSource={filteredMatches}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* MODAL: CREATE FIXTURE */}
            <Modal
                title="Schedule Academy Fixture"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateMatch} initialValues={{ type: 'FRIENDLY', halfDuration: 45, matchLocation: 'home' }}>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="opponentName" label="Opponent Club Name" rules={[{ required: true, message: 'Please input opponent name' }]}>
                                <Input placeholder="e.g., Enyimba FC Academy" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="date" label="Match Date" rules={[{ required: true, message: 'Select date' }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="time" label="Kick-off Time" rules={[{ required: true, message: 'Select time' }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="venue" label="Ground Venue / Stadium Location" rules={[{ required: true, message: 'Please enter venue' }]}>
                                <Input placeholder="e.g., National Stadium Training Pitch, Lagos" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="type" label="Match Context">
                                <Select>
                                    <Option value="FRIENDLY">Friendly</Option>
                                    <Option value="COMPETITIVE">Competitive League</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="matchLocation" label="Ground Preference">
                                <Select>
                                    <Option value="home">Home Ground</Option>
                                    <Option value="away">Away Fixture</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="halfDuration" label="Half Duration (Mins)" rules={[{ required: true }]}>
                                <InputNumber min={1} max={90} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div style={{ textAlign: 'right', marginTop: '16px' }}>
                        <Space>
                            <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>Publish Fixture</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* DRAWER: LIVE MATCH CONTROL ROOM */}
            <Drawer
                title={`Live Match Engine Room: PFA vs ${selectedMatch?.opponentName}`}
                width={750}
                onClose={() => setIsLiveControlOpen(false)}
                open={isLiveControlOpen}
                extra={
                    <Button type="primary" danger icon={<CheckCircleOutlined />} onClick={() => selectedMatch && handleEndMatch(selectedMatch.id)}>
                        Finalize Full-Time
                    </Button>
                }
            >
                {selectedMatch && (
                    <div>
                        {/* Live Score Display */}
                        <div style={{ textAlign: 'center', background: '#001529', color: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
                            <Title level={3} style={{ color: '#fff', margin: 0 }}>LIVE SCOREBOARD</Title>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '12px 0' }}>
                                {selectedMatch.homeTeamScore} : {selectedMatch.awayTeamScore}
                            </div>
                            <Tag color="red" style={{ animation: 'blink 1s infinite' }}>MATCH IN PROGRESS</Tag>
                        </div>

                        {/* Event Logging Context Inputs */}
                        <Title level={4}>1. Match Action Timeline Controls</Title>
                        <Space align="center" style={{ marginBottom: '16px', background: '#fafafa', padding: '12px', borderRadius: '6px', width: '100%', justifyContent: 'space-between' }}>
                            <div>
                                <span style={{ marginRight: '8px' }}>Current Minute Input:</span>
                                <InputNumber value={parseInt(eventTime)} onChange={(val) => setEventTime(String(val || 1))} min={1} max={120} />
                            </div>
                            <Space>
                                <Button type="primary" size="middle" onClick={() => handleLogGoal(0, 'home')}>
                                    + PFA Goal Scored
                                </Button>
                                <Button danger size="middle" onClick={() => handleLogGoal(0, 'away')}>
                                    + Opponent Goal
                                </Button>
                            </Space>
                        </Space>

                        <Divider />

                        {/* Starting Lineup Allocation */}
                        <Title level={4}><TeamOutlined /> 2. Squad Selection & Starting XI</Title>
                        <p style={{ color: '#8c8c8c' }}>Allocate players registered to the academy into the matching lineup context tree.</p>

                        <Transfer
                            dataSource={players.map(p => ({ key: String(p.id), title: `${p.firstName} ${p.lastName}` }))}
                            titles={['Available Squad', 'Starting XI']}
                            targetKeys={lineupTargetKeys}
                            // 💡 FIX: Safely map nextTargetKeys to clean strings before updating state
                            onChange={(nextTargetKeys: React.Key[]) => {
                                setLineupTargetKeys(nextTargetKeys.map(String));
                            }}
                            render={item => item.title}
                            listStyle={{ width: '45%', height: 300 }}
                        />
                        <Button type="primary" block onClick={handleUpdateLineup} style={{ marginTop: '12px' }}>
                            Save and Commit Starting XI Team Sheet
                        </Button>
                    </div>
                )}
            </Drawer>
        </div>
    );
};