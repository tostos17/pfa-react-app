import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, InputNumber, Select, Button, Card, Row, Col, Upload, Spin, Divider, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';
import './UpdatePlayerProfile.scss';

const { Option } = Select;

export const UpdatePlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const response = await apiClient.get(`/players/${playerId}`);
        if (response.data?.success && response.data?.body) {
          const p = response.data.body;
          
          // Pre-populate form values with current database fields
          form.setFieldsValue({
            preferredJerseyNumber: p.preferredJerseyNumber,
            heightCm: p.heightCm,
            weightKg: p.weightKg,
            category: p.category,
          });

          // If a photo exists in S3, set it up in the upload preview frame
          if (p.photo) {
            setFileList([
              {
                uid: '-1',
                name: 'current_passport.jpg',
                status: 'done',
                url: p.photo,
              },
            ]);
          }
        }
      } catch (error) {
        message.error('Failed to pull up-to-date profile settings.');
      } finally {
        setLoading(false);
      }
    };

    if (playerId) fetchCurrentData();
  }, [playerId, form]);

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      
      // Append core scalar update items
      if (values.preferredJerseyNumber !== undefined && values.preferredJerseyNumber !== null) {
        formData.append('preferredJerseyNumber', String(values.preferredJerseyNumber));
      }
      formData.append('heightCm', String(values.heightCm || 0));
      formData.append('weightKg', String(values.weightKg || 0));
      if (values.category) {
        formData.append('category', values.category);
      }

      // Append photo asset only if it's a freshly updated file payload
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('passportPhoto', fileList[0].originFileObj);
      }

      const response = await apiClient.put(`/players/${playerId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        message.success('Player metadata and tactical profiles successfully modified.');
        navigate(`/players/profile/${playerId}`);
      } else {
        message.error(response.data?.message || 'Update request failed.');
      }
    } catch (error) {
      const processedError = extractBackendError(error);
      message.error(processedError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Change Photo</div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Spin size="large" tip="Fetching dynamic athlete registry parameters..." />
      </div>
    );
  }

  return (
    <div className="update-profile-container">
      {submitting && (
        <div className="global-submission-overlay">
          <Spin size="large" tip="Saving metadata matrices & syncing S3 file objects..." />
        </div>
      )}

      <div className="action-bar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/players/profile/${playerId}`)}>
          Cancel and Return
        </Button>
      </div>

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'calc(1.2rem + 1vw)', margin: '0 0 4px 0' }}>Modify Athlete Profile</h1>
        <p style={{ color: '#8c8c8c', margin: 0, fontSize: '13px' }}>Update biometric metrics, squad identity numbers, and academy categories.</p>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
        <Row gutter={[24, 24]}>
          
          {/* PHOTO MANAGEMENT BLOCK */}
          <Col xs={24} md={8}>
            <Card title={<><UploadOutlined /> Update Player Photo</>} className="update-card">
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <Upload
                  beforeUpload={(file) => {
                    const isLt5M = file.size / 1024 / 1024 < 5;
                    if (!isLt5M) {
                      message.error('Image must be smaller than 5MB!');
                    }
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
                Modifying this overrides the active S3 asset object instantly.
              </p>
            </Card>
          </Col>

          {/* SQUAD & BIOMETRICS MANIFEST */}
          <Col xs={24} md={16}>
            <Card title={<><InfoCircleOutlined /> Technical & Metric Matrix Updates</>} className="update-card">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="preferredJerseyNumber" label="Update Squad Number (Jersey #)">
                    <InputNumber min={1} max={99} style={{ width: '100%' }} placeholder="e.g. 10" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="category" label="Update Category / Cohort Assignment">
                    <Select placeholder="Select Squad Group">
                      <Option value="UNDER_13">Under-13 Academy Tier</Option>
                      <Option value="UNDER_15">Under-15 Development Squad</Option>
                      <Option value="UNDER_17">Under-17 Elite Matrix</Option>
                      <Option value="UNDER_20">Under-20 Reserves Flight</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0 24px 0' }} />

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="heightCm" label="Update Height (cm)">
                    <InputNumber min={30} max={250} style={{ width: '100%' }} placeholder="cm" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="weightKg" label="Update Weight (kg)">
                    <InputNumber min={5} max={200} style={{ width: '100%' }} placeholder="kg" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '24px 0' }} />

              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                block
                style={{ height: '48px', fontWeight: 600 }}
              >
                Commit Profile Variations
              </Button>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};