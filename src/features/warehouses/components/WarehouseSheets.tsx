import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  warehouseFormSchema,
  warehouseLocationFormSchema,
  type WarehouseFormData,
  type WarehouseLocationFormData,
} from '../schemas/warehouseSchemas';
import type { WarehouseItem, WarehouseLocationItem } from '../types/warehouseType';

export function WarehouseFormDialog({
  open,
  onClose,
  mode,
  warehouse,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  warehouse: WarehouseItem | null;
  onSubmit: (payload: WarehouseFormData) => Promise<void>;
  isPending: boolean;
}) {
  const isView = mode === 'view';
  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      code: '',
      name: '',
      manager: '',
      address: '',
      description: '',
      capacityUsage: 0,
      status: 'operational',
    },
  });
  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      code: warehouse?.code ?? '',
      name: warehouse?.name ?? '',
      manager: warehouse?.manager ?? '',
      address: warehouse?.address ?? '',
      description: warehouse?.description ?? '',
      capacityUsage: warehouse?.capacityUsage ?? 0,
      status: warehouse?.status ?? 'operational',
    });
  }, [open, reset, warehouse]);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <form onSubmit={handleSubmit(async (payload) => { if (!isView) await onSubmit(payload); })} className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle>{mode === 'create' ? 'Create warehouse' : mode === 'edit' ? 'Update warehouse' : 'Warehouse detail'}</SheetTitle>
            <SheetDescription>Quản lý thông tin vận hành cốt lõi của kho.</SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5">
            <Field label="Code" error={errors.code?.message}><input {...register('code')} disabled={isView || isPending} className={inputClass(!!errors.code)} /></Field>
            <Field label="Warehouse name" error={errors.name?.message}><input {...register('name')} disabled={isView || isPending} className={inputClass(!!errors.name)} /></Field>
            <Field label="Manager" error={errors.manager?.message}><input {...register('manager')} disabled={isView || isPending} className={inputClass(!!errors.manager)} /></Field>
            <Field label="Address" error={errors.address?.message}><input {...register('address')} disabled={isView || isPending} className={inputClass(!!errors.address)} /></Field>
            <Field label="Capacity usage (%)" error={errors.capacityUsage?.message}><input type="number" {...register('capacityUsage', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.capacityUsage)} /></Field>
            <Field label="Status" error={errors.status?.message}><select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></select></Field>
            <Field label="Description" error={errors.description?.message}><textarea {...register('description')} disabled={isView || isPending} className={`${inputClass(!!errors.description)} min-h-32 resize-none`} /></Field>
          </div>
          <SheetFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{isView ? 'Đóng' : 'Hủy'}</button>
              {!isView ? <button type="submit" disabled={isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang lưu...' : 'Lưu kho'}</button> : null}
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function LocationFormDialog({
  open,
  onClose,
  mode,
  location,
  warehouses,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  location: WarehouseLocationItem | null;
  warehouses: WarehouseItem[];
  onSubmit: (payload: WarehouseLocationFormData) => Promise<void>;
  isPending: boolean;
}) {
  const isView = mode === 'view';
  const form = useForm<WarehouseLocationFormData>({
    resolver: zodResolver(warehouseLocationFormSchema),
    defaultValues: {
      warehouseId: '',
      code: '',
      zone: '',
      rack: '',
      level: '',
      bin: '',
      capacity: 0,
      currentLoad: 0,
      productCount: 0,
      status: 'active',
    },
  });
  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      warehouseId: location?.warehouseId ?? '',
      code: location?.code ?? '',
      zone: location?.zone ?? '',
      rack: location?.rack ?? '',
      level: location?.level ?? '',
      bin: location?.bin ?? '',
      capacity: location?.capacity ?? 0,
      currentLoad: location?.currentLoad ?? 0,
      productCount: location?.productCount ?? 0,
      status: location?.status ?? 'active',
    });
  }, [location, open, reset]);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <form onSubmit={handleSubmit(async (payload) => { if (!isView) await onSubmit(payload); })} className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle>{mode === 'create' ? 'Create location' : mode === 'edit' ? 'Update location' : 'Location detail'}</SheetTitle>
            <SheetDescription>Thiết lập zone, rack, level, bin và sức chứa cho vị trí lưu trữ.</SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
            <Field label="Warehouse" error={errors.warehouseId?.message}><select {...register('warehouseId')} disabled={isView || isPending} className={inputClass(!!errors.warehouseId)}><option value="">Select warehouse</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Code" error={errors.code?.message}><input {...register('code')} disabled={isView || isPending} className={inputClass(!!errors.code)} /></Field>
            <Field label="Zone" error={errors.zone?.message}><input {...register('zone')} disabled={isView || isPending} className={inputClass(!!errors.zone)} /></Field>
            <Field label="Rack" error={errors.rack?.message}><input {...register('rack')} disabled={isView || isPending} className={inputClass(!!errors.rack)} /></Field>
            <Field label="Level" error={errors.level?.message}><input {...register('level')} disabled={isView || isPending} className={inputClass(!!errors.level)} /></Field>
            <Field label="Bin" error={errors.bin?.message}><input {...register('bin')} disabled={isView || isPending} className={inputClass(!!errors.bin)} /></Field>
            <Field label="Status" error={errors.status?.message}><select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}><option value="active">Active</option><option value="blocked">Blocked</option><option value="inactive">Inactive</option></select></Field>
            <Field label="Capacity" error={errors.capacity?.message}><input type="number" {...register('capacity', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.capacity)} /></Field>
            <Field label="Current load" error={errors.currentLoad?.message}><input type="number" {...register('currentLoad', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.currentLoad)} /></Field>
            <Field label="Product count" error={errors.productCount?.message}><input type="number" {...register('productCount', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.productCount)} /></Field>
          </div>
          <SheetFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{isView ? 'Đóng' : 'Hủy'}</button>
              {!isView ? <button type="submit" disabled={isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang lưu...' : 'Lưu vị trí'}</button> : null}
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium text-slate-700"><span>{label}</span>{children}{error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}</label>;
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'}`;
}
