import { useState } from 'react';
import { useInboundOrder, useTransitionInboundStatus } from '../hooks/useInbound';
import { StatePanel } from '@/components/StatePanel';
import { InboundStatusBadge } from './InboundStatusBadge';
import { StatusTransitionDialog } from './StatusTransitionDialog';
import { INBOUND_STATUS_TRANSITIONS } from '../types/inboundType';
import type { InboundStatus } from '../types/inboundType';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function InboundDetail({ id }: { id: string }) {
  const { data: order, isLoading, isError, refetch } = useInboundOrder(id);
  const transitionMutation = useTransitionInboundStatus(id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<InboundStatus | null>(null);

  if (isLoading) {
    return <StatePanel title="Loading order details..." description="" icon="hourglass_top" />;
  }

  if (isError || !order) {
    return (
      <StatePanel
        title="Failed to load details"
        description="Unable to retrieve inbound order information."
        tone="error"
        icon="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const nextStatuses = INBOUND_STATUS_TRANSITIONS[order.status] || [];

  const handleOpenDialog = (status: InboundStatus) => {
    setTargetStatus(status);
    setDialogOpen(true);
  };

  const handleConfirmTransition = (note: string) => {
    if (targetStatus) {
      transitionMutation.mutate(
        { newStatus: targetStatus, note },
        {
          onSuccess: () => setDialogOpen(false),
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-slate-900">{order.code}</h2>
            <InboundStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500">
            Created on {new Date(order.createdAt).toLocaleString('en-US')} by <span className="font-semibold">{order.createdBy}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-slate-400">Warehouse: </span>
              <span className="font-semibold text-slate-700">{order.warehouseName}</span>
            </div>
            <div>
              <span className="text-slate-400">Supplier: </span>
              <span className="font-semibold text-slate-700">{order.supplierName || 'N/A'}</span>
            </div>
            {order.supplierRef && (
              <div>
                <span className="text-slate-400">Ref: </span>
                <span className="font-semibold text-slate-700">{order.supplierRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {nextStatuses.map((status) => (
            <Button key={status} onClick={() => handleOpenDialog(status)} variant={status === 'CANCELLED' ? 'destructive' : 'default'}>
              Set {status}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList className="bg-white border text-md px-1 py-1 rounded-xl shadow-sm">
          <TabsTrigger value="items" className="rounded-lg">Line Items</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg">Audit Log & History</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Received Items ({order.lineItems.length})</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Lot / Expiry</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Req. Qty</TableHead>
                  <TableHead className="text-right">Rec. Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-semibold text-sm text-slate-900">{item.productCode}</p>
                      <p className="text-xs text-slate-500">{item.productName}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-700 border border-blue-100">
                        {item.locationCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.lotNumber}</p>
                      <p className="text-xs text-slate-500">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'No expiry'}</p>
                    </TableCell>
                    <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{item.requestedQty} {item.unitName}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${item.receivedQty >= item.requestedQty ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item.receivedQty}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Activity History</h3>
          <div className="pl-4 border-l-2 border-slate-100 space-y-6">
            {order.note && (
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white ring-2 ring-slate-100" />
                <p className="text-xs text-slate-500 mb-1">{new Date(order.updatedAt).toLocaleString()}</p>
                <div className="bg-slate-50 text-sm text-slate-700 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold block mb-1">Status changed or note added</span>
                  <p className="whitespace-pre-wrap">{order.note}</p>
                </div>
              </div>
            )}
            <div className="relative">
              <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white ring-2 ring-primary/20" />
              <p className="text-xs text-slate-500 mb-1">{new Date(order.createdAt).toLocaleString()}</p>
              <p className="text-sm text-slate-700">
                Order <span className="font-semibold">{order.code}</span> was originally drafted by <span className="font-semibold">{order.createdBy}</span>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <StatusTransitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetStatus={targetStatus}
        onConfirm={handleConfirmTransition}
        isPending={transitionMutation.isPending}
      />
    </div>
  );
}
