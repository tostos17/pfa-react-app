import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Steps, Form, Input, Select, Button, Typography, Alert, Result, Spin, message
} from 'antd';
import { KeyOutlined, UserAddOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { extractBackendError } from '../../config/errorExtractor';
import './ParentOnboarding.scss';

const { Title, Text } = Typography;
const { Step } = Steps;

// Plain axios instance — does NOT inject the pfa_token from localStorage
const publicApi = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
});

export const ParentOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [verifyForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [verifiedPhone, setVerifiedPhone] = useState<string>('');
  const [complete, setComplete] = useState(false);
  const [healthyValue, setHealthyValue] = useState<string>('true');

  /* ── STEP 1: Verify access key ─────────────────────────────── */
  const handleVerify = async (values: { phone: string; accessKey: string }) => {
    setVerifying(true);
    try {
      const res = await publicApi.post('/onboarding/parent/verify-key', {
        phone: values.phone.trim(),
        accessKey: values.accessKey.trim().toUpperCase(),
      });
      const token = res.data?.body?.verificationToken;
      if (!token) throw new Error('Verification failed — no token returned.');
      setVerificationToken(token);
      setVerifiedPhone(values.phone.trim());
      setCurrentStep(1);
      message.success('Identity verified! Please complete your registration.');
    } catch (err) {
      const e = extractBackendError(err);
      message.error(e.message);
    } finally {
      setVerifying(false);
    }
  };

  /* ── STEP 2: Complete registration ─────────────────────────── */
  const handleRegister = async (values: any) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match.');
      return;
    }
    setRegistering(true);
    try {
      const { confirmPassword: _c, ...payload } = values;
      await publicApi.post('/onboarding/parent/register', payload, {
        headers: { Authorization: `Bearer ${verificationToken}` },
      });
      setComplete(true);
    } catch (err) {
      const e = extractBackendError(err);
      message.error(e.message);
    } finally {
      setRegistering(false);
    }
  };

  /* ── Success screen ─────────────────────────────────────────── */
  if (complete) {
    return (
      <div className="onboarding-page-wrapper">
        <div className="onboarding-card">
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title={<span style={{ color: '#fff' }}>Registration Complete!</span>}
            subTitle={
              <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                Your account has been created. You can now log in with your chosen credentials and access your parent dashboard.
              </Text>
            }
            extra={
              <Button type="primary" size="large" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            }
            style={{ background: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page-wrapper">
      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-logo">
          <h2>Parent / Guardian Registration</h2>
          <p>Academy Parent Onboarding Portal</p>
        </div>

        {/* Step indicator */}
        <div className="onboarding-step-indicator">
          <Steps current={currentStep} size="small">
            <Step title="Verify Identity" icon={<KeyOutlined />} />
            <Step title="Complete Registration" icon={<UserAddOutlined />} />
          </Steps>
        </div>

        {/* ── STEP 1 ── */}
        {currentStep === 0 && (
          <>
            <Alert
              message="Enter the phone number you provided to the director and the access key they gave you."
              type="info"
              showIcon
              style={{ marginBottom: 24, background: 'rgba(24,144,255,0.1)', border: '1px solid rgba(24,144,255,0.3)', color: '#fff' }}
            />
            <Spin spinning={verifying}>
              <Form form={verifyForm} layout="vertical" onFinish={handleVerify} size="large">
                <Form.Item
                  name="phone"
                  label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Phone Number</Text>}
                  rules={[{ required: true, message: 'Please enter your phone number.' }]}
                >
                  <Input placeholder="e.g. 08012345678" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
                </Form.Item>
                <Form.Item
                  name="accessKey"
                  label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Access Key</Text>}
                  rules={[{ required: true, message: 'Please enter the access key provided by the director.' }]}
                >
                  <Input
                    placeholder="e.g. A3X9KZMQWT2R"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" icon={<KeyOutlined />} loading={verifying}>
                    Verify Access Key
                  </Button>
                </Form.Item>
              </Form>
            </Spin>
          </>
        )}

        {/* ── STEP 2 ── */}
        {currentStep === 1 && (
          <Spin spinning={registering}>
            <Alert
              message={`Verified for phone: ${verifiedPhone}. Please complete your profile below.`}
              type="success"
              showIcon
              style={{ marginBottom: 20, background: 'rgba(82,196,26,0.1)', border: '1px solid rgba(82,196,26,0.3)' }}
            />
            <Form form={registerForm} layout="vertical" onFinish={handleRegister} size="large">
              <Form.Item name="title" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Title (Optional)</Text>}>
                <Select placeholder="Select title" allowClear style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="firstName" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>First Name</Text>} rules={[{ required: true }]}>
                <Input placeholder="First Name" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="lastName" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Last Name</Text>} rules={[{ required: true }]}>
                <Input placeholder="Last Name" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="relationship" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Relationship to Player</Text>} rules={[{ required: true }]}>
                <Select placeholder="Select relationship">
                  {['Father', 'Mother', 'Guardian', 'Step-Father', 'Step-Mother', 'Uncle', 'Aunt', 'Other'].map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="email" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Email Address</Text>} rules={[{ required: true }, { type: 'email' }]}>
                <Input placeholder="guardian@email.com" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="address" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Residential Address</Text>} rules={[{ required: true }]}>
                <Input.TextArea rows={2} placeholder="Full home address" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="occupation" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Occupation</Text>} rules={[{ required: true }]}>
                <Input placeholder="e.g. Engineer, Teacher..." style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="username" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Username</Text>} rules={[{ required: true }, { min: 4, message: 'Username must be at least 4 characters.' }]}>
                <Input placeholder="Choose a unique username" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="password" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Password</Text>} rules={[{ required: true }, { min: 8, message: 'Password must be at least 8 characters.' }]}>
                <Input.Password placeholder="Choose a strong password" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item name="confirmPassword" label={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Confirm Password</Text>} rules={[{ required: true, message: 'Please confirm your password.' }]}>
                <Input.Password placeholder="Repeat your password" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block size="large" icon={<UserAddOutlined />} loading={registering}>
                  Complete Registration
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        )}
      </div>
    </div>
  );
};
