import React from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
  Button,
  Tag,
  Table,
  Badge,
  Input,
  Avatar,
  Progress
} from 'antd';
import {
  BellOutlined,
  HistoryOutlined,
  PlayCircleFilled,
  SearchOutlined,
  AimOutlined,
  WarningOutlined,
  CheckCircleFilled,
  HomeFilled,
  ExperimentFilled
} from '@ant-design/icons';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Link } = Typography;

const tableData = [
  {
    key: '1',
    category: 'Consumer Electronics',
    skuCount: '1,240',
    spikeVal: '+42%',
    spikeScore: 85,
    spikeColor: '#cf1322', // red
    confidence: '98%',
    confColor: '#13c2c2', // cyan
    status: 'Critical Peak',
    statusDot: 'error',
    action: 'Review',
    skuId: 'AZ-9042-X', // for demo navigation
  },
  {
    key: '2',
    category: 'Cold Chain Pharmaceuticals',
    skuCount: '412',
    spikeVal: '+18%',
    spikeScore: 40,
    spikeColor: '#006d75', // teal
    confidence: '92%',
    confColor: '#13c2c2',
    status: 'Predicted Rise',
    statusDot: 'default',
    action: 'Review',
    skuId: 'AZ-9042-X',
  },
  {
    key: '3',
    category: 'Industrial Components',
    skuCount: '2,880',
    spikeVal: '-5%',
    spikeScore: 10,
    spikeColor: '#d9d9d9', // gray
    confidence: '85%',
    confColor: '#13c2c2',
    status: 'Stable',
    statusDot: 'default',
    action: 'Review',
    skuId: 'AZ-9042-X',
  },
];

