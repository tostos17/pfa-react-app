import React, { useEffect, useState } from 'react';
import { Modal, Button, Spin, Alert, Space, Divider, Typography, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';
import './ParentOnboarding.scss';

const { Title, Text } = Typography;

interface ConsentFormModalProps {
  visible: boolean;
  parentId: number | null;
  onClose: () => void;
}

interface FormData {
  title: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  username: string;
  registrationDate: string;
}

interface ConsentData {
  formData: FormData;
  consentStatement: string;
  generatedAt: string;
}

export const ConsentFormModal: React.FC<ConsentFormModalProps> = ({ visible, parentId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsentData | null>(null);

  useEffect(() => {
    if (visible && parentId) {
      setLoading(true);
      setData(null);
      apiClient.get(`/onboarding/parent/${parentId}/consent-form`)
        .then(res => setData(res.data?.body || res.data))
        .catch(err => {
          const e = extractBackendError(err);
          message.error(e.message);
        })
        .finally(() => setLoading(false));
    }
  }, [visible, parentId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const rows: { label: string; value: string }[] = data ? [
    { label: 'Title', value: data.formData.title || '—' },
    { label: 'Full Name', value: `${data.formData.firstName} ${data.formData.lastName}` },
    { label: 'Relationship to Player', value: data.formData.relationship || '—' },
    { label: 'Mobile Number', value: data.formData.phone },
    { label: 'Email Address', value: data.formData.email },
    { label: 'Residential Address', value: data.formData.address },
    { label: 'Occupation', value: data.formData.occupation || '—' },
    { label: 'Username', value: data.formData.username },
    { label: 'Registration Date', value: formatDate(data.formData.registrationDate) },
  ] : [];

  return (
    <Modal
      title="Parent / Guardian Consent Form"
      open={visible}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={
        <Space className="no-print">
          <Button onClick={onClose}>Close</Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            disabled={!data}
          >
            Print Form
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Loading consent form data..." />
        </div>
      ) : !data ? (
        <Alert type="warning" message="No consent form data available." showIcon />
      ) : (
        <div className="consent-form-print-area">
          {/* Header */}
          <div className="consent-header">
            <h2>Parent / Guardian Registration Form</h2>
            <p>Football Academy &nbsp;|&nbsp; Generated: {formatDate(data.generatedAt)}</p>
          </div>

          {/* Data grid */}
          <div className="consent-data-grid">
            {rows.map(row => (
              <React.Fragment key={row.label}>
                <div className="data-label">{row.label}</div>
                <div className="data-value">{row.value}</div>
              </React.Fragment>
            ))}
          </div>

          <Divider style={{ borderColor: '#000', margin: '20px 0' }} />

          {/* Consent declaration */}
          <div className="consent-declaration">
            <h3>Consent Declaration</h3>
            <blockquote>{data.consentStatement}</blockquote>
          </div>

          {/* Signature lines */}
          <div className="consent-signature">
            <div className="sig-line">Signature: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            <div className="sig-line">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          </div>
        </div>
      )}
    </Modal>
  );
};
