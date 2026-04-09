import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { useInboundDetail, useReceiveItems, useUploadInboundAttachment, useDeleteInboundAttachment } from '../hooks/useInboundDetail';
import { WorkflowStepper } from './WorkflowStepper';
import { InventoryItemsTable } from './InventoryItemsTable';
import { AttachmentsPanel } from './AttachmentsPanel';
import { OriginDestinationCard } from './OriginDestinationCard';
import { OrderSummary } from './OrderSummary';
import { AiInsightWidget } from './AiInsightWidget';
import { StatePanel } from '@/components/StatePanel';
import type { InboundLineItem } from '../types/inboundDetailType';

export function InboundDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canReceive = usePermission('inbound:receive');
  const canSeeValue = usePermission('inbound:view_value');

  const { data, isLoading, isError } = useInboundDetail(id ?? '');
  const receiveMutation = useReceiveItems(id ?? '');
  const uploadMutation = useUploadInboundAttachment(id ?? '');
  const deleteMutation = useDeleteInboundAttachment(id ?? '');

  const [items, setItems] = useState<InboundLineItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleQtyChange = useCallback((itemId: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, receivedQty: qty } : item,
      ),
    );
  }, []);

  const handleUpload = useCallback(
    (file: File) => {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 90) {
            clearInterval(interval);
            return 90;
          }
          return p + 10;
        });
      }, 100);

      uploadMutation.mutate(file, {
        onSuccess: () => {
          clearInterval(interval);
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(0), 500);
          toast({ title: 'File uploaded', description: 'Attachment added successfully' });
        },
        onError: () => {
          clearInterval(interval);
          setUploadProgress(0);
          toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
        },
      });
    },
    [uploadMutation, toast],
  );

  const handleDelete = useCallback(
    (attachmentId: string) => {
      deleteMutation.mutate(attachmentId, {
        onSuccess: () => {
          toast({ title: 'File deleted', description: 'Attachment removed' });
        },
        onError: () => {
          toast({ title: 'Delete failed', description: 'Please try again', variant: 'destructive' });
        },
      });
    },
    [deleteMutation, toast],
  );

  const handleReceiveItems = useCallback(() => {
    const payload = {
      items: items.map((item) => ({
        id: item.id,
        receivedQty: item.receivedQty,
      })),
    };

    receiveMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'Items received', description: 'Shipment status updated' });
      },
      onError: () => {
        toast({ title: 'Failed to receive', description: 'Please try again', variant: 'destructive' });
      },
    });
  }, [items, receiveMutation, toast]);

  if (!id) {
    return <StatePanel tone="error" title="Missing ID" description="No inbound ID provided" />;
  }

  if (isLoading) {
    return <StatePanel title="Loading shipment details..." description="Please wait" />;
  }

  if (isError || !data) {
    return <StatePanel tone="error" title="Failed to load" description="Could not fetch shipment details" />;
  }

  const displayItems = items.length > 0 ? items : data.items;
  const totalItems = data.items.length;

  return (
    <div className="space-y-5 p-3 md:p-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/inbound')}
            className="flex items-center gap-1 text-xs text-slate-500 mb-1 hover:text-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="uppercase tracking-widest font-medium">Inbound Logistics</span>
          </button>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {data.documentId}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Supplier: <span className="font-semibold text-slate-700">{data.supplierName}</span> • Received on {formatDate(data.receivedDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Save Draft
          </button>
          {canReceive && (
            <button
              onClick={handleReceiveItems}
              disabled={receiveMutation.isPending}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm flex items-center gap-1.5 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">task_alt</span>
              Receive Items
            </button>
          )}
        </div>
      </div>

      {/* Workflow Stepper */}
      <WorkflowStepper steps={data.workflow} />

      {/* Split Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Items Table + Summary */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Inventory Items</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{totalItems} SKUs total</span>
            </div>
          </div>

          <InventoryItemsTable
            items={displayItems}
            onQtyChange={handleQtyChange}
            canEdit={canReceive}
          />

          {canSeeValue && <OrderSummary data={data.orderSummary} />}
        </div>

        {/* Right: Sidebar */}
        <div className="col-span-12 xl:col-span-4 space-y-5">
          <OriginDestinationCard data={data.originDestination} />
          <AttachmentsPanel
            attachments={data.attachments}
            onUpload={handleUpload}
            onDelete={handleDelete}
            isUploading={uploadMutation.isPending}
            uploadProgress={uploadProgress}
          />
          <AiInsightWidget insight={data.aiInsight} />
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
