import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Button, Radio, Select, Space, Row, Col, Alert, message, Divider } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, TrophyOutlined, IdcardOutlined, LockOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';

interface StaffFormDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any | null;
}

const COACH_SPECIALIZATIONS = [
    'Head Coach',
    'Assistant Coach',
    'Goalkeeping Coach',
    'Fitness & Conditioning Coach',
    'Tactical Analyst',
    'Youth Academy Coach',
    'Set-Piece Specialist',
    'Physiotherapist'
];

const COACH_LICENSES = [
    'UEFA Pro License',
    'UEFA A License',
    'UEFA B License',
    'CAF Pro License',
    'CAF A License',
    'CAF B License',
    'CAF C License',
    'FA National Diploma',
    'Grassroots Coaching Certificate'
];

export const StaffFormDrawer: React.FC<StaffFormDrawerProps> = ({
    open,
    onClose,
    onSuccess,
    initialData
}) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [staffRole, setStaffRole] = useState<'COACH' | 'DIRECTOR'>('COACH');

    const isEdit = Boolean(initialData);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setStaffRole(initialData.role || 'COACH');
                form.setFieldsValue({
                    role: initialData.role || 'COACH',
                    firstName: initialData.firstName,
                    lastName: initialData.lastName,
                    username: initialData.username,
                    email: initialData.email,
                    phone: initialData.phone,
                    employeeId: initialData.employeeId,
                    specialization: initialData.specialization,
                    licenseLevel: initialData.licenseLevel,
                    enabled: initialData.enabled !== undefined ? initialData.enabled : true
                });
            } else {
                setStaffRole('COACH');
                form.resetFields();
                form.setFieldsValue({
                    role: 'COACH',
                    enabled: true
                });
            }
        }
    }, [open, initialData, form]);

    const handleRoleChange = (e: any) => {
        setStaffRole(e.target.value);
    };

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            if (isEdit) {
                await apiClient.put(`/admin/staff/${initialData.id}`, values);
                message.success(`Staff profile for ${values.firstName} ${values.lastName} updated successfully.`);
            } else {
                if (staffRole === 'COACH') {
                    const payload = {
                        username: values.username,
                        firstName: values.firstName,
                        lastName: values.lastName,
                        email: values.email,
                        phone: values.phone,
                        specialization: values.specialization,
                        licenseLevel: values.licenseLevel,
                        employeeId: values.employeeId || undefined,
                        password: values.password || undefined
                    };
                    try {
                        await apiClient.post('/admin/staff/coach', payload);
                    } catch (errPost: any) {
                        if (errPost?.response?.status === 404) {
                            await apiClient.post('/auth/register/coach', payload);
                        } else {
                            throw errPost;
                        }
                    }
                    message.success(`Coach profile for ${values.firstName} ${values.lastName} created successfully.`);
                } else {
                    const payload = {
                        username: values.username,
                        firstName: values.firstName,
                        lastName: values.lastName,
                        email: values.email,
                        employeeId: values.employeeId || undefined,
                        password: values.password || undefined
                    };
                    try {
                        await apiClient.post('/admin/staff/director', payload);
                    } catch (errPost: any) {
                        if (errPost?.response?.status === 404) {
                            await apiClient.post('/auth/register/director', payload);
                        } else {
                            throw errPost;
                        }
                    }
                    message.success(`Director profile for ${values.firstName} ${values.lastName} created successfully.`);
                }
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || err?.message || 'Operation failed. Please verify the input.';
            message.error(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Drawer
            title={isEdit ? `Edit Staff Member: ${initialData?.firstName} ${initialData?.lastName}` : 'Register New Academy Staff'}
            width={580}
            open={open}
            onClose={onClose}
            destroyOnClose
            footer={
                <div style={{ textAlign: 'right', padding: '8px 0' }}>
                    <Space>
                        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={submitting}>
                            {isEdit ? 'Save Changes' : 'Create Staff Member'}
                        </Button>
                    </Space>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {!isEdit ? (
                    <Form.Item name="role" label="Staff Position / Role" rules={[{ required: true }]}>
                        <Radio.Group onChange={handleRoleChange} value={staffRole} buttonStyle="solid" style={{ width: '100%' }}>
                            <Radio.Button value="COACH" style={{ width: '50%', textAlign: 'center' }}>
                                ⚽ Academy Coach
                            </Radio.Button>
                            <Radio.Button value="DIRECTOR" style={{ width: '50%', textAlign: 'center' }}>
                                👔 Executive Director
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                ) : (
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Staff Role: </span>
                        <strong>{initialData?.role}</strong> ({initialData?.employeeId})
                    </div>
                )}

                <Divider orientation="left" style={{ margin: '14px 0', fontSize: 13, color: '#4b5563' }}>Personal & Identity</Divider>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="firstName"
                            label="First Name"
                            rules={[{ required: true, message: 'First name is required' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="e.g. Samuel" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="lastName"
                            label="Last Name"
                            rules={[{ required: true, message: 'Last name is required' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="e.g. Adebayo" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="username"
                            label="System Username"
                            rules={[{ required: true, message: 'Username is required' }]}
                        >
                            <Input prefix={<IdcardOutlined />} placeholder="e.g. sadebayo" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="email"
                            label="Official Email Address"
                            rules={[
                                { required: true, message: 'Email is required' },
                                { type: 'email', message: 'Enter a valid email address' }
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="e.g. coach.adebayo@pfa.com" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="phone"
                            label={staffRole === 'COACH' ? 'Contact Phone' : 'Contact Phone (Optional)'}
                            rules={staffRole === 'COACH' ? [{ required: true, message: 'Phone number is required' }] : []}
                        >
                            <Input prefix={<PhoneOutlined />} placeholder="e.g. +234 801 234 5678" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="employeeId"
                            label="Employee ID (Optional)"
                            tooltip="Leave blank to automatically generate based on sequence"
                        >
                            <Input placeholder={`Auto-generated (e.g. ${staffRole === 'COACH' ? 'COA' : 'DIR'}-2026-0001)`} />
                        </Form.Item>
                    </Col>
                </Row>

                {staffRole === 'COACH' && (
                    <>
                        <Divider orientation="left" style={{ margin: '14px 0', fontSize: 13, color: '#4b5563' }}>Technical Qualifications</Divider>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="specialization"
                                    label="Coaching Specialization"
                                    rules={[{ required: true, message: 'Specialization is required' }]}
                                >
                                    <Select placeholder="Select specialization" showSearch allowClear>
                                        {COACH_SPECIALIZATIONS.map(spec => (
                                            <Select.Option key={spec} value={spec}>{spec}</Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="licenseLevel"
                                    label="Coaching License Level"
                                    rules={[{ required: true, message: 'License level is required' }]}
                                >
                                    <Select placeholder="Select license level" showSearch allowClear>
                                        {COACH_LICENSES.map(lic => (
                                            <Select.Option key={lic} value={lic}>{lic}</Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </>
                )}

                {!isEdit && (
                    <>
                        <Divider orientation="left" style={{ margin: '14px 0', fontSize: 13, color: '#4b5563' }}>Security & Credentials</Divider>

                        <Form.Item
                            name="password"
                            label="Initial Password (Optional)"
                            tooltip="If omitted, the default temporary password 'Access123' will be assigned."
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Default: Access123" />
                        </Form.Item>

                        <Alert
                            message="Default Access Protocol"
                            description="Newly provisioned staff accounts receive the initial credentials. Upon their initial sign-in, the system will prompt them to set their personal secure password."
                            type="info"
                            showIcon
                            style={{ marginTop: 8 }}
                        />
                    </>
                )}
            </Form>
        </Drawer>
    );
};
