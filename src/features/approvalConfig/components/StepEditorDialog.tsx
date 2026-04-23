import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { WorkflowStep } from '../types/approvalConfigType';
import { generateId } from '@/services/approvalConfigService';

// Mock roles — phải đồng bộ với roleService khi BE có API
const ROLES = [
  { id: '3', name: 'Staff' },
  { id: '2', name: 'Warehouse Manager' },
  { id: '1', name: 'Director' },
  { id: '4', name: 'Auditor (Internal)' },
];

interface StepEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (step: WorkflowStep) => void;
  initialStep?: WorkflowStep | null;
  stepNumber: number;
}

export function StepEditorDialog({
  open,
  onClose,
  onSave,
  initialStep,
  stepNumber,
}: StepEditorDialogProps) {
  const isEdit = !!initialStep;

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const [description, setDescription] = useState('');
  const [slaHours, setSlaHours] = useState<string>('');

  // Reset form khi mở
  useEffect(() => {
    if (open) {
      if (initialStep) {
        setName(initialStep.name);
        setRoleId(initialStep.roleId);
        setDescription(initialStep.description);
        setSlaHours(initialStep.slaHours !== undefined ? String(initialStep.slaHours) : '');
      } else {
        setName('');
        setRoleId(ROLES[0].id);
        setDescription('');
        setSlaHours('');
      }
    }
  }, [open, initialStep]);

  const handleSave = () => {
    if (!name.trim() || !description.trim()) return;
    const selectedRole = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
    const step: WorkflowStep = {
      id: initialStep?.id ?? generateId(),
      stepNumber,
      name: name.trim(),
      roleId: selectedRole.id,
      roleName: selectedRole.name,
      description: description.trim(),
      slaHours: slaHours ? Number(slaHours) : undefined,
    };
    onSave(step);
    onClose();
  };

  const isValid = name.trim().length > 0 && description.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-sm">
            {isEdit ? 'Chỉnh sửa bước' : `Thêm bước mới (Step ${stepNumber})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tên bước */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tên bước <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Verification & Review"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            />
          </div>

          {/* Vai trò */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Vai trò phụ trách <span className="text-red-500">*</span>
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* SLA */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              SLA (giờ) — tùy chọn
            </label>
            <input
              type="number"
              min={1}
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              placeholder="VD: 4"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Mô tả nhiệm vụ và yêu cầu cho bước này..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 resize-none"
            />
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
            disabled={!isValid}
            className="px-5 py-2 text-sm font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? 'Lưu thay đổi' : 'Thêm bước'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
