import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Button, Space, Spin, message, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/axios';
import { extractBackendError } from '../../config/errorExtractor';
import type { ParentData } from './ParentsDirectory';

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  parentData: ParentData | null;
  onSuccess: () => void;
}

export const ParentFormDrawer: React.FC<DrawerProps> = ({ visible, onClose, parentData, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const isEditMode = !!parentData;

  useEffect(() => {
    if (visible) {
      if (parentData) {
        // Ensure data from parentData maps back correctly if names differ
        form.setFieldsValue({
          ...parentData,
          phone: parentData.phone || (parentData as any).phoneNumber // Fallback mapping if legacy field exists
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, parentData, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (isEditMode && parentData) {
        // UPDATE Existing Parent
        const response = await apiClient.put(`/parents/${parentData.id}`, values);
        if (response.status === 200 && response.data?.success) {
          message.success('Guardian properties updated successfully.');
          onSuccess();
          onClose();
        } else {
          const serverWarning = response.data?.message || 'The server rejected or failed to update the record.';
          message.warning(`Update incomplete: ${serverWarning}`);
        }
      } else {
        // CREATE Fresh Parent
        const response = await apiClient.post('/auth/register/parent', values);
        if ((response.status === 200 || response.status === 201) && response.data?.success) {
          message.success('New guardian entry filed into registry.');
          onSuccess();
          onClose();
        } else {
          const serverWarning = response.data?.message || 'The server failed to create the new record entry.';
          message.warning(`Creation incomplete: ${serverWarning}`);
        }
      }
    } catch (error) {
      const processedError = extractBackendError(error);
      message.error(processedError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={isEditMode ? "Modify Guardian Parameters" : "Enroll New Guardian Profile"}
      width={window.innerWidth <= 576 ? '100%' : 460}
      onClose={onClose}
      open={visible}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()} loading={submitting} icon={<SaveOutlined />}>
            Save
          </Button>
        </Space>
      }
    >
      <Spin spinning={submitting}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={true} /* Changed to true since the DTO requires almost everything */
          size="large"
        >
          {/* NEW: Username Field (Required by DTO) */}
          <Form.Item 
            name="username" 
            label="Username" 
            rules={[
              { required: true, message: 'Username is required.' },
              { min: 4, message: 'Username must be at least 4 characters.' },
              { max: 50, message: 'Username cannot exceed 50 characters.' }
            ]}
          >
            <Input placeholder="Enter unique username" disabled={isEditMode} />
          </Form.Item>

          {/* NEW: Optional Title Select */}
          <Form.Item name="title" label="Title (Optional)">
            <Select placeholder="Select title" allowClear>
              <Select.Option value="Mr">Mr</Select.Option>
              <Select.Option value="Mrs">Mrs</Select.Option>
              <Select.Option value="Ms">Ms</Select.Option>
              <Select.Option value="Dr">Dr</Select.Option>
              <Select.Option value="Prof">Prof</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'First name is required.' }]}>
            <Input placeholder="First Name" />
          </Form.Item>
          
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Last name is required.' }]}>
            <Input placeholder="Last Name" />
          </Form.Item>

          {/* FIXED: name changed from 'phoneNumber' to 'phone' to match DTO */}
          <Form.Item 
            name="phone" 
            label="Phone Number" 
            rules={[
              { required: true, message: 'Phone number is required.' },
              { pattern: /^\+?[0-9]{7,15}$/, message: 'Please enter a valid telecom sequence.' }
            ]}
          >
            <Input placeholder="e.g. 08077777" />
          </Form.Item>

          {/* FIXED: Email is now strictly required by backend @NotBlank */}
          <Form.Item 
            name="email" 
            label="Email Address" 
            rules={[
              { required: true, message: 'Email address is required.' },
              { type: 'email', message: 'Invalid email address format.' }
            ]}
          >
            <Input placeholder="guardian@domain.com" />
          </Form.Item>

          {/* FIXED: Address is now strictly required by backend @NotBlank */}
          <Form.Item 
            name="address" 
            label="Residential Home Address"
            rules={[{ required: true, message: 'Address context details are required.' }]}
          >
            <Input.TextArea rows={3} placeholder="Provide home address context details..." />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};