import React from 'react';
import {
  Card,
  Progress,
  Tag,
  Typography,
  Row,
  Col,
  Space,
  Radio,
} from 'antd';
import {
  RobotOutlined,
  ScanOutlined,
  CarryOutOutlined,
  DropboxOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { motion } from 'motion/react';

const { Title, Text, Link } = Typography;

const tasksData = [
  {
    id: 1,
    title: 'Cycle Count',
    subtitle: 'Electronics Bay 04-12',
    icon: <CarryOutOutlined style={{ fontSize: '24px', color: '#0050b3' }} />,
    iconBg: '#e6f4ff',
    tagLabel: 'Zone',
    tagValue: 'F',
    active: false,
  },
  {
    id: 2,
    title: 'Pack & Ship',
    subtitle: 'LTL Shipment #FR-442',
    icon: <DropboxOutlined style={{ fontSize: '24px', color: '#006d75' }} />,
    iconBg: '#e6ebf5',
    tagLabel: 'Dock',
    tagValue: '4',
    active: true,
  }
];

export const DashboardPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 h-full overflow-y-auto w-full bg-[#fcfcfc] custom-antd-dashboard"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top Header Equivalent */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1f1f1f' }}>Predictive Logistics Engine</Title>
        </div>
        <div className="flex gap-6 text-sm text-gray-500 font-medium">
          <span className="cursor-pointer hover:text-gray-900 transition-colors">Global View</span>
          <span className="cursor-pointer text-[#0050b3] font-semibold border-b-2 border-[#0050b3] pb-1">Metrics</span>
          <span className="cursor-pointer hover:text-gray-900 transition-colors">Logs</span>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: '0 0 8px 0', fontWeight: 700 }}>My Assignments</Title>
            <Space align="center" size={8}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#006d75' }}></div>
              <Text style={{ color: '#595959', fontSize: '15px' }}>3 active tasks for Zone B-12</Text>
            </Space>
          </div>
          <div>
            <Radio.Group defaultValue="active" buttonStyle="solid" size="large">
              <Radio.Button value="active" style={{ borderRadius: '8px 0 0 8px' }}>Active</Radio.Button>
              <Radio.Button value="history" style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none' }}>History</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {/* Main Grid */}
        <Row gutter={[24, 24]}>
          {/* Left Column */}
          <Col xs={24} lg={15}>
            {/* Urgent Pick Card */}
            <Card
              styles={{ body: { padding: 0 } }}
              style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none', marginBottom: '24px' }}
            >
              <Row align="middle" style={{ minHeight: '260px' }}>
                <Col xs={24} sm={14} style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <Tag color="#ffccc7" style={{ color: '#cf1322', borderRadius: '12px', padding: '2px 12px', fontWeight: 600, border: 'none', margin: 0 }}>
                      URGENT PICK
                    </Tag>
                    <Text type="secondary" style={{ fontFamily: 'monospace' }}>ID: #PX-9921</Text>
                  </div>

                  <Title level={3} style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Aisle 14, Bin C-04</Title>
                  <Text style={{ fontSize: '16px', color: '#595959', display: 'block', marginBottom: '32px' }}>
                    Industrial High-Torque Drill (x12)
                  </Text>

                  <button className="flex items-center gap-2 bg-[#003eb3] hover:bg-[#002c8c] text-white px-8 py-3 rounded-lg font-medium text-base transition-colors shadow-md">
                    <ScanOutlined /> Start Scanning
                  </button>
                </Col>
                <Col xs={24} sm={10} style={{ height: '100%' }}>
                  <div style={{
                    minHeight: '260px',
                    height: '100%',
                    backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }}></div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Task List */}
            <Card
              style={{ borderRadius: '12px', border: 'none', backgroundColor: '#fcfcfc' }}
              styles={{ body: { padding: 0 } }}
            >
              <div>
                {tasksData.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#f5f5f5',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: item.id === 1 ? '16px' : '0',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      borderLeft: item.active ? '4px solid #0050b3' : 'none',
                    }}
                    className="hover:bg-gray-200"
                  >
                    <Space size={20}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: item.iconBg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.icon}
                      </div>
                      <div>
                        <Title level={5} style={{ margin: '0 0 4px 0' }}>{item.title}</Title>
                        <Text type="secondary">{item.subtitle}</Text>
                      </div>
                    </Space>
                    <Space size={24}>
                      <Text type="secondary" style={{ fontSize: '13px' }}>{item.tagLabel} <strong style={{ color: '#8c8c8c' }}>{item.tagValue}</strong></Text>
                      <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} lg={9}>
            {/* Shift Progress */}
            <Card
              style={{
                borderRadius: '16px',
                border: 'none',
                marginBottom: '24px',
                background: 'linear-gradient(135deg, #36cfc9 0%, #13c2c2 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(19, 194, 194, 0.3)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '210px', justifyContent: 'space-between' }}>
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Shift Progress
                  </Text>
                  <Title level={1} style={{ color: 'white', margin: '8px 0 4px 0', fontSize: '56px', fontWeight: 700 }}>
                    84%
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px' }}>
                    142 items handled
                  </Text>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <Progress percent={84} showInfo={false} strokeColor="white" railColor="rgba(255,255,255,0.3)" size={['100%', 8]} />
                </div>
              </div>
            </Card>

            {/* AI Prediction */}
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
              }}
            >
              <Space align="center" style={{ marginBottom: '16px' }}>
                <RobotOutlined style={{ color: '#006d75' }} />
                <Text style={{ color: '#006d75', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>AI PREDICTION</Text>
              </Space>

              <Title level={4} style={{ margin: '0 0 12px 0' }}>Congestion Alert in Aisle 12</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '24px', lineHeight: '1.6' }}>
                Predicted delay of 12 mins. Suggesting re-routing via Sector C for next 3 picks.
              </Text>

              <Link style={{ color: '#0050b3', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                View Dynamic Route <ArrowRightOutlined />
              </Link>
            </Card>
          </Col>
        </Row>
      </div>
    </motion.div>
  );
};
