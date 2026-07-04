import React, { useState, useEffect } from 'react';
import { Drawer, Form, Input, Select, InputNumber, DatePicker, Row, Col, Space, Upload, Spin, message, Button } from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';

const { Option } = Select;
const { TextArea } = Input;

interface ParentOption {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface PlayerFormDrawerProps {
  visible: boolean;
  onClose: () => void;
  playerData: any | null;
  onSuccess: () => void;
}

export const PlayerFormDrawer: React.FC<PlayerFormDrawerProps> = ({ visible, onClose, playerData, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingParents, setLoadingParents] = useState<boolean>(false);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const isHealthy = Form.useWatch('healthy', form);
  const isEditMode = !!playerData;

  useEffect(() => {
    if (visible) {
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

      if (playerData) {
        form.setFieldsValue({
          ...playerData,
          dateOfBirth: playerData.dateOfBirth ? dayjs(playerData.dateOfBirth) : null,
          healthy: playerData.healthy === false ? 'FALSE' : 'TRUE'
        });
        if (playerData.photo) {
          setFileList([{ uid: '-1', name: 'current_passport.png', status: 'done', url: playerData.photo }]);
        } else {
          setFileList([]);
        }
      } else {
        form.resetFields();
        setFileList([]);
      }
    }
  }, [visible, playerData, form]);

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (isEditMode) {
        // --- EDIT MODE: ORCHESTRATE COMPATIBLE SPRING API CALLS ---
        const username = values.username || 'admin';
        const requests = [];

        // 1. Core Profile Attributes Body (Idempotent Put Wrapper)
        const profilePayload = {
          heightCm: Number(values.heightCm || 0.0),
          weightKg: Number(values.weightKg || 0.0),
          dominantFoot: String(values.dominantFoot || 'RIGHT').toUpperCase(),
          position: String(values.position || 'STRIKER').toUpperCase(),
          preferredJerseyNumber: values.preferredJerseyNumber ? Number(values.preferredJerseyNumber) : null,
          biography: values.biography || ''
        };
        requests.push(apiClient.put(`/players/profile/create/${playerData.playerId}?username=${username}`, profilePayload));

        // 2. Separate Dynamic Passport Photo Upload if changed
        if (fileList.length > 0 && fileList[0].originFileObj) {
          const photoFormData = new FormData();
          photoFormData.append('username', username);
          photoFormData.append('passportPhoto', fileList[0].originFileObj);
          
          requests.push(apiClient.put(`/players/${playerData.playerId}/passport?username=${username}`, photoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          }));
        }

        // Wait for all mutations to resolve cleanly
        await Promise.all(requests);
        message.success('Athlete biometric updates applied successfully.');

      } else {
        // --- CREATE MODE: UNCHANGED ROBUST SINGLE MULTIPART REGISTRATION ---
        const formData = new FormData();
        formData.append('username', values.username);
        if (values.password) formData.append('password', values.password);
        formData.append('firstName', values.firstName);
        formData.append('middleName', values.middleName || '');
        formData.append('lastName', values.lastName);
        if (values.email) formData.append('email', values.email);
        if (values.phone) formData.append('phone', values.phone);
        if (values.dateOfBirth) formData.append('dateOfBirth', values.dateOfBirth.format('YYYY-MM-DD'));
        formData.append('address', values.address);
        formData.append('stateOfOrigin', values.stateOfOrigin);
        formData.append('country', values.country);
        formData.append('healthy', String(values.healthy === 'TRUE'));
        formData.append('healthConcernDescription', values.healthConcernDescription || '');
        if (values.parentId) formData.append('parentId', String(values.parentId));
        if (values.dominantFoot) formData.append('dominantFoot', values.dominantFoot);
        formData.append('heightCm', String(values.heightCm || 0.0));
        formData.append('weightKg', String(values.weightKg || 0.0));

        if (fileList.length > 0 && fileList[0].originFileObj) {
          formData.append('passportPhoto', fileList[0].originFileObj);
        }

        const response = await apiClient.post('/auth/register/player', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data && response.data.success) {
          message.success(response.data.message || 'Athlete registered successfully.');
        } else {
          throw new Error(response.data.message || 'Server rejected creation parameters.');
        }
      }

