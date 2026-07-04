import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Tag, Modal, Form, Input, DatePicker, Typography, Space, Popconfirm, Divider, message } from 'antd';
import { CalendarOutlined, PlusOutlined, CheckCircleOutlined, StarFilled, AlertOutlined, LockOutlined, PlayCircleOutlined, EyeOutlined, PoweroffOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient } from '../../config/axios';
import './AcademicCalendar.scss';
import type { ApiResponse, SessionDto } from '../../types';
import { extractBackendError } from '../../config/errorExtractor';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export const AcademicCalendar: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<SessionDto | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState<boolean>(false);
  const [form] = Form.useForm();

  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateModalOpen, setDateModalOpen] = useState<boolean>(false);
  const [targetTermId, setTargetTermId] = useState<number | null>(null);
  const [dateForm] = Form.useForm();

  const handleUpdateTermDates = async (values: any) => {
    if (!targetTermId) return;
    try {
      await apiClient.put(`/admin/calendar/terms/${targetTermId}/dates`, null, {
        params: {
          startDate: values.termDates[0].format('YYYY-MM-DD'),
          endDate: values.termDates[1].format('YYYY-MM-DD')
        }
      });
      message.success('Term duration window adjusted securely.');
      setDateModalOpen(false);
      dateForm.resetFields();
      fetchCalendarData();
    } catch (error) {
      message.error('Failed to configure target term execution deadlines.');
    }
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<SessionDto[]>>('/admin/calendar/sessions/active-forward');
      const sessionList = response.data.body || (response.data as any).data;

      if (Array.isArray(sessionList)) {
        setSessions(sessionList);
      } else {
        console.error("Payload structure does not contain an iterable collection array:", response.data);
        setSessions([]);
      }
    } catch (error) {
      const extracted = extractBackendError(error);
      message.error(extracted.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // --- TERM CONTROL ACTIONS ---
  const handleStartTerm = async (termId: number) => {
    try {
      await apiClient.post(`/admin/calendar/terms/${termId}/start`);
      message.success('Term has been declared active.');
      fetchCalendarData();
    } catch (error) {
      message.error('Failed to change term state framework.');
    }
  };

  const handleStopTerm = async (termId: number) => {
    try {
      await apiClient.post(`/admin/calendar/terms/${termId}/stop`);
      message.success('Term window successfully closed.');
      fetchCalendarData();
    } catch (error) {
      message.error('Failed to stop term operational window.');
    }
  };

  // --- SESSION CONTROL ACTIONS ---
  const handleStartSession = async (sessionId: number) => {
    try {
      await apiClient.post(`/admin/calendar/sessions/${sessionId}/start`);
      message.success('Session workspace context set to live state.');
      fetchCalendarData();
    } catch (error) {
      message.error('Failed to start session lifecycle context.');
    }
  };

  const handleStopSession = async (sessionId: number) => {
    try {
      await apiClient.post(`/admin/calendar/sessions/${sessionId}/stop`);
      message.success('Session workspace context stopped and closed.');
      fetchCalendarData();
    } catch (error) {
      message.error('Failed to close session frame.');
    }
  };

  const onCreateSession = async (values: any) => {
    try {
      await apiClient.post('/admin/calendar/sessions', null, {
        params: {
          name: values.sessionName,
          startDate: values.dateRange[0].format('YYYY-MM-DD'),
          endDate: values.dateRange[1].format('YYYY-MM-DD'),
          activities: values.activities || ''
        },
      });
      message.success('Session initialized with three sequential terms.');
      setSessionModalOpen(false);
      form.resetFields();
      fetchCalendarData();
    } catch (error) {
      message.error('Failed to save session configuration parameters.');
    }
  };

  const columns: ColumnsType<SessionDto> = [
    {
      title: 'Academy Session Frame',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <Space direction="vertical" size={1}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {`${dayjs(record.startDate).format('MMM D, YYYY')} — ${dayjs(record.endDate).format('MMM D, YYYY')}`}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive: boolean) => isActive ? (
        <Tag color="green" style={{ fontWeight: 600 }}>Active Now</Tag>
      ) : (
        <Tag color="default">Inactive</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setSelectedSession(record)}
            title="Inspect Details"
          />
          {record.isActive ? (
            <Popconfirm
              title="Close down this Session workspace?"
              description="This will lock operations across all assigned terms. Proceed?"
              onConfirm={() => handleStopSession(record.id)}
              okText="Stop Session"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<PoweroffOutlined />} title="Stop Session Workspace" />
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Activate this frame framework?"
              description="This marks this timeline window as live context. Are you sure?"
              onConfirm={() => handleStartSession(record.id)}
              okText="Start Session"
              cancelText="Dismiss"
            >
              <Button type="text" style={{ color: '#52c41a' }} icon={<PlayCircleOutlined />} title="Activate Session Framework" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="academic-calendar-container">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'calc(1.1rem + 1vw)', margin: '0 0 4px 0' }}>Academic Calendar Control Panel</h1>
          <p style={{ color: '#8c8c8c', margin: 0, fontSize: '13px' }}>Manage ongoing operational session structures and track term closures safely.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setSessionModalOpen(true)}>
          Initialize New Session
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={11}>
          <Card title={<><CalendarOutlined /> Target Sessions Timeline Network</>} className="calendar-card" variant="borderless">
            <Table
              columns={columns}
              dataSource={sessions}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 5 }}
              onRow={(record) => ({
                onClick: () => setSelectedSession(record),
                style: { cursor: 'pointer', background: selectedSession?.id === record.id ? '#f5f5f5' : 'inherit' }
              })}
            />
          </Card>
        </Col>

        <Col xs={24} lg={13}>
          {selectedSession ? (
            <Card
              title={<><CheckCircleOutlined /> Workspace Details: {selectedSession.name}</>}
              className="calendar-card"
              variant="borderless"
              extra={selectedSession.isActive && <Tag color="green">CURRENT RUNNING ENVIRONMENT</Tag>}
              styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
            >
              <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>Start Target Date:</td>
                    <td style={{ padding: '8px' }}>{dayjs(selectedSession.startDate).format('MMMM DD, YYYY')}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>End Target Date:</td>
                    <td style={{ padding: '8px' }}>{dayjs(selectedSession.endDate).format('MMMM DD, YYYY')}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold' }} colSpan={4}>Context Description:</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px' }} colSpan={4}>
                      {selectedSession.activitiesDescription || <Text type="secondary">No extended activity descriptions defined for this framework index.</Text>}
                    </td>
                  </tr>
                </tbody>
              </table>

              <Divider orientation={"left" as unknown as any} style={{ marginTop: 0 }}>
                <Text strong style={{ fontSize: '13px' }}>Corresponding Term Matrices</Text>
              </Divider>

              {/* Added a robust vertical scrolling wrapper here */}
              <div className="terms-grid-layout" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
                {selectedSession.terms && selectedSession.terms.map((term: any) => (
                  <div key={term.id} className={`term-context-box ${term.isCurrentActive ? 'active-border' : ''}`} style={{ marginBottom: '12px' }}>
                    <div className="term-info">
                      <Title level={5} style={{ margin: '0 0 4px 0' }}>{term.name} TERM</Title>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {term.startDate && term.endDate
                          ? `${dayjs(term.startDate).format('MMM D, YYYY')} — ${dayjs(term.endDate).format('MMM D, YYYY')}`
                          : 'Timeline windows configured upon term framework initialization.'}
                      </Text>
                    </div>

                    <div className="term-action" style={{ marginTop: '8px' }}>
                      {term.isCurrentActive ? (
                        <Space>
                          <Tag icon={<StarFilled />} color="gold" style={{ padding: '4px 8px', fontWeight: 600 }}>
                            LIVE NOW
                          </Tag>
                          <Popconfirm
                            title="Deactivate and Stop Term operational window?"
                            description="This locks processing variables until another timeline frame context is activated."
                            onConfirm={() => handleStopTerm(term.id)}
                            okText="Stop Term"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                            icon={<LockOutlined style={{ color: 'red' }} />}
                          >
                            <Button type="primary" danger size="small" icon={<LockOutlined />}>
                              Stop Term
                            </Button>
                          </Popconfirm>
                        </Space>
                      ) : (
                        <Space>
                          <Popconfirm
                            title="Launch this Term operational window?"
                            description="This sets this item as active. Ensure no conflicting frames remain active to prevent systemic mismatch trace exceptions."
                            onConfirm={() => handleStartTerm(term.id)}
                            okText="Launch Term"
                            cancelText="Dismiss"
                            disabled={!selectedSession.isActive}
                          >
                            <Button
                              type="dashed"
                              size="small"
                              icon={<PlayCircleOutlined />}
                              disabled={!selectedSession.isActive}
                              title={!selectedSession.isActive ? "Activate the Session framework first to trigger nested sub-terms." : ""}
                            >
                              Launch Term
                            </Button>
                          </Popconfirm>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              setTargetTermId(term.id);
                              setDateModalOpen(true);
                            }}
                          >
                            Configure Range
                          </Button>
                        </Space>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="calendar-card" variant="borderless">
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#bfbfbf' }}>
                <AlertOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
                <p>Select a session timeline profile from the left panel matrix grid to configure associated sub-term frameworks.</p>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="Initialize New Academic/Sporting Session Framework"
        open={sessionModalOpen}
        onCancel={() => setSessionModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onCreateSession} style={{ paddingTop: '12px' }}>
          <Form.Item name="sessionName" label="Session Descriptor Label" rules={[{ required: true, message: 'Specify context title name.' }]}>
            <Input placeholder="e.g., 2026/2027 Academic Frame" />
          </Form.Item>
          <Form.Item name="dateRange" label="Session Timeline Boundaries (Start — End)" rules={[{ required: true, message: 'Date span envelope constraints required.' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="activities" label="Activity Context Specifications (Optional)">
            <Input.TextArea rows={3} placeholder="Provide unique curriculum configuration metadata parameters here..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Configure Operational Term Timeline Window"
        open={dateModalOpen}
        onCancel={() => setDateModalOpen(false)}
        onOk={() => dateForm.submit()}
        destroyOnClose
      >
        <Form form={dateForm} layout="vertical" onFinish={handleUpdateTermDates} style={{ paddingTop: '12px' }}>
          <Form.Item name="termDates" label="Active Operating Range (Start — End)" rules={[{ required: true, message: 'Boundaries required.' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};