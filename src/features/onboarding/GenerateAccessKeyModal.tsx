import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography, Alert, Space, Divider, message } from 'antd';
import { KeyOutlined, CopyOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';
import './ParentOnboarding.scss';

const { Text } = Typography;

interface GenerateAccessKeyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GenerateAccessKeyModal: React.FC<GenerateAccessKeyModalProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ phone: string; accessKey: string; expiresAt: string } | null>(null);

  const handleGenerate = async (values: { phone: string }) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/onboarding/parent/generate-key', { phone: values.phone.trim() });
      const data = res.data?.body;
      setResult(data);
    } catch (err) {
      const e = extractBackendError(err);
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setResult(null);
    onClose();
  };

  const formatExpiry = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined style={{ color: '#722ed1' }} />
          <span>Generate Parent Access Key</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={480}
      destroyOnClose
    >
      {!result ? (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
            Enter the parent's phone number. The system will generate a one-time access key that expires in 30 days.
          </Text>
          <Form form={form} layout="vertical" onFinish={handleGenerate} size="large">
            <Form.Item
              name="phone"
              label="Parent / Guardian Phone Number"
              rules={[
                { required: true, message: 'Phone number is required.' },
                { pattern: /^\+?[0-9]{7,15}$/, message: 'Enter a valid phone number.' }
              ]}
            >
              <Input placeholder="e.g. 08012345678" prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block icon={<KeyOutlined />} loading={loading}>
                Generate Access Key
              </Button>
            </Form.Item>
          </Form>
        </>
      ) : (
        <>
          <Alert
            message="Access key generated successfully"
            description="Share both the phone number and access key with the parent/guardian securely."
            type="success"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <div className="access-key-display">
            <div className="phone-display">Phone: <strong>{result.phone}</strong></div>
            <div className="key-label">Access Key</div>
            <Text
              className="key-value"
              copyable={{ icon: [<CopyOutlined key="copy" />, <CopyOutlined key="copied" />], tooltips: ['Copy key', 'Copied!'] }}
              style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#722ed1', display: 'block' }}
            >
              {result.accessKey}
            </Text>
            <div className="key-expiry">Expires: {formatExpiry(result.expiresAt)}</div>
          </div>
          <Alert
            message="The parent will need to visit the onboarding page at /onboarding/parent and enter their phone number plus this key to complete registration."
            type="info"
            showIcon
            style={{ marginTop: 16, marginBottom: 20 }}
          />
          <Divider />
          <Button type="primary" block onClick={handleClose}>
            Done
          </Button>
        </>
      )}
    </Modal>
  );
};
