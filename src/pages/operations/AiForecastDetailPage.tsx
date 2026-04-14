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
  Breadcrumb,
  Avatar,
  Badge
} from 'antd';
import {
  DownloadOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  InfoCircleFilled,
  AimOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text, Link } = Typography;

const breakdownData = [
  {
    key: '1',
    timeframe: 'Mar 15 - Mar 21',
    volume: '1,200',
    volMargin: '± 45',
    confValue: 98,
    confColor: '#006d75',
    suggestion: 'Maintain High Stock',
    sugColor: '#006d75',
  },
  {
    key: '2',
    timeframe: 'Mar 22 - Mar 28',
    volume: '1,450',
    volMargin: '± 80',
    confValue: 85,
    confColor: '#0050b3',
    suggestion: 'Expedite Shipments',
    sugColor: '#0050b3',
  },
  {
    key: '3',
    timeframe: 'Mar 29 - Apr 04',
    volume: '980',
    volMargin: '± 120',
    confValue: 62,
    confColor: '#cf1322',
    suggestion: 'Monitor Trend closely',
    sugColor: '#cf1322',
  },
];

export const AiForecastDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { sku } = useParams();

  const columns = [
    {
      title: 'TIMEFRAME',
      dataIndex: 'timeframe',
      key: 'timeframe',
      render: (text: string) => <Text style={{ fontWeight: 600, color: '#1f1f1f' }}>{text}</Text>,
    },
    {
      title: 'PREDICTED VOLUME',
      key: 'volume',
      render: (_: any, record: any) => (
        <Space size={4}>
          <Text style={{ fontWeight: 600 }}>{record.volume}</Text>
          <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.volMargin}</Text>
        </Space>
      ),
    },
    {
      title: 'CONFIDENCE',
      key: 'confidence',
      render: (_: any, record: any) => (
        <Space size={12} align="center">
          <div style={{ width: '60px', height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${record.confValue}%`, height: '100%', backgroundColor: record.confColor }}></div>
          </div>
          <Text style={{ fontWeight: 600, color: record.confColor }}>{record.confValue}%</Text>
        </Space>
      ),
    },
    {
      title: 'INVENTORY SUGGESTION',
      dataIndex: 'suggestion',
      key: 'suggestion',
      render: (text: string, record: any) => <Text style={{ fontWeight: 500, color: record.sugColor }}>{text}</Text>,
    },
    {
      title: 'ACTION',
      key: 'action',
      align: 'right' as const,
      render: () => <Link style={{ fontWeight: 600, color: '#003eb3' }}>Modify</Link>,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 md:p-8 h-full overflow-y-auto w-full bg-[#fcfcfc] custom-antd-dashboard"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Top Header Equivalent */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>Predictive Logistics Engine</Title>
        </div>

        {/* Breadcrumb & Title Area */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Breadcrumb style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
              <Breadcrumb.Item><Link onClick={() => navigate('/ai-forecast')}>Forecasts</Link></Breadcrumb.Item>
              <Breadcrumb.Item style={{ color: '#003eb3', fontWeight: 600 }}>SKU: {sku || 'AZ-9042-X'}</Breadcrumb.Item>
            </Breadcrumb>
            
            <Title level={1} style={{ margin: '0 0 12px 0', fontWeight: 700, fontSize: '32px' }}>
              Industrial Valve Assembly <span style={{ color: '#006d75', fontWeight: 400 }}>/ AI Prediction</span>
            </Title>
            <Text style={{ color: '#595959', fontSize: '15px', maxWidth: '600px', display: 'block', lineHeight: 1.5 }}>
              Quarterly demand forecast synthesized from global logistics trends, regional construction indices, and 24-month historical cycles.
            </Text>
          </div>
          
          <Space size={16}>
            <Button size="large" icon={<DownloadOutlined />} style={{ backgroundColor: '#f0f2f5', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
              Export Dataset
            </Button>
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} style={{ backgroundColor: '#003eb3', borderRadius: '8px', padding: '0 24px', fontWeight: 600 }}>
              Approve AI Suggestion
            </Button>
          </Space>
        </div>

        {/* Top Cards Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={8}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                 <Tag color="#006d75" style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, margin: 0, border: 'none' }}>CONFIDENCE SCORE</Tag>
                 <AimOutlined style={{ fontSize: '20px', color: '#006d75' }} />
               </div>
               
               <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                 <Title level={1} style={{ margin: 0, fontSize: '56px', fontWeight: 700 }}>94.2</Title>
                 <Text style={{ fontSize: '24px', color: '#bfbfbf', fontWeight: 600 }}>%</Text>
               </div>
               
               <Text style={{ color: '#595959', fontSize: '14px', display: 'block', lineHeight: 1.6, marginBottom: '48px' }}>
                 High-certainty model based on low volatility in raw material supply and confirmed future delivery contracts.
               </Text>
               
               <div style={{ marginTop: 'auto' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <Text style={{ fontWeight: 600, fontSize: '13px' }}>Model Stability</Text>
                   <Text style={{ color: '#006d75', fontWeight: 700, fontSize: '13px' }}>Exceptional</Text>
                 </div>
                 <div style={{ width: '100%', height: '6px', backgroundColor: '#e6ebf5', borderRadius: '3px' }}>
                   <div style={{ width: '90%', height: '100%', backgroundColor: '#006d75', borderRadius: '3px' }}></div>
                 </div>
               </div>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
             <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                 <div>
                   <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Demand Projection (90 Days)</Title>
                   <Text style={{ fontSize: '11px', color: '#8c8c8c', letterSpacing: '1px', textTransform: 'uppercase' }}>UNITS PER WEEK</Text>
                 </div>
                 <Space size={16}>
                   <Badge color="#e6f4ff" text={<span style={{ fontSize: '12px', color: '#595959' }}>Historical</span>} />
                   <Badge color="#87e8de" text={<span style={{ fontSize: '12px', color: '#006d75', fontWeight: 600 }}>AI Forecast</span>} />
                 </Space>
               </div>
               
               {/* Mock Chart Area */}
               <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', position: 'relative', marginTop: '20px' }}>
                 {/* Historical Bars */}
                 <div style={{ flex: 1, backgroundColor: '#f5f5f5', height: '30%', borderRadius: '4px 4px 0 0' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#f5f5f5', height: '35%', borderRadius: '4px 4px 0 0' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#f5f5f5', height: '40%', borderRadius: '4px 4px 0 0' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#f5f5f5', height: '45%', borderRadius: '4px 4px 0 0' }}></div>
                 
                 {/* TODAY separator */}
                 <div style={{ width: '2px', height: '100%', backgroundColor: '#bfbfbf', position: 'relative', margin: '0 4px' }}>
                   <span style={{ position: 'absolute', top: '10px', left: '-18px', fontSize: '10px', color: '#8c8c8c', fontWeight: 700, letterSpacing: '1px' }}>TODAY</span>
                 </div>
                 
                 {/* AI Forecast Bars */}
                 <div style={{ flex: 1, backgroundColor: '#bae0ff', height: '60%', borderRadius: '4px 4px 0 0', borderTop: '3px solid #0050b3' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#bae0ff', height: '85%', borderRadius: '4px 4px 0 0', borderTop: '3px solid #0050b3' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#bae0ff', height: '90%', borderRadius: '4px 4px 0 0', borderTop: '3px solid #0050b3' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#bae0ff', height: '70%', borderRadius: '4px 4px 0 0', borderTop: '3px solid #0050b3' }}></div>
                 <div style={{ flex: 1, backgroundColor: '#bae0ff', height: '65%', borderRadius: '4px 4px 0 0', borderTop: '3px solid #0050b3' }}></div>
               </div>
               
               {/* Chart X Axis Labels */}
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 20px', color: '#8c8c8c', fontSize: '11px', fontWeight: 600 }}>
                 <span>JAN 15</span>
                 <span>FEB 01</span>
                 <span>FEB 15</span>
                 <span>MAR 01</span>
                 <span>MAR 15</span>
                 <span>APR 01</span>
                 <span>APR 15</span>
               </div>
             </Card>
          </Col>
        </Row>

        {/* Middle Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          
          {/* Historical Delta */}
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%', backgroundColor: '#fafafa' }}>
              <Text style={{ fontSize: '12px', fontWeight: 700, color: '#595959', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '24px' }}>
                HISTORICAL DELTA
              </Text>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
                <Text style={{ fontWeight: 600, fontSize: '15px' }}>vs Last Month</Text>
                <Text style={{ color: '#cf1322', fontWeight: 700, fontSize: '16px' }}>📈 +12.4%</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <Text style={{ fontWeight: 600, fontSize: '15px' }}>vs Same Period (LY)</Text>
                <Text style={{ color: '#006d75', fontWeight: 700, fontSize: '16px' }}>📉 -4.2%</Text>
              </div>
              
              <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', marginTop: 'auto' }}>
                <Text style={{ fontSize: '12px', lineHeight: 1.5, color: '#595959', display: 'block' }}>
                  <strong style={{ color: '#1f1f1f' }}>Insight:</strong> The current projection mimics the 2022 Q2 rally but with improved logistics throughput efficiency.
                </Text>
              </div>
            </Card>
          </Col>
          
          {/* Stock Optimization */}
          <Col xs={24} md={8}>
            <Card style={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 4px 20px rgba(0, 80, 179, 0.2)', 
              height: '100%', 
              background: 'linear-gradient(135deg, #0050b3 0%, #002c8c 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <Text style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
                STOCK OPTIMIZATION
              </Text>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '32px' }}>
                <Title level={1} style={{ margin: 0, fontSize: '48px', fontWeight: 700, color: 'white' }}>4,250</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px' }}>Units</Text>
              </div>
              
              <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: '32px' }}>
                <Space>
                  <InfoCircleFilled style={{ color: '#69c0ff' }} />
                  <Text style={{ color: 'white', fontWeight: 500 }}>Optimal Safety Stock: 850 units</Text>
                </Space>
                <Space>
                  <span className="material-symbols-outlined text-[16px] text-[#69c0ff]">local_shipping</span>
                  <Text style={{ color: 'white', fontWeight: 500 }}>Lead Time Buffer: +14 days</Text>
                </Space>
              </Space>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button style={{ flex: 1, height: '44px', borderRadius: '8px', fontWeight: 600, color: '#003eb3' }}>
                  Apply All
                </Button>
                <Button style={{ height: '44px', width: '44px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }} icon={<SettingOutlined />} />
              </div>
              
              {/* Insight Float Overlay */}
              <div style={{ 
                position: 'absolute', 
                right: '-40px', 
                top: '60px', 
                width: '320px', 
                backgroundColor: 'rgba(255,255,255,0.95)', 
                backdropFilter: 'blur(8px)',
                padding: '20px', 
                borderRadius: '16px', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ backgroundColor: '#e6fffb', padding: '8px', borderRadius: '50%', height: 'fit-content' }}>
                    <AimOutlined style={{ color: '#006d75', fontSize: '20px' }} />
                  </div>
                  <div>
                    <Text style={{ display: 'block', fontWeight: 700, color: '#1f1f1f', marginBottom: '4px' }}>AI Optimization Insight</Text>
                    <Text style={{ fontSize: '12px', color: '#595959', display: 'block', lineHeight: 1.5, marginBottom: '16px' }}>
                      Lowering safety stock by 5% for this SKU could save $12,400 in holding costs without impacting fulfillment rate.
                    </Text>
                    <Space size={16}>
                      <Link style={{ fontSize: '12px', fontWeight: 700, color: '#0050b3' }}>ANALYZE ROI</Link>
                      <Link style={{ fontSize: '12px', fontWeight: 600, color: '#8c8c8c' }}>DISMISS</Link>
                    </Space>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          
          {/* Inference Factors */}
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%', backgroundColor: '#f0f2f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <Text style={{ fontSize: '12px', fontWeight: 700, color: '#595959', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  INFERENCE FACTORS
                </Text>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px' }}>
                  <Text style={{ fontWeight: 600 }}>Weather Patterns</Text>
                  <Tag color="cyan" style={{ margin: 0, borderRadius: '4px', border: 'none' }}>Neutral</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px' }}>
                  <Text style={{ fontWeight: 600 }}>Regional Demand</Text>
                  <Tag color="blue" style={{ margin: 0, borderRadius: '4px', border: 'none', fontWeight: 600 }}>High Positive</Tag>
                </div>
              </div>
              
              {/* Optional Placeholder Agent Avatar from mockup */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                 <div style={{ width: '120px', height: '120px', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=200&auto=format&fit=crop" alt="AI Agent" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%)' }} />
                 </div>
              </div>
            </Card>
          </Col>
          
        </Row>

        {/* Bottom Table */}
        <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} styles={{ body: { padding: 0 } }}>
           <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Weekly Breakdowns & Recommendations</Title>
             <Text style={{ color: '#8c8c8c', fontSize: '13px' }}><HistoryOutlined /> Last updated 12 mins ago</Text>
           </div>
           
           <Table 
             columns={columns} 
             dataSource={breakdownData} 
             pagination={false} 
             rowClassName={() => 'custom-table-row'}
           />
        </Card>

      </div>

      <style>
        {`
          .custom-table-row td {
            padding: 24px !important;
            border-bottom: 1px dashed #f0f0f0 !important;
          }
          .custom-table-row:last-child td {
            border-bottom: none !important;
          }
          .custom-table-row th {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: '#bfbfbf' !important;
            letter-spacing: 1px !important;
            background-color: transparent !important;
            text-transform: uppercase !important;
            padding: 16px 24px !important;
          }
        `}
      </style>
    </motion.div>
  );
};
