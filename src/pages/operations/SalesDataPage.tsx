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
  Pagination,
} from 'antd';
import {
  FilterOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  MoreOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { motion } from 'motion/react';

const { Title, Text, Link } = Typography;

const tableData = [
  {
    key: '1',
    id: '#SLS-2024-001',
    timestamp: '2024-05-12 09:42',
    category: 'Electronics',
    catColor: 'blue',
    region: 'North America',
    regionCode: 'NA-W',
    units: '1,240',
    revenue: '$42,900',
    health: 'Verified',
    healthStatus: 'success',
    action: null,
  },
  {
    key: '2',
    id: '#SLS-2024-002',
    timestamp: '2024-05-12 08:15',
    category: 'Furniture',
    catColor: 'default',
    region: 'Europe',
    regionCode: 'EU-C',
    units: '450',
    revenue: '$118,200',
    health: 'Verified',
    healthStatus: 'success',
    action: null,
  },
  {
    key: '3',
    id: '#SLS-2024-003',
    timestamp: '2024-05-11 23:59',
    category: 'Apparel',
    catColor: 'volcano',
    region: 'Asia',
    regionCode: 'AS-S',
    units: '--',
    unitsError: true,
    revenue: '$0.00',
    health: 'Missing Units',
    healthStatus: 'error',
    action: 'Resolve',
  },
  {
    key: '4',
    id: '#SLS-2024-004',
    timestamp: '2024-05-11 21:04',
    category: 'Electronics',
    catColor: 'blue',
    region: 'North America',
    regionCode: 'NA-E',
    units: '88',
    revenue: '$3,100',
    health: 'Verified',
    healthStatus: 'success',
    action: null,
  },
  {
    key: '5',
    id: '#SLS-2024-005',
    timestamp: '2024-05-11 18:30',
    category: 'Industrial',
    catColor: 'default',
    region: 'South America',
    regionCode: 'SA-N',
    units: '12',
    revenue: '$12,450',
    health: 'Verified',
    healthStatus: 'success',
    action: null,
  },
];

const columns = [
  {
    title: 'TRANSACTION ID',
    dataIndex: 'id',
    key: 'id',
    render: (text: string) => <Link style={{ fontWeight: 600, color: '#003eb3' }}>{text}</Link>,
  },
  {
    title: 'TIMESTAMP',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: (text: string) => {
      const [date, time] = text.split(' ');
      return (
        <div>
          <div style={{ color: '#1f1f1f' }}>{date}</div>
          <div style={{ color: '#595959' }}>{time}</div>
        </div>
      );
    },
  },
  {
    title: 'CATEGORY',
    dataIndex: 'category',
    key: 'category',
    render: (text: string, record: any) => (
      <Tag color={record.catColor === 'default' ? '#f5f5f5' : record.catColor === 'blue' ? '#e6f4ff' : '#fff2e8'} 
           style={{ color: record.catColor === 'default' ? '#595959' : record.catColor === 'blue' ? '#0050b3' : '#d4380d', border: 'none', borderRadius: '4px', fontWeight: 500 }}>
        {text}
      </Tag>
    ),
  },
  {
    title: 'REGION',
    key: 'region',
    render: (_: any, record: any) => (
      <div>
        <div style={{ color: '#1f1f1f' }}>{record.region}</div>
        <div style={{ color: '#595959' }}>({record.regionCode})</div>
      </div>
    ),
  },
  {
    title: 'UNITS SOLD',
    dataIndex: 'units',
    key: 'units',
    render: (text: string, record: any) => (
      <Text style={{ fontWeight: 600, color: record.unitsError ? '#cf1322' : '#1f1f1f' }}>{text}</Text>
    ),
  },
  {
    title: 'REVENUE',
    dataIndex: 'revenue',
    key: 'revenue',
    render: (text: string) => <Text style={{ fontWeight: 600, color: '#1f1f1f' }}>{text}</Text>,
  },
  {
    title: 'QUALITY HEALTH',
    dataIndex: 'health',
    key: 'health',
    render: (text: string, record: any) => (
      <Badge status={record.healthStatus as any} text={<span style={{ fontWeight: 500, color: record.healthStatus === 'error' ? '#cf1322' : '#006d75' }}>{text}</span>} />
    ),
  },
  {
    title: 'ACTIONS',
    key: 'action',
    render: (_: any, record: any) => (
      record.action ? <Link style={{ color: '#cf1322', fontWeight: 600, textDecoration: 'underline' }}>{record.action}</Link> : null
    ),
  },
];

export const SalesDataPage: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 h-full overflow-y-auto w-full bg-[#fcfcfc] custom-antd-table-page"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Text style={{ color: '#0050b3', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              DATA TRAINING <span style={{ color: '#bfbfbf', margin: '0 8px' }}>&gt;</span> SALES ARCHIVES
            </Text>
            <Title level={1} style={{ margin: '8px 0 12px 0', fontWeight: 700, fontSize: '32px', color: '#1f1f1f' }}>
              Sales Data Management
            </Title>
            <Text style={{ color: '#595959', fontSize: '15px', maxWidth: '700px', display: 'block', lineHeight: 1.5 }}>
              Manage historical sales transactions used to train the Predictive Engine. Clean, filter, and validate high-density data for forecasting accuracy.
            </Text>
          </div>
          
          <Space size={16} align="start">
            <Button size="large" icon={<FilterOutlined />} style={{ backgroundColor: '#f0f0f0', border: 'none', borderRadius: '8px', padding: '0 24px', fontWeight: 600, color: '#1f1f1f' }}>
              Refine View
            </Button>
            <Button type="primary" size="large" icon={<ImportOutlined />} style={{ backgroundColor: '#003eb3', borderRadius: '8px', padding: '0 24px', fontWeight: 600 }}>
              Import Batch
            </Button>
          </Space>
        </div>

        {/* Top Cards Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          {/* Card 1 */}
          <Col xs={24} lg={12}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
              <div style={{ marginBottom: '16px' }}>
                <Tag color="#006d75" style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 600, border: 'none' }}>AI READY</Tag>
              </div>
              <Text style={{ fontSize: '13px', fontWeight: 600, color: '#595959', display: 'block', marginBottom: '8px' }}>Data Quality Health</Text>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '24px' }}>
                <Title level={1} style={{ margin: 0, fontSize: '48px', fontWeight: 700 }}>98.4%</Title>
                <Text style={{ color: '#006d75', fontWeight: 600, fontSize: '16px' }}>&#128200; +1.2%</Text>
              </div>
              
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e6ebf5', borderRadius: '3px' }}>
                <div style={{ width: '98.4%', height: '100%', backgroundColor: '#006d75', borderRadius: '3px' }}></div>
              </div>
            </Card>
          </Col>

          {/* Card 2 */}
          <Col xs={24} md={12} lg={6}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', borderLeft: '4px solid #003eb3', height: '100%' }}>
              <Text style={{ fontSize: '12px', fontWeight: 600, color: '#595959', letterSpacing: '0.5px' }}>TOTAL RECORDS</Text>
              <Title level={2} style={{ margin: '12px 0 8px 0', fontSize: '32px', fontWeight: 700 }}>1.2M+</Title>
              <Text style={{ color: '#8c8c8c', fontSize: '13px' }}>Aggregated from 12 channels</Text>
            </Card>
          </Col>

          {/* Card 3 */}
          <Col xs={24} md={12} lg={6}>
            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
              <Text style={{ fontSize: '12px', fontWeight: 600, color: '#595959', letterSpacing: '0.5px' }}>ANOMALIES DETECTED</Text>
              <Title level={2} style={{ margin: '12px 0 16px 0', fontSize: '36px', fontWeight: 700, color: '#cf1322' }}>142</Title>
              <Tag color="#cf1322" style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 600, border: 'none', margin: 0 }}>Action Required</Tag>
            </Card>
          </Col>
        </Row>

        {/* Table Section */}
        <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginBottom: '32px' }} styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={16} align="center">
              <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Historical Archives</Title>
              <Tag color="#f0f0f0" style={{ color: '#595959', border: 'none', borderRadius: '12px', fontWeight: 600 }}>FY 2023-24</Tag>
              <Tag color="#e6fffb" style={{ color: '#006d75', border: 'none', borderRadius: '12px', fontWeight: 600 }}>Training Set Active</Tag>
            </Space>
            <Space size={16}>
              <Button type="text" icon={<DownloadOutlined style={{ fontSize: '18px' }} />} />
              <Button type="text" icon={<MoreOutlined style={{ fontSize: '18px' }} />} />
            </Space>
          </div>
          
          <Table 
            columns={columns} 
            dataSource={tableData} 
            pagination={false} 
            rowClassName={() => 'custom-table-row'}
          />
          
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
            <Text style={{ color: '#595959', fontSize: '13px' }}>Showing 1 to 5 of 1.2M records</Text>
            <Pagination defaultCurrent={1} total={30} showSizeChanger={false} />
          </div>
        </Card>

        {/* Upload Section */}
        <div style={{ 
          backgroundColor: '#fafafa', 
          border: '2px dashed #d9d9d9', 
          borderRadius: '16px', 
          padding: '48px 24px', 
          textAlign: 'center'
        }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#e6f4ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <CloudUploadOutlined style={{ fontSize: '24px', color: '#003eb3' }} />
          </div>
          <Title level={4} style={{ margin: '0 0 12px 0', fontWeight: 700 }}>Drop New Sales Data Batch</Title>
          <Text style={{ color: '#595959', fontSize: '14px', display: 'block', maxWidth: '400px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            Support for .csv, .xlsx, and .json formats. AI will automatically map columns to the predictive schema.
          </Text>
          <Space size={16}>
            <Button size="large" style={{ borderRadius: '8px', padding: '0 32px', fontWeight: 600 }}>
              Select Files
            </Button>
            <Button type="primary" size="large" style={{ backgroundColor: '#006d75', borderRadius: '8px', padding: '0 32px', fontWeight: 600 }}>
              Integrate via API
            </Button>
          </Space>
        </div>

      </div>

      <style>
        {`
          .custom-table-row td {
            padding: 16px 24px !important;
            border-bottom: 1px solid #f0f0f0 !important;
            font-size: 14px;
          }
          .custom-table-row th {
            color: '#8c8c8c' !important;
            font-weight: 600 !important;
            font-size: 12px !important;
            letter-spacing: 0.5px !important;
            padding: 12px 24px !important;
            background-color: transparent !important;
          }
        `}
      </style>
    </motion.div>
  );
};