      onSuccess();
      onClose();

    } catch (error: any) {
      const processedError = extractBackendError(error);
      if (processedError.validationErrors) {
        const antdFieldErrors = Object.entries(processedError.validationErrors).map(([field, msg]) => ({
          name: field,
          errors: [msg as string],
        }));
        form.setFields(antdFieldErrors);
        message.error('Validation constraint mismatch found.');
      } else {
        message.error(processedError.message || 'Failed to sync player details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={isEditMode ? "Modify Athlete Metrics & Bio" : "Enroll New Academy Athlete"}
      width={window.innerWidth <= 768 ? '100%' : 580}
      onClose={onClose}
      open={visible}
      destroyOnClose
      styles={{ body: { paddingBottom: 80, overflowY: 'auto' } }} // Injected fix for vertical scrollbar visibility
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()} loading={submitting} icon={<SaveOutlined />}>
            Save Profile
          </Button>
        </Space>
      }
    >
      <Spin spinning={submitting || loadingParents}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
          initialValues={{ healthy: 'TRUE', country: 'Nigeria' }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
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
                  {fileList.length >= 1 ? null : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload Photo</div>
                    </div>
                  )}
                </Upload>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="username" label="System Username" rules={[{ required: true, message: 'Username is required.' }]}>
                <Input placeholder="e.g. akin2026" disabled={isEditMode} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} style={{ display: isEditMode ? 'none' : 'block' }}>
              <Form.Item name="password" label="Portal Password (Optional)">
                <Input.Password placeholder="Leave blank for autogen" />
              </Form.Item>
            </Col>
          </Row>

          {/* Hide core registration blocks in edit mode to prioritize atomic biometric endpoints */}
          <div style={{ display: isEditMode ? 'none' : 'block' }}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="firstName" label="First Name" rules={[{ required: !isEditMode, message: 'Required.' }]}>
                  <Input placeholder="First" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="middleName" label="Middle Name">
                  <Input placeholder="Middle" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="lastName" label="Last Name" rules={[{ required: !isEditMode, message: 'Required.' }]}>
                  <Input placeholder="Last" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="email" label="Email Address">
                  <Input placeholder="player@domain.com" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Phone Number">
                  <Input placeholder="Contact mobile" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: !isEditMode, message: 'Required.' }]}>
                  <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="parentId" label="Primary Account Guardian" rules={[{ required: !isEditMode, message: 'Guardian linkage required.' }]}>
                  <Select placeholder="Select guardian" showSearch optionFilterProp="children" allowClear>
                    {parents.map((parent) => (
                      <Option key={parent.id} value={parent.id}>
                        {parent.lastName}, {parent.firstName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="country" label="Country" rules={[{ required: !isEditMode, message: 'Required.' }]}>
                  <Input placeholder="Country" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="stateOfOrigin" label="State of Origin" rules={[{ required: !isEditMode, message: 'Required.' }]}>
                  <Input placeholder="State" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="address" label="Residential Home Address" rules={[{ required: !isEditMode, message: 'Required.' }]}>
              <Input placeholder="Street address details..." />
            </Form.Item>
          </div>

          {/* Biometrics & Position parameters are active across both layouts */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="position" label="Tactical Field Position" rules={[{ required: true, message: 'Position is required.' }]}>
                <Select placeholder="Select Position">
                  <Option value="STRIKER">Striker</Option>
                  <Option value="WINGER">Winger</Option>
                  <Option value="MIDFIELDER">Midfielder</Option>
                  <Option value="DEFENDER">Defender</Option>
                  <Option value="GOALKEEPER">Goalkeeper</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="preferredJerseyNumber" label="Preferred Squad Jersey #">
                <InputNumber min={1} max={99} style={{ width: '100%' }} placeholder="e.g. 10" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="dominantFoot" label="Dominant Foot">
                <Select placeholder="Select Foot" allowClear>
                  <Option value="Right">Right Foot</Option>
                  <Option value="Left">Left Foot</Option>
                  <Option value="Ambidextrous">Ambidextrous</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="heightCm" label="Height (cm)">
                <InputNumber min={0} max={250} style={{ width: '100%' }} placeholder="cm" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="weightKg" label="Weight (kg)">
                <InputNumber min={0} max={200} style={{ width: '100%' }} placeholder="kg" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="biography" label="Athlete Professional Biography">
            <TextArea rows={4} placeholder="Summarize historical sports achievements, academy notes, etc..." />
          </Form.Item>

          <div style={{ display: isEditMode ? 'none' : 'block' }}>
            <Form.Item name="healthy" label="Is Player Fit & Healthy?" rules={[{ required: !isEditMode }]}>
              <Select>
                <Option value="TRUE">Fit & Validated for Activity</Option>
                <Option value="FALSE">Has Medical Limitations / Concerns</Option>
              </Select>
            </Form.Item>

            {isHealthy === 'FALSE' && (
              <Form.Item name="healthConcernDescription" label="Medical Limitations Description" rules={[{ required: true, message: 'Please describe.' }]}>
                <TextArea rows={3} placeholder="Provide target medical details..." />
              </Form.Item>
            )}
          </div>
        </Form>
      </Spin>
    </Drawer>
  );
};