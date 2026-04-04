import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { WorkflowPriority, WorkflowScenario } from '../types/approvalConfigType';

interface NewScenarioDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Pick<WorkflowScenario, 'name' | 'description' | 'priority'>) => void;
  isPending: boolean;
}

export function NewScenarioDialog({ open, onClose, onSave, isPending }: NewScenarioDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkflowPriority>('normal');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), priority });
    setName('');
    setDescription('');
    setPriority('normal');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-sm">Thêm quy trình mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tên quy trình <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Outbound Shipment"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả ngắn về quy trình này..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mức ưu tiên
            </label>
            <div className="flex gap-2">
              {(['high', 'financial', 'normal'] as WorkflowPriority[]).map((p) => {
                const labels: Record<WorkflowPriority, string> = {
                  high: 'Cao',
                  financial: 'Tài chính',
                  normal: 'Thông thường',
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      priority === p
                        ? 'bg-blue-800 text-white border-blue-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            className="px-5 py-2 text-sm font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Đang tạo...' : 'Tạo quy trình'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
