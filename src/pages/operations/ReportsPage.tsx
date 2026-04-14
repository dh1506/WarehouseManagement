import React from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
  Radio,
  Button,
  Tag,
  Avatar,
  Table,
} from 'antd';
import {
  RobotOutlined,
  FilterOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { motion } from 'motion/react';

const { Title, Text, Link } = Typography;

const tableData = [
  {
    key: '1',
    facilityId: 'District-Alpha',
    subLocation: 'FRANKFURT, DE',
    status: 'OPTIMAL',
    statusColor: '#e6f4ff',
    statusTextColor: '#0050b3',
    occupancy: 82,
    score: 98,
    throughput: '12,490',
  },
  {
    key: '2',
    facilityId: 'District-Gamma',
    subLocation: 'CHICAGO, US',
    status: 'BOTTLENECK',
    statusColor: '#fff1f0',
    statusTextColor: '#cf1322',
    occupancy: 96,
    score: 42,
    throughput: '3,120',
  },
  {
    key: '3',
    facilityId: 'Central-Hub-04',
    subLocation: 'TOKYO, JP',
    status: 'STABLE',
    statusColor: '#f5f5f5',
    statusTextColor: '#595959',
    occupancy: 64,
    score: 85,
    throughput: '9,880',
  },
];

const columns = [
  {
    title: 'FACILITY ID',
    dataIndex: 'facility',
    key: 'facility',
    render: (_: any, record: any) => (
      <div>
        <div style={{ fontWeight: 600, color: '#1f1f1f', fontSize: '15px' }}>{record.facilityId}</div>
        <div style={{ fontSize: '11px', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{record.subLocation}</div>
      </div>
    ),
  },
  {
    title: 'CURRENT STATUS',
    dataIndex: 'status',
    key: 'status',
    render: (_: any, record: any) => (
      <Tag color={record.statusColor} style={{ color: record.statusTextColor, border: 'none', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}>
        {record.status}
      </Tag>
    ),
  },
  {
    title: 'OCCUPANCY',
    dataIndex: 'occupancy',
    key: 'occupancy',
    render: (val: number) => (
      <Space size={12}>
        <div style={{ width: '32px', height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${val}%`, height: '100%', backgroundColor: val > 90 ? '#cf1322' : '#003eb3' }}></div>
        </div>
        <Text style={{ fontWeight: 600, fontSize: '14px' }}>{val}%</Text>
      </Space>
    ),
  },
  {
    title: 'AI HEALTH SCORE',
    dataIndex: 'score',
    key: 'score',
    render: (val: number) => (
      <Space size={6}>
        <span className="material-symbols-outlined text-[16px]" style={{ color: '#006d75' }}>star</span>
        <Text style={{ fontWeight: 600, color: '#006d75' }}>{val}<span style={{ color: '#8c8c8c', fontWeight: 400 }}>/100</span></Text>
      </Space>
    ),
  },
  {
    title: 'THROUGHPUT',
    dataIndex: 'throughput',
    key: 'throughput',
    align: 'right' as const,
    render: (val: string) => (
      <Text style={{ fontWeight: 600, fontSize: '15px' }}>{val} pk/h</Text>
    ),
  },
];

export const ReportsPage: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 h-full overflow-y-auto w-full bg-[#fcfcfc] custom-antd-dashboard"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Text style={{ color: '#0050b3', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              ANALYTICS <span style={{ color: '#bfbfbf', margin: '0 8px' }}>/</span> OPERATIONS REPORT
            </Text>
            <Title level={1} style={{ margin: '8px 0 12px 0', fontWeight: 700, fontSize: '36px', color: '#1f1f1f' }}>
              Comprehensive Operations
            </Title>
            <Text style={{ color: '#595959', fontSize: '16px', maxWidth: '600px', display: 'block', lineHeight: 1.5 }}>
              Real-time performance diagnostic of warehouse clusters alpha through epsilon with predictive stock velocity modeling.
            </Text>
          </div>
          
          <Space size={16} align="start">
            <Radio.Group defaultValue="24h" buttonStyle="solid" size="large">
              <Radio.Button value="24h" style={{ padding: '0 24px', borderRadius: '8px 0 0 8px', fontWeight: 500 }}>24 Hours</Radio.Button>
              <Radio.Button value="7d" style={{ padding: '0 24px', fontWeight: 500 }}>7 Days</Radio.Button>
              <Radio.Button value="30d" style={{ padding: '0 24px', borderRadius: '0 8px 8px 0', borderLeft: 'none', fontWeight: 500 }}>30 Days</Radio.Button>
            </Radio.Group>
            <Button size="large" icon={<FilterOutlined />} style={{ borderRadius: '8px', padding: '0 24px', fontWeight: 500, color: '#595959' }}>
              Filters
            </Button>
          </Space>
        </div>

        {/* Top Cards Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          {/* Card 1 */}
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <Text style={{ fontSize: '13px', fontWeight: 600, color: '#006d75', letterSpacing: '0.5px' }}>WAREHOUSE EFFICIENCY</Text>
                <Tag color="#e6fffb" style={{ color: '#006d75', border: 'none', borderRadius: '12px', padding: '2px 10px', margin: 0, fontWeight: 600 }}>
                  <RobotOutlined /> AI Forecast
                </Tag>
              </div>
              <Title level={1} style={{ margin: '0 0 24px 0', fontSize: '48px', fontWeight: 700 }}>94.8%</Title>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginTop: 'auto' }}>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '40%', borderRadius: '4px' }}></div>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '45%', borderRadius: '4px' }}></div>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '35%', borderRadius: '4px' }}></div>
                <div style={{ flex: 1, backgroundColor: '#e6ebf5', height: '60%', borderRadius: '4px' }}></div>
                <div style={{ flex: 1, backgroundColor: '#e6ebf5', height: '55%', borderRadius: '4px' }}></div>
                <div style={{ flex: 1, backgroundColor: '#0050b3', height: '85%', borderRadius: '4px' }}></div>
                <div style={{ flex: 1, backgroundColor: '#006d75', height: '100%', borderRadius: '4px' }}></div>
                
                <div style={{ marginLeft: '12px', textAlign: 'right' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c', display: 'block', fontWeight: 600 }}>vs. Last Period</Text>
                  <Text style={{ color: '#006d75', fontWeight: 700, fontSize: '16px' }}>+4.2%</Text>
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 2 */}
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', borderLeft: '4px solid #003eb3', height: '100%' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '13px', fontWeight: 600, color: '#595959', letterSpacing: '0.5px' }}>ORDER FULFILLMENT</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <Title level={1} style={{ margin: 0, fontSize: '48px', fontWeight: 700 }}>98.2</Title>
                <Text style={{ fontSize: '24px', color: '#bfbfbf', fontWeight: 600 }}>%</Text>
              </div>
              
              <Text style={{ color: '#595959', fontSize: '14px', display: 'inline-block', lineHeight: 1.5, marginBottom: '24px' }}>
                System tracking 4,281 active shipments. 12 delays detected in Zone B.
              </Text>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <div style={{ height: '4px', flex: 1, backgroundColor: '#003eb3', borderRadius: '2px' }}></div>
                <div style={{ height: '4px', flex: 1, backgroundColor: '#003eb3', borderRadius: '2px' }}></div>
                <div style={{ height: '4px', flex: 1, backgroundColor: '#003eb3', borderRadius: '2px' }}></div>
                <div style={{ height: '4px', flex: 1, backgroundColor: '#003eb3', borderRadius: '2px' }}></div>
                <div style={{ height: '4px', flex: 1, backgroundColor: '#e6ebf5', borderRadius: '2px' }}></div>
              </div>
            </Card>
          </Col>

          {/* Card 3 */}
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '13px', fontWeight: 600, color: '#595959', letterSpacing: '0.5px' }}>STOCK TURNOVER</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                <Title level={1} style={{ margin: 0, fontSize: '48px', fontWeight: 700 }}>12.4</Title>
                <Text style={{ fontSize: '24px', color: '#bfbfbf', fontWeight: 600 }}>x</Text>
              </div>
              
              <Tag color="#fff1f0" style={{ color: '#cf1322', border: 'none', borderRadius: '4px', padding: '4px 8px', fontWeight: 600, marginBottom: '16px' }}>
                <WarningOutlined style={{ marginRight: '4px' }} /> LOW VELOCITY RISK
              </Tag>
              
              <Text style={{ color: '#595959', fontSize: '13px', display: 'block', lineHeight: 1.5 }}>
                Predictive modeling suggests increasing throughput for SKU group "Delta-9".
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Bottom Section Row */}
        <Row gutter={[32, 32]}>
          {/* Main Log Table */}
          <Col xs={24} xl={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Warehouse Operations Log</Title>
              <Avatar.Group max={{ count: 2, style: { color: '#595959', backgroundColor: '#f0f0f0' } }}>
                <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jack" />
                <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" />
                <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" />
                <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" />
              </Avatar.Group>
            </div>
            
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '8px' }} styles={{ body: { padding: 0 } }}>
              <Table 
                columns={columns} 
                dataSource={tableData} 
                pagination={false} 
                rowClassName={() => 'custom-table-row'}
              />
              <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #f0f0f0' }}>
                <Link style={{ color: '#0050b3', fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px' }}>
                  DOWNLOAD FULL DATA CSV
                </Link>
              </div>
            </Card>
          </Col>

          {/* AI Insights Sidebar */}
          <Col xs={24} xl={8}>
            <Title level={3} style={{ margin: '0 0 24px 0', fontWeight: 700 }}>AI Insights Panel</Title>
            
            {/* Insight 1 */}
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', borderLeft: '4px solid #006d75', marginBottom: '24px' }}>
              <Space align="center" style={{ marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#e6fffb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: '#006d75' }}>psychology</span>
                </div>
                <Text style={{ color: '#006d75', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>VELOCITY PREDICTION</Text>
              </Space>
              <Text style={{ color: '#1f1f1f', fontSize: '14px', display: 'block', lineHeight: 1.6 }}>
                SKU group <strong style={{ fontWeight: 700 }}>"Electronics-X"</strong> is projected to increase in demand by <span style={{ color: '#006d75', fontWeight: 600 }}>22%</span> over the next 48 hours. Recommend pre-staging inventory in Dock 4.
              </Text>
            </Card>

            {/* Insight 2 */}
            <Card style={{ 
              borderRadius: '16px', 
              border: 'none', 
              background: 'linear-gradient(135deg, #0050b3 0%, #002c8c 100%)', 
              color: 'white',
              boxShadow: '0 4px 20px rgba(0, 80, 179, 0.3)',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative grid pattern mockup */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', opacity: 0.1, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>NETWORK LATENCY</Text>
                <Title level={2} style={{ color: 'white', margin: '8px 0 16px 0', fontSize: '28px', fontWeight: 700 }}>Low Impact</Title>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', display: 'block', lineHeight: 1.6, marginBottom: '24px' }}>
                  All transit routes are operating within baseline parameters. No predictive rerouting required today.
                </Text>
                <Button type="primary" style={{ backgroundColor: '#13c2c2', border: 'none', fontWeight: 600, borderRadius: '8px', height: '40px' }} block>
                  View Map Details
                </Button>
              </div>
            </Card>

            {/* Insight 3 (Zone Saturation) */}
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#595959', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: '16px' }}>ZONE SATURATION</Text>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '16px' }}>
                <div style={{ aspectRatio: '1', backgroundColor: '#69c0ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#69c0ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#bae0ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#40a9ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#40a9ff', borderRadius: '4px' }}></div>
                
                <div style={{ aspectRatio: '1', backgroundColor: '#40a9ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#e6f4ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#e6f4ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#ffccc7', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', border: '2px solid #ff4d4f', backgroundColor: '#ffccc7', borderRadius: '4px' }}></div>
                
                <div style={{ aspectRatio: '1', backgroundColor: '#40a9ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#40a9ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#bae0ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#69c0ff', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', backgroundColor: '#69c0ff', borderRadius: '4px' }}></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 600 }}>Zone Alpha - Floor Plan</Text>
                <Text style={{ fontSize: '11px', color: '#cf1322', fontWeight: 700 }}>Hot Spot: A-04</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <style>
        {`
          .custom-table-row td {
            padding: 20px 16px !important;
            border-bottom: 1px dashed #f0f0f0 !important;
          }
          .custom-table-row:last-child td {
            border-bottom: none !important;
          }
        `}
      </style>
    </motion.div>
  );
};
