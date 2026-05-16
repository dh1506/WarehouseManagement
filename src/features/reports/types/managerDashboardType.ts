// ── Shared ────────────────────────────────────────────────────────────────────

const AGING_THRESHOLD_HOURS = 2;

export function computeHoursAging(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

export { AGING_THRESHOLD_HOURS };

// ── Widget 1: Workflow Backlog ────────────────────────────────────────────────

export interface BacklogItem {
  id: number;
  code: string;
  status: string;
  created_at: string;
  hoursAging: number;
  path: string;
}

export interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface WorkflowData {
  inbound: BacklogItem[];
  outbound: BacklogItem[];
  audits: BacklogItem[];
  agingInbound: BacklogItem[];
  agingOutbound: BacklogItem[];
  funnelOutbound: FunnelStep[];
}

// ── Widget 2: Inventory Alerts ────────────────────────────────────────────────

export interface AlertSkuItem {
  productId: string;
  sku: string;
  productName: string;
  available: number;
  minStock: number;
  isBlocked: boolean;
}

export interface InventoryAlertData {
  criticalSkus: AlertSkuItem[];
  blockedSkus: AlertSkuItem[];
  blockedCount: number;
  lowStockCount: number;
}

// ── Widget 3: Zone Health ─────────────────────────────────────────────────────

export type ZoneStatus = 'ok' | 'warn' | 'critical';

export interface ZoneData {
  id: number;
  name: string;
  code: string;
  itemCount: number;
  occupancyPct: number;
  status: ZoneStatus;
}

export interface ExceptionItem {
  id: number;
  code: string;
  description: string | null;
  created_at: string;
}

export interface ZoneHealthData {
  zones: ZoneData[];
  exceptions: ExceptionItem[];
}

// ── Widget 4: Workforce ───────────────────────────────────────────────────────

export interface WorkerItem {
  id: string;
  name: string;
  role: string;
  lastLogin: string;
  tasksDone: number;
  tasksTotal: number;
  isOnline: boolean;
  isOverloaded: boolean;
}
