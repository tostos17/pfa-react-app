import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../config/axios';
import type { AuthUser } from '../../types/auth';

const { Title, Text } = Typography;

export const ChangePasswordView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(false);
    setErrorMessage(null);
    setLoading(true);

    try {
      // Hits your Spring Boot change-password endpoint
      await apiClient.post('/auth/force-change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      // 1. Retrieve current user cached in localStorage
      const userRaw = localStorage.getItem('pfa_user');
      if (userRaw) {
        const user: AuthUser = JSON.parse(userRaw);
        
        // 2. Flip the indicator since password update was successful
        user.requirePasswordChange = false;
        localStorage.setItem('pfa_user', JSON.stringify(user));
      }

      message.success('Password updated successfully! Welcome to the academy.');
      
      // 3. Release them into the main dashboard viewport
      navigate('/dashboard');
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Failed to update password. Please check your temporary password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 450, 
          borderRadius: 12, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ marginBottom: 28 }}>
          <Title level={3} style={{ margin: '0 0 8px 0', color: '#1d2129', fontWeight: 600 }}>
            Secure Your Account
          </Title>
          <Text type="secondary">
            This is your first time logging in. Please update your temporary password to continue.
          </Text>
        </div>

        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            style={{ marginBottom: 24, borderRadius: 6 }}
          />
        )}

        <Form
          name="change_password_form"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            label="Temporary Password"
            name="oldPassword"
            rules={[{ required: true, message: 'Please enter your current temporary password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Enter temporary password"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter your new password!' },
              { min: 8, message: 'Password must be at least 8 characters long!' }
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Min 8 characters"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your new password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Repeat new password"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              style={{ 
                borderRadius: 6, 
                height: 45, 
                fontWeight: 600
              }}
            >
              Update Password & Continue
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};