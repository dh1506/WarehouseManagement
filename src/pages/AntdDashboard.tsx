import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Card,
  Progress,
  Tag,
  Typography,
  Row,
  Col,
  Avatar,
  Badge,
  Space,
  Radio,
} from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  RobotOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  BellOutlined,
  HistoryOutlined,
  ScanOutlined,
  CarryOutOutlined,
  DropboxOutlined,
  ArrowRightOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title, Text, Link } = Typography;

export const AntdDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('1');

  const menuItems = [
    { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '2', icon: <DatabaseOutlined />, label: 'Inventory' },
    { key: '3', icon: <RobotOutlined />, label: 'AI Forecasts' },
    { key: '4', icon: <BarChartOutlined />, label: 'Sales Data' },
    { key: '5', icon: <FileTextOutlined />, label: 'Reports' },
    { key: '6', icon: <SettingOutlined />, label: 'Settings' },
  ];

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

  return (
    <Layout style={{ minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <Sider width={260} theme="light" style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px' }}>
          <Title level={4} style={{ color: '#003eb3', margin: 0, fontWeight: 700 }}>WMS Architect</Title>
          <Text style={{ color: '#006d75', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>PREDICTIVE MODE ACTIVE</Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeMenu]}
          onClick={(e) => setActiveMenu(e.key)}
          items={menuItems}
          style={{ borderRight: 0, flex: 1, padding: '0 12px' }}
        />

        <div style={{ padding: '20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button type="primary" icon={<PlusOutlined />} size="large" style={{ backgroundColor: '#0050b3', width: '100%', borderRadius: '8px' }}>
            New Import
          </Button>
          <Button type="text" icon={<QuestionCircleOutlined />} style={{ alignSelf: 'flex-start', color: '#595959' }}>
            Help Center
          </Button>
        </div>
      </Sider>

      {/* Main Layout */}
      <Layout style={{ backgroundColor: '#fcfcfc' }}>
        {/* Header */}
        <Header style={{ backgroundColor: '#fff', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', height: '72px' }}>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1f1f1f' }}>Predictive Logistics Engine</Title>

          <Space size={32}>
            <div style={{ display: 'flex', gap: '24px', fontSize: '15px', color: '#595959' }}>
              <span style={{ cursor: 'pointer' }}>Global View</span>
              <span style={{ cursor: 'pointer', color: '#0050b3', fontWeight: 600, borderBottom: '2px solid #0050b3', paddingBottom: '4px' }}>Metrics</span>
              <span style={{ cursor: 'pointer' }}>Logs</span>
            </div>

            <Space size={20}>
              <Badge dot>
                <BellOutlined style={{ fontSize: '20px', color: '#595959', cursor: 'pointer' }} />
              </Badge>
              <HistoryOutlined style={{ fontSize: '20px', color: '#595959', cursor: 'pointer' }} />
              <Avatar style={{ backgroundColor: '#002c8c' }} icon={<UserOutlined />} src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" />
            </Space>
          </Space>
        </Header>

        {/* Content */}
        <Content style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

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
                  <Col span={14} style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <Tag color="#ffccc7" style={{ color: '#cf1322', borderRadius: '12px', padding: '2px 12px', fontWeight: 600, border: 'none' }}>
                        URGENT PICK
                      </Tag>
                      <Text type="secondary" style={{ fontFamily: 'monospace' }}>ID: #PX-9921</Text>
                    </div>

                    <Title level={3} style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Aisle 14, Bin C-04</Title>
                    <Text style={{ fontSize: '16px', color: '#595959', display: 'block', marginBottom: '32px' }}>
                      Industrial High-Torque Drill (x12)
                    </Text>

                    <Button type="primary" size="large" icon={<ScanOutlined />} style={{ backgroundColor: '#003eb3', height: '48px', padding: '0 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 500 }}>
                      Start Scanning
                    </Button>
                  </Col>
                  <Col span={10} style={{ height: '100%' }}>
                    <div style={{
                      height: '260px',
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
                <div style={{ display: 'flex', flexDirection: 'column', height: '210px', justifyContent: 'space-between' }}>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>
                      SHIFT PROGRESS
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
        </Content>
      </Layout>
    </Layout>
  );
};
