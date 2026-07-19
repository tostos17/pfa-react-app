import React, { useState, useEffect } from 'react';
import {
    Table, Card, Tag, Select, Button, Space, Typography, message,
    Modal, Form, Input, Row, Col, DatePicker, TimePicker, Badge, Tabs, Drawer, InputNumber, Divider, Transfer, Upload, Spin
} from 'antd';
import {
    PlusOutlined, TrophyOutlined, PlayCircleOutlined, CheckCircleOutlined,
    VideoCameraOutlined, EnvironmentOutlined, CalendarOutlined, TeamOutlined,
    UploadOutlined, HistoryOutlined, SwapOutlined, MinusOutlined, PauseCircleOutlined,
    EyeOutlined, CloseCircleOutlined
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
    status?: string;
    currentHalfStart?: string;
}

interface Player {
    id: number;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
}

const getLiveMatchTime = (match: any): string => {
    if (!match) return '0';
    if (match.status === 'SCHEDULED') return '0';
    if (match.status === 'HALFTIME') return 'HT';
    if (match.status === 'COMPLETED') return 'FT';

    if (!match.currentHalfStart) return '0';

    const start = new Date(match.currentHalfStart).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    const halfDur = match.halfDuration || 45;

    if (match.status === 'FIRST_HALF') {
        if (elapsedMinutes > halfDur) {
            return `${halfDur} + ${elapsedMinutes - halfDur}`;
        }
        return String(elapsedMinutes || 1);
    }

    if (match.status === 'SECOND_HALF') {
        if (elapsedMinutes > halfDur) {
            return `${halfDur * 2} + ${elapsedMinutes - halfDur}`;
        }
        return String(halfDur + elapsedMinutes);
    }

    return '0';
};

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

    // Backend API Integrations
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [lineupPlayers, setLineupPlayers] = useState<any[]>([]);
    const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);

    // Media modal states
    const [selectedMatchForMedia, setSelectedMatchForMedia] = useState<MatchResponseDTO | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
    const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);

    // Completed Match Details states
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
    const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<MatchResponseDTO | null>(null);
    const [detailTimeline, setDetailTimeline] = useState<any[]>([]);
    const [detailLineup, setDetailLineup] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

    // Submitting goal/substitution forms state
    const [submittingGoal, setSubmittingGoal] = useState<boolean>(false);
    const [submittingSub, setSubmittingSub] = useState<boolean>(false);
    const [goalScorerId, setGoalScorerId] = useState<number | null>(null);
    const [goalIsOwn, setGoalIsOwn] = useState<boolean>(false);
    const [subPlayerInId, setSubPlayerInId] = useState<number | null>(null);
    const [subPlayerOutId, setSubPlayerOutId] = useState<number | null>(null);

    // Incident logging states
    const [incidentType, setIncidentType] = useState<string>('YELLOW_CARD');
    const [incidentTeam, setIncidentTeam] = useState<string>('HOME');
    const [incidentPlayerId, setIncidentPlayerId] = useState<number | null>(null);
    const [submittingIncident, setSubmittingIncident] = useState<boolean>(false);
    const [tickerTime, setTickerTime] = useState<string>('0');

    const [form] = Form.useForm();

    useEffect(() => {
        fetchMatches();
        fetchAcademyRoster();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!selectedMatch) return;
        
        const updateTimer = () => {
            const timeStr = getLiveMatchTime(selectedMatch);
            setTickerTime(timeStr);
            if (timeStr !== 'HT' && timeStr !== 'FT' && timeStr !== '0') {
                setEventTime(timeStr);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [selectedMatch]);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<any>('/matches');
            const data = response.data;

            // Check if response data is directly an array, or wrapped inside an object (like Spring Page)
            if (Array.isArray(data)) {
                setMatches(data);
            } else if (data && Array.isArray(data.content)) {
                setMatches(data.content); // Handles Pageable / Page<MatchResponseDTO>
            } else if (data && data.body && Array.isArray(data.body)) {
                setMatches(data.body);
            } else if (data && data.body && Array.isArray(data.body.content)) {
                setMatches(data.body.content);
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

    const fetchCategories = async () => {
        try {
            const res = await apiClient.get<any>('/matches/categories');
            if (Array.isArray(res.data)) {
                setCategories(res.data);
            } else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as any).body)) {
                setCategories((res.data as any).body);
            } else {
                setCategories([]);
            }
        } catch (err) {
            console.error("Failed to load category database entries.");
            setCategories([]);
        }
    };

    const fetchTimeline = async (matchId: number) => {
        setLoadingTimeline(true);
        try {
            const res = await apiClient.get<any>(`/matches/${matchId}/timeline`);
            const data = res.data;
            if (data && Array.isArray(data.timeline)) {
                setTimelineEvents(data.timeline);
            } else if (data && data.body && Array.isArray(data.body.timeline)) {
                setTimelineEvents(data.body.timeline);
            } else {
                setTimelineEvents([]);
            }
        } catch (err) {
            console.error("Failed to load match timeline events.");
            setTimelineEvents([]);
        } finally {
            setLoadingTimeline(false);
        }
    };

    const fetchLineupDetails = async (matchId: number) => {
        try {
            const res = await apiClient.get<any>(`/matches/${matchId}/lineup/details`);
            if (Array.isArray(res.data)) {
                setLineupPlayers(res.data);
            } else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as any).body)) {
                setLineupPlayers((res.data as any).body);
            } else {
                setLineupPlayers([]);
            }
        } catch (err) {
            console.error("Failed to fetch starting lineup squad details.");
            setLineupPlayers([]);
        }
    };

    const fetchAcademyRoster = async () => {
        try {
            const response = await apiClient.get<any>('/players');
            const data = response.data;
            if (Array.isArray(data)) {
                setPlayers(data);
            } else if (data && Array.isArray(data.content)) {
                setPlayers(data.content); // Extracts the array from Page<Player>
            } else if (data && data.body && Array.isArray(data.body)) {
                setPlayers(data.body);
            } else if (data && data.body && Array.isArray(data.body.content)) {
                setPlayers(data.body.content); // Extracts the array from ApiResponse<Page<Player>>
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
                categoryId: values.categoryId
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

    // Action: Cancel Scheduled Match
    const handleCancelMatch = async (matchId: number) => {
        Modal.confirm({
            title: 'Are you sure you want to cancel this match?',
            content: 'This action is irreversible and will archive the fixture as Cancelled.',
            okText: 'Yes, Cancel Match',
            okType: 'danger',
            cancelText: 'No, Keep Scheduled',
            onOk: async () => {
                try {
                    await apiClient.post(`/matches/${matchId}/cancel`);
                    message.success("Match cancelled successfully.");
                    fetchMatches();
                } catch (err) {
                    message.error("Failed to cancel match.");
                }
            }
        });
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
        fetchTimeline(match.id);
        fetchLineupDetails(match.id);
    };

    const openLineupConfigurator = (match: MatchResponseDTO) => {
        setSelectedMatch(match);
        setLineupTargetKeys(match.startingLineupPlayerIds?.map(String) || []);
        setIsLiveControlOpen(true);
        fetchLineupDetails(match.id);
        setTimelineEvents([]);
    };

    const handleUpdateLineup = async () => {
        if (!selectedMatch) return;
        try {
            const playerIds = lineupTargetKeys.map(Number);
            const res = await apiClient.put<any>(`/matches/${selectedMatch.id}/lineup`, playerIds);
            setSelectedMatch(res.data?.body || res.data);
            fetchLineupDetails(selectedMatch.id);
            message.success("Starting XI updated successfully!");
        } catch (err) {
            message.error("Failed to commit lineup configuration.");
        }
    };

    const handleModifyScore = async (homeScore: number, awayScore: number) => {
        if (!selectedMatch) return;
        try {
            const res = await apiClient.put<any>(`/matches/${selectedMatch.id}/score`, {
                homeTeamScore: homeScore,
                awayTeamScore: awayScore,
                matchTime: tickerTime
            });
            setSelectedMatch(res.data?.body || res.data);
            fetchTimeline(selectedMatch.id);
            fetchMatches();
            message.success("Scoreboard updated successfully!");
        } catch (err) {
            message.error("Failed to update scoreboard.");
        }
    };

    const handleLogDetailedGoal = async () => {
        if (!selectedMatch) return;
        if (!goalScorerId) {
            message.warning("A player must be chosen to record a goal scorer event.");
            return;
        }
        setSubmittingGoal(true);
        try {
            await apiClient.post(`/matches/${selectedMatch.id}/goals?scorerPlayerId=${goalScorerId}`, {
                matchTime: eventTime,
                isOwnGoal: goalIsOwn
            });
            message.success("Goal transaction recorded successfully!");
            
            // Reload match score and timeline
            const res = await apiClient.get<any>(`/matches/${selectedMatch.id}`);
            setSelectedMatch(res.data?.body || res.data);
            fetchTimeline(selectedMatch.id);
            fetchMatches();
            
            // Reset input values
            setGoalScorerId(null);
            setGoalIsOwn(false);
        } catch (err) {
            message.error("Failed to log goal scorer transaction.");
        } finally {
            setSubmittingGoal(false);
        }
    };

    const handleLogSubstitution = async () => {
        if (!selectedMatch) return;
        if (!subPlayerOutId || !subPlayerInId) {
            message.warning("Both incoming and outgoing squad players must be chosen.");
            return;
        }
        setSubmittingSub(true);
        try {
            await apiClient.post(`/matches/${selectedMatch.id}/substitutions?playerInId=${subPlayerInId}&playerOutId=${subPlayerOutId}`, {
                matchTime: eventTime
            });
            message.success("Substitution recorded successfully!");

            // Reload match and timeline
            const res = await apiClient.get<any>(`/matches/${selectedMatch.id}`);
            setSelectedMatch(res.data?.body || res.data);
            fetchTimeline(selectedMatch.id);
            fetchLineupDetails(selectedMatch.id);
            fetchMatches();

            // Reset inputs
            setSubPlayerInId(null);
            setSubPlayerOutId(null);
        } catch (err) {
            message.error("Failed to commit substitution event.");
        } finally {
            setSubmittingSub(false);
        }
    };

    const handleLogIncident = async () => {
        if (!selectedMatch) return;
        setSubmittingIncident(true);
        try {
            if (incidentType === 'YELLOW_CARD' || incidentType === 'RED_CARD') {
                const card = incidentType === 'YELLOW_CARD' ? 'YELLOW' : 'RED';
                let url = `/matches/${selectedMatch.id}/cards?cardType=${card}&team=${incidentTeam}&matchTime=${eventTime}`;
                if (incidentPlayerId && incidentTeam === 'HOME') {
                    url += `&playerId=${incidentPlayerId}`;
                }
                await apiClient.post(url);
                message.success(`${card === 'YELLOW' ? 'Yellow' : 'Red'} card logged successfully!`);
            } else if (incidentType === 'CORNER') {
                await apiClient.post(`/matches/${selectedMatch.id}/corners?team=${incidentTeam}&matchTime=${eventTime}`);
                message.success("Corner kick logged successfully!");
            } else if (incidentType === 'FREEKICK') {
                let url = `/matches/${selectedMatch.id}/freekicks?team=${incidentTeam}&matchTime=${eventTime}`;
                if (incidentPlayerId && incidentTeam === 'HOME') {
                    url += `&takerPlayerId=${incidentPlayerId}`;
                }
                await apiClient.post(url);
                message.success("Freekick logged successfully!");
            }
            
            // Reload match and timeline
            fetchTimeline(selectedMatch.id);
            
            // Reset player input
            setIncidentPlayerId(null);
        } catch (err) {
            message.error("Failed to record incident.");
        } finally {
            setSubmittingIncident(false);
        }
    };

    const handleHalftime = async () => {
        if (!selectedMatch) return;
        try {
            const res = await apiClient.post<any>(`/matches/${selectedMatch.id}/halftime`);
            setSelectedMatch(res.data?.body || res.data);
            fetchTimeline(selectedMatch.id);
            fetchMatches();
            message.success("First half ended. Match is now at halftime.");
        } catch (err) {
            message.error("Failed to transition to halftime.");
        }
    };

    const handleStartSecondHalf = async () => {
        if (!selectedMatch) return;
        try {
            const res = await apiClient.post<any>(`/matches/${selectedMatch.id}/start-second-half`);
            setSelectedMatch(res.data?.body || res.data);
            fetchTimeline(selectedMatch.id);
            fetchMatches();
            message.success("Second half kicked off!");
        } catch (err) {
            message.error("Failed to start second half.");
        }
    };

    const handleUploadMedia = async (file: File, type: 'photo' | 'video') => {
        if (!selectedMatchForMedia) return;
        setUploadingMedia(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const res = await apiClient.post<any>(`/matches/${selectedMatchForMedia.id}/media`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setSelectedMatchForMedia(res.data?.body || res.data);
            fetchMatches();
            message.success(`${type === 'video' ? 'Video' : 'Photo'} asset uploaded successfully!`);
        } catch (err) {
            message.error("Failed to upload media file.");
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleOpenDetails = async (match: MatchResponseDTO) => {
        setSelectedMatchForDetails(match);
        setIsDetailsModalOpen(true);
        setLoadingDetails(true);
        setDetailTimeline([]);
        setDetailLineup([]);
        try {
            const timelineRes = await apiClient.get<any>(`/matches/${match.id}/timeline`);
            const tData = timelineRes.data?.body?.timeline || timelineRes.data?.timeline || [];
            setDetailTimeline(tData);

            const lineupRes = await apiClient.get<any>(`/matches/${match.id}/lineup/details`);
            const lData = lineupRes.data?.body || lineupRes.data || [];
            setDetailLineup(lData);
        } catch (err) {
            console.error("Failed to load match detail subsets.", err);
            message.error("Failed to load match details.");
        } finally {
            setLoadingDetails(false);
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
                if (record.status === 'CANCELLED') return <Badge status="error" text="Cancelled" />;
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
                    {!record.started && !record.ended && record.status !== 'CANCELLED' && (
                        <>
                            <Button icon={<TeamOutlined />} type="default" onClick={() => openLineupConfigurator(record)}>
                                Set Starting XI
                            </Button>
                            <Button type="primary" ghost icon={<PlayCircleOutlined />} onClick={() => handleStartMatch(record.id)}>
                                Kickoff Live
                            </Button>
                            <Button type="text" danger icon={<CloseCircleOutlined />} onClick={() => handleCancelMatch(record.id)}>
                                Cancel Match
                            </Button>
                        </>
                    )}
                    {record.isLive && (
                        <Button type="primary" danger icon={<TrophyOutlined />} onClick={() => openLiveControlRoom(record)}>
                            Control Room
                        </Button>
                    )}
                    {record.ended && record.status !== 'CANCELLED' && (
                        <Space>
                            <Button 
                                icon={<EyeOutlined />} 
                                type="primary"
                                ghost
                                onClick={() => handleOpenDetails(record)}
                            >
                                View Details
                            </Button>
                            <Button 
                                icon={<VideoCameraOutlined />} 
                                type="default"
                                onClick={() => {
                                    setSelectedMatchForMedia(record);
                                    setIsMediaModalOpen(true);
                                }}
                            >
                                Media Center
                            </Button>
                        </Space>
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
                        <Col span={24}>
                            <Form.Item name="categoryId" label="Academy Category/Age Group" rules={[{ required: true, message: 'Please select category' }]}>
                                <Select placeholder="Select age group (e.g. Under 15)">
                                    {Array.isArray(categories) && categories.map(cat => (
                                        <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                                    ))}
                                </Select>
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
                title={selectedMatch?.started ? `Live Match Engine Room: PFA vs ${selectedMatch?.opponentName}` : `Match Team Sheet Setup: PFA vs ${selectedMatch?.opponentName}`}
                width={750}
                onClose={() => setIsLiveControlOpen(false)}
                open={isLiveControlOpen}
                extra={selectedMatch?.started ? (
                    selectedMatch.status === 'FIRST_HALF' ? (
                        <Button type="primary" ghost danger icon={<PauseCircleOutlined />} onClick={handleHalftime}>
                            End 1st Half (Halftime)
                        </Button>
                    ) : selectedMatch.status === 'HALFTIME' ? (
                        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStartSecondHalf}>
                            Start 2nd Half
                        </Button>
                    ) : selectedMatch.status === 'SECOND_HALF' ? (
                        <Button type="primary" danger icon={<CheckCircleOutlined />} onClick={() => selectedMatch && handleEndMatch(selectedMatch.id)}>
                            Finalize Full-Time
                        </Button>
                    ) : (
                        <Tag color="default">Concluded</Tag>
                    )
                ) : (
                    <Tag color="blue">Scheduled Fixture</Tag>
                )}
            >
                {selectedMatch && (
                    !selectedMatch.started ? (
                        <div>
                            <Card style={{ marginBottom: '24px', background: '#fafafa' }}>
                                <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                                    <Col>
                                        <Space direction="vertical" size={4}>
                                            <Title level={4} style={{ margin: 0 }}>Fixture Information</Title>
                                            <div><strong>Match Type:</strong> <Tag color={selectedMatch.type === 'COMPETITIVE' ? 'volcano' : 'blue'}>{selectedMatch.type}</Tag></div>
                                            <div><strong>Date & Time:</strong> {selectedMatch.date} at {selectedMatch.time}</div>
                                            <div><strong>Venue:</strong> {selectedMatch.venue}</div>
                                        </Space>
                                    </Col>
                                    <Col style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
                                        <Space direction="vertical" size={2}>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>Half Duration:</Text>
                                            <Space>
                                                <InputNumber 
                                                    min={1} 
                                                    max={120} 
                                                    value={selectedMatch.halfDuration} 
                                                    onChange={async (val) => {
                                                        if (val && val > 0) {
                                                            try {
                                                                const res = await apiClient.put<any>(`/matches/${selectedMatch.id}/half-duration?duration=${val}`);
                                                                setSelectedMatch(res.data?.body || res.data);
                                                                fetchMatches();
                                                                message.success(`Half duration updated to ${val} minutes.`);
                                                            } catch (err) {
                                                                message.error("Failed to update half duration.");
                                                            }
                                                        }
                                                    }} 
                                                />
                                                <Text type="secondary">mins</Text>
                                            </Space>
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>

                            <Card size="small" style={{ padding: '16px' }}>
                                <Title level={4}><TeamOutlined /> Squad Selection & Starting XI</Title>
                                <p style={{ color: '#8c8c8c' }}>Allocate players registered to the academy into the starting lineup team sheet before kickoff.</p>

                                <Transfer
                                    dataSource={players.filter(p => p.status === 'ACTIVE' || !p.status).map(p => ({ key: String(p.id), title: `${p.firstName} ${p.lastName}` }))}
                                    titles={['Available Squad', 'Starting XI']}
                                    targetKeys={lineupTargetKeys}
                                    onChange={(nextTargetKeys: React.Key[]) => {
                                        setLineupTargetKeys(nextTargetKeys.map(String));
                                    }}
                                    render={item => item.title}
                                    listStyle={{ width: '45%', height: 350 }}
                                />
                                <Button type="primary" block onClick={handleUpdateLineup} style={{ marginTop: '16px' }}>
                                    Save and Commit Starting XI Team Sheet
                                </Button>
                            </Card>
                        </div>
                    ) : (
                        <div>
                        {/* Live Score Display */}
                        <div style={{ textAlign: 'center', background: '#001529', color: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
                            <Title level={3} style={{ color: '#fff', margin: 0 }}>LIVE SCOREBOARD</Title>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '12px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#a0a0a0' }}>PFA ACADEMY</span>
                                    <span>{selectedMatch.homeTeamScore}</span>
                                    <Space size="small" style={{ marginTop: '8px' }}>
                                        <Button size="small" shape="circle" icon={<MinusOutlined />} onClick={() => handleModifyScore(Math.max(0, selectedMatch.homeTeamScore - 1), selectedMatch.awayTeamScore)} />
                                        <Button size="small" shape="circle" icon={<PlusOutlined />} onClick={() => handleModifyScore(selectedMatch.homeTeamScore + 1, selectedMatch.awayTeamScore)} />
                                    </Space>
                                </div>
                                <span>:</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#a0a0a0' }}>OPPONENT</span>
                                    <span>{selectedMatch.awayTeamScore}</span>
                                    <Space size="small" style={{ marginTop: '8px' }}>
                                        <Button size="small" shape="circle" icon={<MinusOutlined />} onClick={() => handleModifyScore(selectedMatch.homeTeamScore, Math.max(0, selectedMatch.awayTeamScore - 1))} />
                                        <Button size="small" shape="circle" icon={<PlusOutlined />} onClick={() => handleModifyScore(selectedMatch.homeTeamScore, selectedMatch.awayTeamScore + 1)} />
                                    </Space>
                                </div>
                            </div>
                            <Tag color="red" style={{ animation: 'blink 1s infinite', marginBottom: '8px' }}>MATCH IN PROGRESS</Tag>
                            <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                                <Badge status="processing" color="red" /> Live Time: {tickerTime}'
                            </div>
                        </div>

                        {/* Event Logging Context Inputs */}
                        <Row gutter={16}>
                            <Col span={12}>
                                <Card size="small" title={<span><TrophyOutlined style={{ color: '#fa8c16' }} /> Log Academy Goal Scored</span>} style={{ marginBottom: '16px' }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Scorer Player:</Text>
                                        <Select 
                                            placeholder="Choose scorer" 
                                            style={{ width: '100%' }}
                                            value={goalScorerId || undefined}
                                            onChange={setGoalScorerId}
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {Array.isArray(lineupPlayers) && lineupPlayers.map(p => (
                                                <Option key={p.id} value={p.id}>{p.firstName} {p.lastName}</Option>
                                            ))}
                                        </Select>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                                            <span>Own Goal?</span>
                                            <Select value={goalIsOwn ? 'yes' : 'no'} onChange={(val) => setGoalIsOwn(val === 'yes')} style={{ width: 80 }}>
                                                <Option value="no">No</Option>
                                                <Option value="yes">Yes</Option>
                                            </Select>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Minute:</span>
                                            <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={{ width: 80 }} />
                                        </div>
                                        <Button type="primary" block onClick={handleLogDetailedGoal} loading={submittingGoal} style={{ marginTop: '12px' }}>
                                            Commit Goal
                                        </Button>
                                    </Space>
                                </Card>
                            </Col>

                            <Col span={12}>
                                <Card size="small" title={<span><SwapOutlined style={{ color: '#1890ff' }} /> Log Player Substitution</span>} style={{ marginBottom: '16px' }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Outgoing Player (Off):</Text>
                                        <Select 
                                            placeholder="Select player leaving" 
                                            style={{ width: '100%' }}
                                            value={subPlayerOutId || undefined}
                                            onChange={setSubPlayerOutId}
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {Array.isArray(lineupPlayers) && lineupPlayers.length > 0 ? (
                                                lineupPlayers.map(p => (
                                                    <Option key={p.id} value={p.id}>#{p.jerseyNumber || '?'} {p.firstName} {p.lastName} (Starting XI)</Option>
                                                ))
                                            ) : (
                                                Array.isArray(players) && players.map(p => (
                                                    <Option key={p.id} value={p.id}>{p.firstName} {p.lastName}</Option>
                                                ))
                                            )}
                                        </Select>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Incoming Player (On):</Text>
                                        <Select 
                                            placeholder="Select player entering" 
                                            style={{ width: '100%' }}
                                            value={subPlayerInId || undefined}
                                            onChange={setSubPlayerInId}
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {Array.isArray(lineupPlayers) && lineupPlayers.length > 0 ? (
                                                players
                                                    .filter(p => !lineupPlayers.some(lp => lp.id === p.id))
                                                    .map(p => (
                                                        <Option key={p.id} value={p.id}>{p.firstName} {p.lastName}</Option>
                                                    ))
                                            ) : (
                                                Array.isArray(players) && players.map(p => (
                                                    <Option key={p.id} value={p.id}>{p.firstName} {p.lastName}</Option>
                                                ))
                                            )}
                                        </Select>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                            <span>Minute:</span>
                                            <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={{ width: 80 }} />
                                        </div>
                                        <Button type="primary" block onClick={handleLogSubstitution} loading={submittingSub} style={{ marginTop: '12px' }}>
                                            Commit Sub
                                        </Button>
                                    </Space>
                                </Card>
                            </Col>
                        </Row>

                        <Row gutter={16} style={{ marginTop: '8px' }}>
                            <Col span={24}>
                                <Card size="small" title={<span><Badge status="processing" /> Live Match Incident & Card Logger</span>} style={{ marginBottom: '16px' }}>
                                    <Row gutter={16} align="bottom">
                                        <Col span={6}>
                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Incident Type:</Text>
                                            <Select value={incidentType} onChange={setIncidentType} style={{ width: '100%' }}>
                                                <Option value="YELLOW_CARD">Yellow Card</Option>
                                                <Option value="RED_CARD">Red Card</Option>
                                                <Option value="CORNER">Corner Kick</Option>
                                                <Option value="FREEKICK">Freekick</Option>
                                            </Select>
                                        </Col>
                                        <Col span={6}>
                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Team:</Text>
                                            <Select value={incidentTeam} onChange={setIncidentTeam} style={{ width: '100%' }}>
                                                <Option value="HOME">PFA Academy</Option>
                                                <Option value="AWAY">Opponent</Option>
                                            </Select>
                                        </Col>
                                        <Col span={6}>
                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Player (PFA only):</Text>
                                            <Select 
                                                placeholder="Select player"
                                                style={{ width: '100%' }}
                                                value={incidentPlayerId || undefined}
                                                onChange={setIncidentPlayerId}
                                                disabled={incidentTeam === 'AWAY' || (incidentType !== 'YELLOW_CARD' && incidentType !== 'RED_CARD' && incidentType !== 'FREEKICK')}
                                                allowClear
                                                showSearch
                                                optionFilterProp="children"
                                            >
                                                {Array.isArray(players) && players.map(p => (
                                                    <Option key={p.id} value={p.id}>{p.firstName} {p.lastName}</Option>
                                                ))}
                                            </Select>
                                        </Col>
                                        <Col span={3}>
                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Minute:</Text>
                                            <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={{ width: '100%' }} />
                                        </Col>
                                        <Col span={3}>
                                            <Button type="primary" block onClick={handleLogIncident} loading={submittingIncident}>
                                                Log
                                            </Button>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={24}>
                                <Card size="small" title={<span><HistoryOutlined /> Live Fixture Event Timeline Stream Feed</span>} style={{ marginBottom: '24px' }}>
                                    {loadingTimeline ? (
                                        <div style={{ textAlign: 'center', padding: '12px' }}>Syncing events...</div>
                                    ) : (!Array.isArray(timelineEvents) || timelineEvents.length === 0) ? (
                                        <Text type="secondary" style={{ fontStyle: 'italic', display: 'block', textAlign: 'center', padding: '12px' }}>No events recorded for this match yet.</Text>
                                    ) : (
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                                            {Array.isArray(timelineEvents) && timelineEvents.map((evt, idx) => {
                                                const isConceded = evt.description === 'Goal Conceded';
                                                const isDisallowed = evt.description === 'Opponent Goal Disallowed';
                                                return (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                                                        <Tag color={evt.type === 'GOAL' ? 'orange' : evt.type === 'SUBSTITUTION' ? 'blue' : isConceded ? 'red' : isDisallowed ? 'volcano' : 'default'} style={{ minWidth: '45px', textAlign: 'center' }}>
                                                            {evt.matchTime}'
                                                        </Tag>
                                                        <span style={{ marginRight: '8px' }}>
                                                            {evt.type === 'GOAL' ? '⚽' : evt.type === 'SUBSTITUTION' ? '🔄' : isConceded ? '⚠️ ⚽' : isDisallowed ? '❌ ⚽' : 'ℹ️'}
                                                        </span>
                                                        <Text>{evt.description}</Text>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            </Col>
                        </Row>

                        <Divider />

                        {/* Starting Lineup Allocation */}
                        <Title level={4}><TeamOutlined /> Squad Selection & Starting XI</Title>
                        <p style={{ color: '#8c8c8c' }}>Allocate players registered to the academy into the matching lineup context tree.</p>

                        <Transfer
                            dataSource={players.filter(p => p.status === 'ACTIVE' || !p.status).map(p => ({ key: String(p.id), title: `${p.firstName} ${p.lastName}` }))}
                            titles={['Available Squad', 'Starting XI']}
                            targetKeys={lineupTargetKeys}
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
                    )
                )}
            </Drawer>

            {/* MODAL: MEDIA CENTER */}
            <Modal
                title={`Match Media Center — PFA vs ${selectedMatchForMedia?.opponentName}`}
                open={isMediaModalOpen}
                onCancel={() => {
                    setIsMediaModalOpen(false);
                    setSelectedMatchForMedia(null);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setIsMediaModalOpen(false);
                        setSelectedMatchForMedia(null);
                    }}>
                        Close Media Hub
                    </Button>
                ]}
                width={700}
                destroyOnClose
            >
                {selectedMatchForMedia && (
                    <div style={{ marginTop: '16px' }}>
                        <Title level={4}>Upload Match Media Assets</Title>
                        <Row gutter={16} style={{ marginBottom: '24px' }}>
                            <Col span={12}>
                                <div style={{ border: '1px dashed #d9d9d9', padding: '16px', borderRadius: '8px', textAlign: 'center', background: '#fafafa' }}>
                                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>Add Match Photo</Text>
                                    <Upload
                                        beforeUpload={(file) => {
                                            handleUploadMedia(file, 'photo');
                                            return false;
                                        }}
                                        showUploadList={false}
                                    >
                                        <Button icon={<UploadOutlined />} loading={uploadingMedia}>Upload Image</Button>
                                    </Upload>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ border: '1px dashed #d9d9d9', padding: '16px', borderRadius: '8px', textAlign: 'center', background: '#fafafa' }}>
                                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>Add Match Video</Text>
                                    <Upload
                                        beforeUpload={(file) => {
                                            handleUploadMedia(file, 'video');
                                            return false;
                                        }}
                                        showUploadList={false}
                                    >
                                        <Button icon={<UploadOutlined />} loading={uploadingMedia}>Upload Clip</Button>
                                    </Upload>
                                </div>
                            </Col>
                        </Row>

                        <Divider />

                        <Title level={4}>Photos ({selectedMatchForMedia.photoUrls?.length || 0})</Title>
                        {(!selectedMatchForMedia.photoUrls || selectedMatchForMedia.photoUrls.length === 0) ? (
                            <Text type="secondary" style={{ fontStyle: 'italic', display: 'block', marginBottom: '16px' }}>No match photographs uploaded yet.</Text>
                        ) : (
                            <Row gutter={[16, 16]} style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
                                {selectedMatchForMedia.photoUrls.map((url, idx) => (
                                    <Col span={6} key={idx}>
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt={`Match clip ${idx}`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #f0f0f0' }} />
                                        </a>
                                    </Col>
                                ))}
                            </Row>
                        )}

                        <Title level={4}>Videos ({selectedMatchForMedia.videoUrls?.length || 0})</Title>
                        {(!selectedMatchForMedia.videoUrls || selectedMatchForMedia.videoUrls.length === 0) ? (
                            <Text type="secondary" style={{ fontStyle: 'italic' }}>No video highlights or clips uploaded yet.</Text>
                        ) : (
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {selectedMatchForMedia.videoUrls.map((url, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <VideoCameraOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                                            Highlight Clip #{idx + 1}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* MODAL: COMPLETED MATCH DETAILS & GALLERY */}
            <Modal
                title={`Match Summary & Analytics: PFA vs ${selectedMatchForDetails?.opponentName}`}
                open={isDetailsModalOpen}
                onCancel={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedMatchForDetails(null);
                }}
                footer={[
                    <Button key="close" type="primary" onClick={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedMatchForDetails(null);
                    }}>
                        Close Details
                    </Button>
                ]}
                width={800}
                destroyOnClose
            >
                {selectedMatchForDetails && (
                    <Spin spinning={loadingDetails}>
                        <div style={{ marginTop: '16px' }}>
                            {/* Scoreboard banner */}
                            <div style={{ textAlign: 'center', background: '#001529', color: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                                <Title level={4} style={{ color: '#fff', margin: 0 }}>MATCH CONCLUDED</Title>
                                <div style={{ fontSize: '30px', fontWeight: 'bold', margin: '8px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                                    <span>{selectedMatchForDetails.isHomeMatch ? 'PFA Academy' : selectedMatchForDetails.opponentName}</span>
                                    <span style={{ background: '#ff4d4f', padding: '4px 12px', borderRadius: '6px' }}>
                                        {selectedMatchForDetails.homeTeamScore} - {selectedMatchForDetails.awayTeamScore}
                                    </span>
                                    <span>{selectedMatchForDetails.isHomeMatch ? selectedMatchForDetails.opponentName : 'PFA Academy'}</span>
                                </div>
                                <Space size="middle" style={{ fontSize: '13px', color: '#a0a0a0' }}>
                                    <span><CalendarOutlined /> {selectedMatchForDetails.date} @ {selectedMatchForDetails.time}</span>
                                    <span><EnvironmentOutlined /> {selectedMatchForDetails.venue}</span>
                                    <span><TrophyOutlined /> {selectedMatchForDetails.type} Match</span>
                                </Space>
                            </div>

                            <Row gutter={[24, 24]}>
                                {/* Starting XI */}
                                <Col xs={24} md={12}>
                                    <Card title={<span><TeamOutlined style={{ color: '#1890ff' }} /> Starting Lineup XI</span>} bordered className="match-detail-card" style={{ height: '100%' }}>
                                        {detailLineup.length === 0 ? (
                                            <Text type="secondary" style={{ fontStyle: 'italic' }}>No lineup submitted for this match.</Text>
                                        ) : (
                                            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                {detailLineup.map((player) => (
                                                    <div key={player.id} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text strong>#{player.jerseyNumber || '-'} {player.firstName} {player.lastName}</Text>
                                                        <Tag color="blue">Starter</Tag>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                </Col>

                                {/* Match Timeline */}
                                <Col xs={24} md={12}>
                                    <Card title={<span><HistoryOutlined style={{ color: '#fa8c16' }} /> Match Timeline Events</span>} bordered className="match-detail-card" style={{ height: '100%' }}>
                                        {detailTimeline.length === 0 ? (
                                            <Text type="secondary" style={{ fontStyle: 'italic' }}>No timeline events recorded.</Text>
                                        ) : (
                                            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {detailTimeline.map((evt: any, index: number) => {
                                                    const isConceded = evt.description === 'Goal Conceded';
                                                    const isDisallowed = evt.description === 'Opponent Goal Disallowed';
                                                    return (
                                                        <div key={index} style={{ padding: '8px', borderRadius: '4px', background: '#fafafa', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                            <span style={{ fontWeight: 'bold', minWidth: '40px', color: '#1890ff' }}>{evt.matchTime}'</span>
                                                            <span style={{ fontSize: '16px' }}>
                                                                {evt.type === 'GOAL' ? '⚽' : evt.type === 'SUBSTITUTION' ? '🔄' : isConceded ? '⚠️ ⚽' : isDisallowed ? '❌ ⚽' : 'ℹ️'}
                                                            </span>
                                                            <Text style={{ fontSize: '13px' }}>{evt.description}</Text>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '24px 0' }} />

                            {/* Media Assets Section */}
                            <Title level={4}><VideoCameraOutlined style={{ color: '#eb2f96' }} /> Media & Gallery Assets</Title>
                            
                            <Row gutter={[16, 16]} style={{ marginTop: '12px' }}>
                                <Col xs={24} md={12}>
                                    <Card type="inner" title={`Photos (${selectedMatchForDetails.photoUrls?.length || 0})`}>
                                        {(!selectedMatchForDetails.photoUrls || selectedMatchForDetails.photoUrls.length === 0) ? (
                                            <Text type="secondary" style={{ fontStyle: 'italic' }}>No match photographs uploaded.</Text>
                                        ) : (
                                            <Row gutter={[8, 8]} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {selectedMatchForDetails.photoUrls.map((url, idx) => (
                                                    <Col span={8} key={idx}>
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                            <img src={url} alt={`Match Photo ${idx}`} style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #f0f0f0' }} />
                                                        </a>
                                                    </Col>
                                                ))}
                                            </Row>
                                        )}
                                    </Card>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Card type="inner" title={`Videos (${selectedMatchForDetails.videoUrls?.length || 0})`}>
                                        {(!selectedMatchForDetails.videoUrls || selectedMatchForDetails.videoUrls.length === 0) ? (
                                            <Text type="secondary" style={{ fontStyle: 'italic' }}>No match video clips uploaded.</Text>
                                        ) : (
                                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {selectedMatchForDetails.videoUrls.map((url, idx) => (
                                                    <div key={idx} style={{ padding: '6px 12px', background: '#fafafa', borderRadius: '4px', display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                                                        <Text ellipsis style={{ maxWidth: '60%', fontSize: '12px' }}>Clip #{idx + 1}</Text>
                                                        <Button size="small" type="link" href={url} target="_blank" rel="noopener noreferrer" icon={<VideoCameraOutlined />}>
                                                            Watch
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </Spin>
                )}
            </Modal>
        </div>
    );
};