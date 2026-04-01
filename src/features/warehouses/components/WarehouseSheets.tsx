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
      isActive: true,
    },
  });
  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      code: warehouse?.code ?? '',
      name: warehouse?.name ?? '',
      isActive: warehouse?.isActive ?? true,
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
            <Field label="Trạng thái hoạt động" error={errors.isActive?.message}>
              <select {...register('isActive', { setValueAs: (value) => value === 'true' })} disabled={isView || isPending} className={inputClass(!!errors.isActive)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Warehouse master trong scope hiện tại chỉ lưu thông tin nền tảng gồm mã kho, tên kho và trạng thái kích hoạt.
            </div>
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
      zoneCode: '',
      aisleCode: '',
      rackCode: '',
      levelCode: '',
      binCode: '',
      status: 'available',
      isActive: true,
      maxWeight: null,
      maxVolume: null,
      currentWeight: null,
      currentVolume: null,
      storageCondition: 'ambient',
    },
  });
  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      warehouseId: location?.warehouseId ?? '',
      code: location?.code ?? '',
      zoneCode: location?.zoneCode ?? '',
      aisleCode: location?.aisleCode ?? '',
      rackCode: location?.rackCode ?? '',
      levelCode: location?.levelCode ?? '',
      binCode: location?.binCode ?? '',
      status: location?.status ?? 'available',
      isActive: location?.isActive ?? true,
      maxWeight: location?.maxWeight ?? null,
      maxVolume: location?.maxVolume ?? null,
      currentWeight: location?.currentWeight ?? null,
      currentVolume: location?.currentVolume ?? null,
      storageCondition: location?.storageCondition ?? 'ambient',
    });
  }, [location, open, reset]);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <form onSubmit={handleSubmit(async (payload) => { if (!isView) await onSubmit(payload); })} className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle>{mode === 'create' ? 'Create location' : mode === 'edit' ? 'Update location' : 'Location detail'}</SheetTitle>
            <SheetDescription>Thiết lập zone, aisle, bin và sức chứa cho vị trí lưu trữ.</SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
            <Field label="Warehouse" error={errors.warehouseId?.message}><select {...register('warehouseId')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.warehouseId)}><option value="">Select warehouse</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Location code" error={errors.code?.message}><input {...register('code')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.code)} /></Field>
            <Field label="Zone" error={errors.zoneCode?.message}><input {...register('zoneCode')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.zoneCode)} /></Field>
            <Field label="Aisle" error={errors.aisleCode?.message}><input {...register('aisleCode')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.aisleCode)} /></Field>
            <Field label="Rack" error={errors.rackCode?.message}><input {...register('rackCode')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.rackCode)} /></Field>
            <Field label="Level" error={errors.levelCode?.message}><input {...register('levelCode')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.levelCode)} /></Field>
            <Field label="Bin" error={errors.binCode?.message}><input {...register('binCode')} disabled={isView || isPending || mode === 'edit'} className={inputClass(!!errors.binCode)} /></Field>
            <Field label="Storage condition" error={errors.storageCondition?.message}><select {...register('storageCondition')} disabled={isView || isPending} className={inputClass(!!errors.storageCondition)}><option value="ambient">Ambient</option><option value="chilled">Chilled</option><option value="frozen">Frozen</option><option value="dry">Dry</option></select></Field>
            <Field label="Occupancy status" error={errors.status?.message}><select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}><option value="available">Available</option><option value="partial">Partial</option><option value="full">Full</option><option value="maintenance">Maintenance</option></select></Field>
            <Field label="Trạng thái kích hoạt" error={errors.isActive?.message}><select {...register('isActive', { setValueAs: (value) => value === 'true' })} disabled={isView || isPending} className={inputClass(!!errors.isActive)}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
            <Field label="Max weight" error={errors.maxWeight?.message}><input type="number" {...register('maxWeight', { setValueAs: toNullableNumber })} disabled={isView || isPending} className={inputClass(!!errors.maxWeight)} /></Field>
            <Field label="Current weight" error={errors.currentWeight?.message}><input type="number" {...register('currentWeight', { setValueAs: toNullableNumber })} disabled={isView || isPending} className={inputClass(!!errors.currentWeight)} /></Field>
            <Field label="Max volume" error={errors.maxVolume?.message}><input type="number" {...register('maxVolume', { setValueAs: toNullableNumber })} disabled={isView || isPending} className={inputClass(!!errors.maxVolume)} /></Field>
            <Field label="Current volume" error={errors.currentVolume?.message}><input type="number" {...register('currentVolume', { setValueAs: toNullableNumber })} disabled={isView || isPending} className={inputClass(!!errors.currentVolume)} /></Field>
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

function toNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
