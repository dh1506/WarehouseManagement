import { useAuthStore } from '@/store/authStore';
import { InboundDetail } from '@/features/inbound/components/InboundDetail';
import { StockInWorkerView } from '@/features/inbound/components/StockInWorkerView';

/**
 * Route: /inbound/:id
 *
 * The seed assigns ALL permissions to ALL roles, so we cannot use
 * `stock_ins:approve` as the discriminator — every role has it.
 * Instead, we branch on the user's role name:
 *
 * - STAFF → worker putaway view (record received quantities, report discrepancies)
 * - Everything else (MANAGER, CEO, PURCHASING, INVENTORY, …) → full manager view
 *
 * Add more worker roles to WORKER_ROLES as needed.
 */
const WORKER_ROLES = new Set(['STAFF']);

function normalizeRoleValue(role: unknown): string {
  if (typeof role === 'string') {
    return role;
  }

  if (role && typeof role === 'object' && 'name' in role) {
    const name = (role as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }

  return '';
}

export function InboundDetailPage() {
  const user = useAuthStore((state) => state.user);
  const role = normalizeRoleValue(user?.role).trim().toUpperCase();

  if (WORKER_ROLES.has(role)) {
    return <StockInWorkerView />;
  }

  return <InboundDetail />;
}
