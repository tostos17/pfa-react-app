import React, { useState } from 'react';
import { Drawer, Form, Input, Select, DatePicker, InputNumber, Upload, Button, Row, Col, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** Lets a logged-in parent register a child/ward via POST /portal/parent/register-child. */
export const RegisterChildDrawer: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const healthy = Form.useWatch('healthy', form);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      const simple = ['username', 'firstName', 'middleName', 'lastName', 'email', 'phone',
        'address', 'stateOfOrigin', 'country', 'healthy', 'healthConcernDescription', 'dominantFoot'];
      simple.forEach((k) => {
        if (values[k] !== undefined && values[k] !== null && values[k] !== '') fd.append(k, String(values[k]));
      });
      if (values.dateOfBirth) fd.append('dateOfBirth', values.dateOfBirth.format('YYYY-MM-DD'));
      fd.append('heightCm', String(values.heightCm || 0));
      fd.append('weightKg', String(values.weightKg || 0));
      if (fileList[0]?.originFileObj) fd.append('passportPhoto', fileList[0].originFileObj);

      await apiClient.post('/portal/parent/register-child', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Child registered successfully.');
      form.resetFields();
      setFileList([]);
      onSuccess();
    } catch (err) {
      message.error(extractBackendError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Register a Child / Ward"
      open={open}
      onClose={onClose}
      width={640}
      destroyOnHidden
      extra={<Button type="primary" loading={submitting} onClick={() => form.submit()}>Submit</Button>}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ healthy: 'true', country: 'Nigeria' }}>
        <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Username is required.' }]}>
          <Input placeholder="Portal username for the child" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="middleName" label="Middle Name"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="country" label="Country" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="stateOfOrigin" label="State of Origin" rules={[{ required: true }]}><Input /></Form.Item></Col>
        </Row>
        <Form.Item name="address" label="Home Address" rules={[{ required: true }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="healthy" label="Fit & Healthy?" rules={[{ required: true }]}>
              <Select options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
            </Form.Item>
          </Col>
          <Col span={16}>
            {healthy === 'false' && (
              <Form.Item name="healthConcernDescription" label="Health Concern" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            )}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="dominantFoot" label="Dominant Foot">
              <Select allowClear options={['LEFT', 'RIGHT', 'BOTH'].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="heightCm" label="Height (cm)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="weightKg" label="Weight (kg)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Form.Item label="Passport Photo">
          <Upload
            accept="image/*"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl)}
            listType="picture"
          >
            <Button icon={<UploadOutlined />}>Select Photo</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Drawer>
  );
};
