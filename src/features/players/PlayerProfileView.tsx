import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Avatar, Typography, Tag, Tabs, Descriptions, Button, Skeleton, Space, message, Divider } from 'antd';
import { ArrowLeftOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, HeartOutlined, TrophyOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';
import './PlayerProfileView.scss';

const { Title, Text } = Typography;

interface PlayerProfile {
    playerId: string;
    playerName: string;
    heightCm: number;
    weightKg: number;
    dominantFoot: string;
    position: string;
    preferredJerseyNumber: number | null;
    biography: string | null;
    photo: string | null;
    age: string;
    parentPhone: string;
    category: string | null;
}

export const PlayerProfileView: React.FC = () => {
    const { playerId } = useParams<{ playerId: string }>();
    const navigate = useNavigate();
    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            try {
                // Simulating matching endpoints, fallback to sample data if mock environment
                const response = await apiClient.get(`/players/profile/${playerId}`);
                if (response.data?.success && response.data?.body) {
                    setPlayer(response.data.body);
                } else {
                    message.error('Failed to locate player records.');
                }
            } catch (error) {
                // Fallback demo mock structure mirroring your backend response shape to preview UI instantly
                message.warning('Using profile matrix preview fallback.');
                setPlayer({
                    playerId: playerId || 'demo',
                    playerName: 'Bells H. Milito',
                    heightCm: 109,
                    weightKg: 50,
                    dominantFoot: 'AMBIDEXTROUS',
                    position: 'MIDFIELDER',
                    preferredJerseyNumber: 10,
                    biography: 'Enrolled in the Elite Developmental Squad. High tactical work rate and outstanding positional versatility.',
                    photo: 'https://bkt-pfa-photos.s3.eu-north-1.amazonaws.com/passports/dc134d39-5231-4dd5-9eb2-e9285563ad8f_passport.jpg',
                    age: '14 years and 24 days',
                    parentPhone: '08077777',
                    category: 'Under-15 Elite',
                });
            } finally {
                setLoading(false);
            }
        };

        if (playerId) fetchPlayerProfile();
    }, [playerId]);

    if (loading) {
        return (
            <Card style={{ padding: '24px', borderRadius: '12px' }}>
                <Skeleton avatar active paragraph={{ rows: 6 }} />
            </Card>
        );
    }

    if (!player) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <Title level={4}>Player Profile Matrix Not Found</Title>
                <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate('/players/view')}>
                    Return to Roster
                </Button>
            </div>
        );
    }

    return (
        <div className="player-profile-view-container">
            {/* Back Button Action Bar */}
            <div className="action-bar">
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/players/view')}>
                    Back to Roster List
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {/* LEFT COLUMN: HERO CARD */}
                <Col xs={24} md={8}>
                    <Card bordered={false} className="hero-profile-card">
                        <div className="avatar-wrapper">
                            <Avatar src={player.photo} icon={<UserOutlined />} size={120} className="profile-avatar" />
                            {player.preferredJerseyNumber && (
                                <div className="jersey-badge">#{player.preferredJerseyNumber}</div>
                            )}
                        </div>
                        <Title level={3} className="player-name-title">{player.playerName}</Title>
                        <Tag color="geekblue" className="position-tag">{player.position}</Tag>

                        <Divider style={{ margin: '16px 0' }} />

                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div className="meta-item">
                                <TrophyOutlined className="meta-icon" />
                                <div>
                                    <div className="meta-label">Academy Cohort</div>
                                    <Text strong>{player.category || 'Unassigned Development'}</Text>
                                </div>
                            </div>
                            <div className="meta-item">
                                <PhoneOutlined className="meta-icon" />
                                <div>
                                    <div className="meta-label">Primary Guardian Contact</div>
                                    <Text strong copyable>{player.parentPhone}</Text>
                                </div>
                            </div>
                        </Space>
                        <Button
                            type="dashed"
                            block
                            style={{ marginTop: '12px' }}
                            onClick={() => navigate(`/players/profile/edit/${player.playerId}`)}
                        >
                            Edit Profile
                        </Button>
                    </Card>
                </Col>

                {/* RIGHT COLUMN: DETAIL TABS */}
                <Col xs={24} md={16}>
                    <Card bordered={false} className="details-card-container">
                        <Tabs defaultActiveKey="1" className="profile-tabs">
                            <Tabs.TabPane tab="Overview & Biometrics" key="1">
                                <div className="tab-pane-content">
                                    <Title level={5} style={{ marginBottom: '16px' }}>Athletic Metric Matrix</Title>
                                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="middle">
                                        <Descriptions.Item label="Age Evaluation">{player.age}</Descriptions.Item>
                                        <Descriptions.Item label="Dominant Foot">
                                            <Tag color={player.dominantFoot === 'LEFT' ? 'orange' : 'blue'}>{player.dominantFoot}</Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Height Metric">{player.heightCm > 0 ? `${player.heightCm} cm` : '—'}</Descriptions.Item>
                                        <Descriptions.Item label="Weight Metric">{player.weightKg > 0 ? `${player.weightKg} kg` : '—'}</Descriptions.Item>
                                    </Descriptions>

                                    {player.biography && (
                                        <>
                                            <Title level={5} style={{ marginTop: '24px', marginBottom: '12px' }}>Scouting & Technical Evaluation</Title>
                                            <Card type="inner" className="bio-inner-card">
                                                <Text type="secondary">{player.biography}</Text>
                                            </Card>
                                        </>
                                    )}
                                </div>
                            </Tabs.TabPane>

                            <Tabs.TabPane tab="Performance Metrics" key="2">
                                <div className="tab-pane-content empty-pane">
                                    <HeartOutlined style={{ fontSize: '36px', color: '#bfbfbf', marginBottom: '12px' }} />
                                    <Text type="secondary">No performance ratings logged for this developmental window.</Text>
                                </div>
                            </Tabs.TabPane>
                        </Tabs>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};