import React, { useState, useEffect } from 'react';
import { Card, Avatar, Tag, Row, Col, Typography, Spin, Timeline, Calendar, Alert, Descriptions, Empty } from 'antd';
import { UserOutlined, CalendarOutlined, TrophyOutlined, InfoCircleOutlined, DashboardOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';
import { LogoutButton } from '../auth/LogoutButton';
import './PlayerDashboard.scss';

const { Title, Text, Paragraph } = Typography;

export const PlayerDashboard: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await apiClient.get('/portal/player/dashboard');
                setData(res.data?.body || res.data);
            } catch (err) {
                console.error("Failed to retrieve player portal analytics.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Synchronizing athlete metrics..." />
            </div>
        );
    }

    if (!data || !data.player) {
        return (
            <div style={{ padding: '24px' }}>
                <Alert type="error" message="Profile error" description="Unable to load athlete profile information." showIcon />
            </div>
        );
    }

    const { player, upcomingTrainings, upcomingMatches } = data;
    const profile = player.profile || {};

    return (
        <div className="player-portal-dashboard-wrapper">
            {/* Header profile banner */}
            <div className="portal-header-banner">
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} sm={6} md={4} style={{ textAlign: 'center' }}>
                        <Avatar src={player.passportUrl} icon={<UserOutlined />} size={110} className="portal-avatar" />
                    </Col>
                    <Col xs={24} sm={18} md={20}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div>
                                <div className="athlete-name-badge-row">
                                    <Title level={2} style={{ color: '#fff', margin: 0 }}>
                                        {player.firstName} {player.lastName}
                                    </Title>
                                    <Tag color={player.status === 'ACTIVE' ? 'green' : 'orange'} className="portal-status-tag">
                                        {player.status || 'ACTIVE'}
                                    </Tag>
                                </div>
                                <Text style={{ color: '#a0a0a0', fontSize: '15px', display: 'block', marginTop: '6px' }}>
                                    PFA Squad Member • {profile.category || 'General'} Squad
                                </Text>
                            </div>
                            <LogoutButton className="portal-logout-btn" danger={false} />
                        </div>
                    </Col>
                </Row>
            </div>

            <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
                {/* Left Column: Biometrics and Profile Info */}
                <Col xs={24} lg={10}>
                    <Card title={<span><DashboardOutlined /> Athlete Biometrics & Credentials</span>} className="portal-premium-card">
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Squad Number">
                                <Tag color="black" style={{ fontWeight: 'bold' }}>#{profile.preferredJerseyNumber || '—'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Primary Position">
                                <Tag color="blue">{profile.position || 'UNASSIGNED'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Dominant Foot">
                                {profile.dominantFoot || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Height">
                                {profile.heightCm ? `${profile.heightCm} cm` : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Weight">
                                {profile.weightKg ? `${profile.weightKg} kg` : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Date of Birth">
                                {player.dateOfBirth}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phone Roster">
                                {player.phone || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Missed Trainings">
                                <Tag color={data.missedTrainingsCount > 0 ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
                                    {data.missedTrainingsCount || 0}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <div style={{ marginTop: '20px' }}>
                            <Title level={5}>Short Biography</Title>
                            <Paragraph type="secondary">
                                {profile.biography || "No biography details shared on this profile yet."}
                            </Paragraph>
                        </div>
                    </Card>
                </Col>

                {/* Right Column: Training & Match Schedules */}
                <Col xs={24} lg={14}>
                    {/* Training Schedule */}
                    <Card title={<span><CalendarOutlined style={{ color: '#1890ff' }} /> Upcoming Training Sessions</span>} className="portal-premium-card" style={{ marginBottom: '24px' }}>
                        {upcomingTrainings.length === 0 ? (
                            <Empty description="No training sessions scheduled at this time." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <Timeline mode="left">
                                {upcomingTrainings.map((t: any) => (
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

                    {/* Match Fixtures */}
                    <Card title={<span><TrophyOutlined style={{ color: '#fa8c16' }} /> Match Fixtures</span>} className="portal-premium-card">
                        {upcomingMatches.length === 0 ? (
                            <Empty description="No upcoming match fixtures." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <Timeline mode="left">
                                {upcomingMatches.map((m: any) => (
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
        </div>
    );
};
