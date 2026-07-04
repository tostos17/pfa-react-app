import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, DatePicker, Row, Col, Card, Divider, Upload, Spin, message } from 'antd';
import { UserOutlined, TrophyOutlined, LinkOutlined, SaveOutlined, EnvironmentOutlined, HeartOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';
import './RegisterPlayer.scss';

const { Option } = Select;
const { TextArea } = Input;

interface ParentOption {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export const RegisterPlayer: React.FC = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const isHealthy = Form.useWatch('healthy', form);

  useEffect(() => {
    const fetchParents = async () => {
      setLoadingParents(true);
      try {
        const response = await apiClient.get('/parents?all=true');
        const apiResponse = response.data;
        const dataPayload = apiResponse.body;
        const parentList = dataPayload?.content || dataPayload || [];
        setParents(Array.isArray(parentList) ? parentList : []);
      } catch (error) {
        message.error('Failed to load parent directories.');
        setParents([]);
      } finally {
        setLoadingParents(false);
      }
    };
    fetchParents();
  }, []);

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const formData = new FormData();

      formData.append('username', values.username);
      if (values.password) formData.append('password', values.password);
      formData.append('firstName', values.firstName);
      formData.append('middleName', values.middleName || '');
      formData.append('lastName', values.lastName);
      if (values.email) formData.append('email', values.email);
      if (values.phone) formData.append('phone', values.phone);
      
      if (values.dateOfBirth) {
        formData.append('dateOfBirth', values.dateOfBirth.format('YYYY-MM-DD'));
      }

      formData.append('address', values.address);
      formData.append('stateOfOrigin', values.stateOfOrigin);
      formData.append('country', values.country);
      formData.append('healthy', values.healthy);
      formData.append('healthConcernDescription', values.healthConcernDescription || '');

      if (values.parentId) {
        formData.append('parentId', String(values.parentId));
      }

      if (values.dominantFoot) formData.append('dominantFoot', values.dominantFoot);
      formData.append('heightCm', String(values.heightCm || 0.0));
      formData.append('weightKg', String(values.weightKg || 0.0));

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('passportPhoto', fileList[0].originFileObj);
      }

      const response = await apiClient.post('/auth/register/player', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const apiResponse = response.data;

      if (apiResponse && apiResponse.success) {
        message.success(apiResponse.message || 'Player registered successfully.');
        form.resetFields();
        setFileList([]);
      } else {
        message.error(apiResponse.message || 'Registration request failed.');
      }

    } catch (error: any) {
      const processedError = extractBackendError(error);
      if (processedError.validationErrors) {
        const antdFieldErrors = Object.entries(processedError.validationErrors).map(([field, msg]) => ({
          name: field,
          errors: [msg],
        }));
        form.setFields(antdFieldErrors);
        message.error('Validation constraint mismatch found.');
      } else {
        message.error(processedError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload Photo</div>
    </div>
  );

  // ... (keep your existing imports and state logic exactly as they are)

  return (
    <div className="register-player-container">
      {submitting && (
        <div className="global-submission-overlay">
          <Spin size="large" tip="Registering athlete & uploading assets... Please wait." />
        </div>
      )}

      {/* Structural change: Applied explicit layout header wrappers */}
      <div className="page-header">
        <div className="header-title">
          <h1>Register New Athlete</h1>
          <p>Deploy core registration credentials and assign validation matrices.</p>
        </div>
      </div>

      {/* FIXED: Wrapped Form or grid layer with your premium-form-layout selector chain */}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        size="large"
        initialValues={{ healthy: 'TRUE', country: 'Nigeria' }}
        className="premium-form-layout"
      >
        <Row gutter={[24, 24]}>
          {/* LEFT INPUT SECTION */}
          <Col xs={24} xl={16}>
            <Card title={<><UserOutlined className="card-icon" /> Portal Security Credentials</>} className="form-card">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="username" label="System Username" rules={[{ required: true, message: 'Username is required.' }]}>
                    <Input placeholder="e.g. akin2026" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="password" label="Temporary Portal Password (Optional)">
                    <Input.Password placeholder="Leave blank for autogen" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={<><UserOutlined className="card-icon" /> Core Identity Data</>} className="form-card" style={{ marginTop: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'First name is required.' }]}>
                    <Input placeholder="First Name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="middleName" label="Middle Name">
                    <Input placeholder="Middle Name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Last name is required.' }]}>
                    <Input placeholder="Last Name" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="email" label="Email Address">
                    <Input placeholder="player@domain.com (Optional)" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="phone" label="Phone Number">
                    <Input placeholder="Contact mobile number" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true, message: 'Date of birth is required.' }]}>
                    <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={<><EnvironmentOutlined className="card-icon" /> Residential Mapping</>} className="form-card" style={{ marginTop: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="country" label="Country" rules={[{ required: true, message: 'Country is required.' }]}>
                    <Input placeholder="e.g. Nigeria" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="stateOfOrigin" label="State of Origin" rules={[{ required: true, message: 'State of origin is required.' }]}>
                    <Input placeholder="e.g. Lagos" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="address" label="Residential Home Address" rules={[{ required: true, message: 'Address is required.' }]}>
                <Input placeholder="Street address details..." />
              </Form.Item>
            </Card>

            <Card title={<><HeartOutlined className="card-icon" /> Fitness & Health Metrics</>} className="form-card" style={{ marginTop: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="healthy" label="Is Player Fit & Healthy?" rules={[{ required: true }]}>
                    <Select>
                      <Option value="TRUE">Fit & Validated for Activity</Option>
                      <Option value="FALSE">Has Medical Limitations / Concerns</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {isHealthy === 'FALSE' && (
                <Form.Item 
                  name="healthConcernDescription" 
                  label="Medical Limitations Description"
                  rules={[{ required: true, message: 'Please describe the health issues.' }]}
                >
                  <TextArea rows={3} placeholder="Provide target medical details..." />
                </Form.Item>
              )}
            </Card>

            <Card title={<><TrophyOutlined className="card-icon" /> Physical Attributes</>} className="form-card" style={{ marginTop: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item name="dominantFoot" label="Dominant Foot">
                    <Select placeholder="Select Foot" allowClear>
                      <Option value="Right">Right Foot</Option>
                      <Option value="Left">Left Foot</Option>
                      <Option value="Ambidextrous">Ambidextrous</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="heightCm" label="Height (cm)">
                    <InputNumber min={0} max={250} style={{ width: '100%' }} placeholder="cm" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="weightKg" label="Weight (kg)">
                    <InputNumber min={0} max={200} style={{ width: '100%' }} placeholder="kg" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* RIGHT FIXED PANEL FOR UPLOAD AND ACTION ELEMENTS */}
          {/* FIXED: Sticky behaviors should target the structural column directly */}
          <Col xs={24} xl={8} className="sticky-sidebar-column">
            <Card title={<><UploadOutlined className="card-icon" /> Passport Photo</>} className="form-card">
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '10px' }}>
                <Upload
                  beforeUpload={(file) => {
                    const isLt5M = file.size / 1024 / 1024 < 5;
                    if (!isLt5M) message.error('Image must be smaller than 5MB!');
                    return false;
                  }}
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleUploadChange}
                  maxCount={1}
                  accept="image/*"
                >
                  {fileList.length >= 1 ? null : uploadButton}
                </Upload>
              </div>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#8c8c8c', margin: 0 }}>
                Supported extensions: JPG, PNG under 5MB.
              </p>
            </Card>

            <Card title={<><LinkOutlined className="card-icon" /> Guardian Relationship</>} className="form-card" style={{ marginTop: '24px' }}>
              <Form.Item 
                name="parentId" 
                label="Primary Account Guardian" 
                rules={[{ required: true, message: 'Parent mapping is required.' }]}
              >
                <Select
                  placeholder="Select linked parent profile"
                  loading={loadingParents}
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {parents.map((parent) => (
                    <Option key={parent.id} value={parent.id}>
                      {parent.lastName}, {parent.firstName} ({parent.phoneNumber})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Divider style={{ margin: '20px 0' }} />
              
              {/* FIXED: Extracted custom styles to cleanly match your .commit-btn definition */}
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                block
                className="commit-btn"
              >
                Register Academy Athlete
              </Button>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};