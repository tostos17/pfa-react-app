import React from 'react';
import { Modal, Descriptions, Tag, Typography, Button, Space, Avatar, Divider } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, TrophyOutlined, IdcardOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface StaffDetailsModalProps {
    open: boolean;
    onClose: () => void;
    staff: any | null;
    onEdit?: (staff: any) => void;
}

export const StaffDetailsModal: React.FC<StaffDetailsModalProps> = ({
    open,
    onClose,
    staff,
    onEdit
}) => {
    if (!staff) return null;

    const roleColor = staff.role === 'DIRECTOR' ? 'gold' : staff.role === 'COACH' ? 'blue' : 'purple';

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>Close</Button>,
                onEdit ? (
                    <Button key="edit" type="primary" onClick={() => { onClose(); onEdit(staff); }}>
                        Edit Staff Profile
                    </Button>
                ) : null
            ]}
            width={620}
            destroyOnClose
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <Avatar
                    size={64}
                    style={{
                        backgroundColor: staff.role === 'DIRECTOR' ? '#d97706' : staff.role === 'COACH' ? '#2563eb' : '#7c3aed',
                        fontSize: 24,
                        fontWeight: 600
                    }}
                >
                    {staff.firstName?.[0]}{staff.lastName?.[0]}
                </Avatar>
                <div>
                    <Title level={4} style={{ margin: 0 }}>{staff.firstName} {staff.lastName}</Title>
                    <Space size={8} style={{ marginTop: 4 }}>
                        <Tag color={roleColor}>{staff.role}</Tag>
                        <Tag color="geekblue">{staff.employeeId}</Tag>
                        {staff.enabled ? (
                            <Tag color="green" icon={<CheckCircleOutlined />}>Active Account</Tag>
                        ) : (
                            <Tag color="red" icon={<CloseCircleOutlined />}>Deactivated</Tag>
                        )}
                    </Space>
                </div>
            </div>

            <Divider style={{ margin: '12px 0 20px 0' }} />

            <Descriptions title="Account & Contact Information" bordered size="small" column={1}>
                <Descriptions.Item label="System Username">
                    <Text copyable>{staff.username}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Official Email">
                    <Space>
                        <MailOutlined style={{ color: '#2563eb' }} />
                        <Text>{staff.email || 'None'}</Text>
                    </Space>
                </Descriptions.Item>
                {staff.phone && (
                    <Descriptions.Item label="Phone Number">
                        <Space>
                            <PhoneOutlined style={{ color: '#16a34a' }} />
                            <Text>{staff.phone}</Text>
                        </Space>
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="Employee ID">
                    <Text strong>{staff.employeeId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Password Status">
                    {staff.requirePasswordChange ? (
                        <Tag color="orange">Temporary Password (Change Required)</Tag>
                    ) : (
                        <Tag color="blue">Standard Configured</Tag>
                    )}
                </Descriptions.Item>
            </Descriptions>

            {staff.role === 'COACH' && (
                <>
                    <Divider style={{ margin: '20px 0 16px 0' }} />
                    <Descriptions title="Coaching Credentials & Qualifications" bordered size="small" column={1}>
                        <Descriptions.Item label="Coaching Specialization">
                            <Tag color="cyan">{staff.specialization || 'General Technical Staff'}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="License Certification">
                            <Space>
                                <TrophyOutlined style={{ color: '#d97706' }} />
                                <Text strong>{staff.licenseLevel || 'Standard Academy Diploma'}</Text>
                            </Space>
                        </Descriptions.Item>
                    </Descriptions>
                </>
            )}
        </Modal>
    );
};