export const AiForecastPage: React.FC = () => {
  const navigate = useNavigate();

  const columns = [
    {
      title: 'PRODUCT CATEGORY',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Text style={{ fontWeight: 600, color: '#1f1f1f' }}>{text}</Text>,
    },
    {
      title: 'SKU COUNT',
      dataIndex: 'skuCount',
      key: 'skuCount',
      render: (text: string) => <Text style={{ color: '#595959' }}>{text}</Text>,
    },
    {
      title: 'PREDICTED SPIKE',
      key: 'spike',
      render: (_: any, record: any) => (
        <Space size={12}>
          <Text style={{ fontWeight: 600, color: record.spikeColor, width: '40px' }}>{record.spikeVal}</Text>
          <div style={{ width: '40px', height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${record.spikeScore}%`, height: '100%', backgroundColor: record.spikeColor }}></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'CONFIDENCE',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (text: string, record: any) => (
        <Tag color="#e6fffb" style={{ color: record.confColor, border: 'none', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>
          {text} Confidence
        </Tag>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      render: (_: any, record: any) => (
        <Badge status={record.statusDot as any} text={<span style={{ color: record.statusDot === 'error' ? '#cf1322' : '#595959', fontWeight: 500 }}>{record.status}</span>} />
      ),
    },
    {
      title: 'ACTION',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" style={{ fontWeight: 600, padding: 0 }} onClick={() => navigate(`/ai-forecast/${record.skuId}`)}>
          {record.action}
        </Button>
      ),
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 h-full overflow-y-auto w-full bg-[#fcfcfc] custom-antd-dashboard"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Equivalent Top Header inside the content layout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <Space size={24} align="center">
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>Predictive Logistics Engine</Title>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#595959', fontWeight: 500 }}>
              <span style={{ cursor: 'pointer' }}>Global View</span>
              <span style={{ cursor: 'pointer', color: '#0050b3', borderBottom: '2px solid #0050b3', paddingBottom: '4px' }}>Metrics</span>
              <span style={{ cursor: 'pointer' }}>Logs</span>
            </div>
          </Space>
          <Space size={16}>
            <Input 
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
              placeholder="Search predictive assets..." 
              style={{ width: '250px', borderRadius: '8px', backgroundColor: '#f0f0f0', border: 'none' }} 
            />
            <Badge dot>
              <BellOutlined style={{ fontSize: '18px', color: '#595959', cursor: 'pointer' }} />
            </Badge>
            <HistoryOutlined style={{ fontSize: '18px', color: '#595959', cursor: 'pointer' }} />
            <Button type="primary" style={{ backgroundColor: '#003eb3', borderRadius: '8px', fontWeight: 600 }}>
              Run AI Model
            </Button>
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" style={{ border: '1px solid #f0f0f0' }} />
          </Space>
        </div>

        {/* Page Title & Subtitle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Predictive Inventory Forecast</Title>
            <Text style={{ color: '#595959', fontSize: '16px' }}>Executive Overview &bull; Q3 Strategic Planning</Text>
          </div>
          <Tag color="#e6fffb" style={{ color: '#006d75', borderRadius: '16px', padding: '6px 16px', fontSize: '14px', fontWeight: 600, border: 'none' }}>
            <AimOutlined style={{ marginRight: '6px' }} /> AI Confidence: 94.8%
          </Tag>
        </div>

        {/* Top Cards Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          {/* Main Chart Card */}
          <Col xs={24} lg={16}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <Text style={{ fontSize: '13px', fontWeight: 700, color: '#003eb3', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PROJECTED DEMAND</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                    <Title level={1} style={{ margin: 0, fontSize: '56px', fontWeight: 800, lineHeight: 1 }}>142,800</Title>
                    <Text style={{ fontSize: '24px', color: '#8c8c8c' }}>Units</Text>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ display: 'block', color: '#595959', fontSize: '14px' }}>Next 30 Days</Text>
                  <Text style={{ color: '#cf1322', fontWeight: 700, fontSize: '15px' }}>📈 +12.4% vs Last Month</Text>
                </div>
              </div>
              
              {/* Mock Bar Chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', marginTop: '20px', gap: '16px' }}>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '30%', borderRadius: '8px 8px 0 0' }}></div>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '25%', borderRadius: '8px 8px 0 0' }}></div>
                <div style={{ flex: 1, backgroundColor: '#e6ebf5', height: '45%', borderRadius: '8px 8px 0 0' }}></div>
                <div style={{ flex: 1, backgroundColor: '#bae0ff', height: '60%', borderRadius: '8px 8px 0 0', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '50%', backgroundColor: '#003eb3', borderRadius: '0' }}></div>
                </div>
                <div style={{ flex: 1, backgroundColor: '#87e8de', height: '90%', borderRadius: '8px 8px 0 0', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)' }}>
                     <Tag color="#006d75" style={{ borderRadius: '12px', border: 'none', margin: 0, fontWeight: 600 }}>AI PREDICTION</Tag>
                   </div>
                   <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '65%', backgroundColor: '#64bbb3', borderRadius: '0' }}></div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'transparent', height: '70%', borderRadius: '8px 8px 0 0', border: '2px dashed #bfbfbf' }}></div>
              </div>
            </Card>
          </Col>

          {/* Right Smaller Cards */}
          <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', flex: 1, borderLeft: '4px solid #006d75' }}>
              <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1f1f1f', display: 'block', marginBottom: '16px' }}>Model Accuracy</Text>
              <Space align="start" size={16}>
                <Progress type="circle" percent={96} size={60} strokeColor="#006d75" strokeWidth={10} format={(p) => <span style={{ fontSize: '18px', fontWeight: 700, color: '#006d75' }}>{p}%</span>} />
                <Text style={{ color: '#595959', fontSize: '13px', lineHeight: 1.5 }}>
                  The <strong style={{ color: '#006d75' }}>NeuralForecaster v4</strong> model has maintained high precision despite recent logistics volatility.
                </Text>
              </Space>
            </Card>

            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', flex: 1 }}>
               <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1f1f1f', display: 'block', marginBottom: '16px' }}>Risk Exposure</Text>
               <div style={{ marginBottom: '16px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                   <Text style={{ color: '#595959', fontWeight: 500 }}>Out-of-Stock Risk</Text>
                   <Text style={{ color: '#cf1322', fontWeight: 700 }}>Moderate (14%)</Text>
                 </div>
                 <div style={{ width: '100%', height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                   <div style={{ width: '14%', height: '100%', backgroundColor: '#cf1322', borderRadius: '3px' }}></div>
                 </div>
               </div>
               <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                   <Text style={{ color: '#595959', fontWeight: 500 }}>Overstock Risk</Text>
                   <Text style={{ color: '#003eb3', fontWeight: 700 }}>Low (4%)</Text>
                 </div>
                 <div style={{ width: '100%', height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                   <div style={{ width: '4%', height: '100%', backgroundColor: '#003eb3', borderRadius: '3px' }}></div>
                 </div>
               </div>
            </Card>
          </Col>
        </Row>

        {/* Middle Section */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} lg={10}>
            <div style={{ backgroundColor: '#f0f2f5', padding: '24px', borderRadius: '16px', height: '100%' }}>
              <Space align="center" style={{ marginBottom: '20px' }}>
                 <ExperimentFilled style={{ color: '#006d75', fontSize: '20px' }} />
                 <Title level={4} style={{ margin: 0, fontWeight: 700 }}>AI Strategic Recommendations</Title>
              </Space>

              <Card style={{ borderRadius: '12px', border: 'none', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} styles={{ body: { padding: '16px' } }}>
                 <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ width: '48px', height: '48px', backgroundColor: '#69c0ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                     <span className="material-symbols-outlined text-[24px] text-white">local_shipping</span>
                   </div>
                   <div>
                     <Title level={5} style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Expedite SKU-8840</Title>
                     <Text style={{ color: '#595959', fontSize: '13px', display: 'block', lineHeight: 1.5, marginBottom: '12px' }}>
                       Forecast shows a 22% spike in West Coast demand. Order now to avoid $4.2k in lost revenue.
                     </Text>
                     <Link style={{ color: '#006d75', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>APPROVE PO &rarr;</Link>
                   </div>
                 </div>
              </Card>

              <Card style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} styles={{ body: { padding: '16px' } }}>
                 <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ width: '48px', height: '48px', backgroundColor: '#ffccc7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                     <HomeFilled style={{ fontSize: '20px', color: '#cf1322' }} />
                   </div>
                   <div>
                     <Title level={5} style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Consolidate Zone B</Title>
                     <Text style={{ color: '#595959', fontSize: '13px', display: 'block', lineHeight: 1.5, marginBottom: '12px' }}>
                       Low-velocity items detected in prime picking bays. Suggesting re-slotting for 12% speed gain.
                     </Text>
                     <Link style={{ color: '#cf1322', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>VIEW MAP &rarr;</Link>
                   </div>
                 </div>
              </Card>
            </div>
          </Col>

          <Col xs={24} lg={14}>
             <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                 <Text style={{ fontSize: '13px', fontWeight: 600, color: '#595959', letterSpacing: '1px', textTransform: 'uppercase' }}>HEATMAP: INVENTORY VELOCITY</Text>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Cold</Text>
                   <div style={{ width: '60px', height: '6px', background: 'linear-gradient(to right, #bae0ff, #0050b3, #13c2c2)', borderRadius: '3px' }}></div>
                   <Tag color="#13c2c2" style={{ border: 'none', margin: 0, padding: '0 8px', borderRadius: '10px', fontSize: '11px' }}>Hot</Tag>
                 </div>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
                 {/* Generated Heatmap Grid */}
                 {Array.from({ length: 40 }).map((_, i) => {
                   let bg = '#e6f4ff';
                   if (i === 11 || i === 23) bg = '#0050b3'; // Dark blue
                   if (i === 12 || i === 24 || i === 13) bg = '#006d75'; // Teal
                   if (i === 14 || i === 3) bg = '#69c0ff'; 
                   if (i === 2 || i === 22 || i === 32) bg = '#bae0ff';
                   if (i > 34) bg = '#f0f0f0'; // Cold
                   return <div key={i} style={{ aspectRatio: '4/3', backgroundColor: bg, borderRadius: '4px' }}></div>
                 })}
               </div>
             </Card>
          </Col>
        </Row>

        {/* Bottom Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Demand Spike Alerts</Title>
             <Link style={{ fontWeight: 600, color: '#003eb3' }}>View All Anomalies</Link>
          </div>

          <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} styles={{ body: { padding: 0 } }}>
             <Table 
               columns={columns} 
               dataSource={tableData} 
               pagination={false} 
               rowClassName={() => 'custom-table-row'}
             />
          </Card>
        </div>

      </div>

      <style>
        {`
          .custom-table-row td {
            padding: 20px 24px !important;
            border-bottom: 1px solid #f0f0f0 !important;
          }
          .custom-table-row:last-child td {
            border-bottom: none !important;
          }
          .custom-table-row th {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: '#8c8c8c' !important;
            letter-spacing: 0.5px !important;
            background-color: '#fafafa' !important;
          }
        `}
      </style>
    </motion.div>
  );
};
