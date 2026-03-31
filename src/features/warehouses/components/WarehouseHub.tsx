import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StatePanel } from '@/components/StatePanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateWarehouseHub,
  useCreateWarehouseZone,
  useDeleteWarehouseHub,
  useDeleteWarehouseZone,
  useUpdateWarehouseHub,
  useUpdateWarehouseLayoutConfig,
  useUpdateWarehouseZone,
  useWarehouseHubs,
} from '../hooks/useWarehouses';
import {
  warehouseHubFormSchema,
  warehouseZoneFormSchema,
  type WarehouseHubFormData,
  type WarehouseZoneFormData,
} from '../schemas/warehouseSchemas';
import { SpatialLayoutMap } from './SpatialLayoutMap';
import type { WarehouseHub, WarehouseLayoutConfig, Zone } from '../types/warehouseType';

type WarehouseMode = 'create' | 'edit';
type ZoneMode = 'create' | 'edit';

function withNormalizedZoneOrder(config: WarehouseLayoutConfig, zones: Zone[]): WarehouseLayoutConfig {
  const uniqueOrdered = config.zoneOrder.filter((zoneId, index, list) => list.indexOf(zoneId) === index);
  const existingIds = new Set(zones.map((zone) => zone.id));
  const validOrder = uniqueOrdered.filter((zoneId) => existingIds.has(zoneId));
  const missing = zones.map((zone) => zone.id).filter((zoneId) => !validOrder.includes(zoneId));

  return {
    ...config,
    zoneOrder: [...validOrder, ...missing],
  };
}

export function WarehouseHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canManage = usePermission('master_data.warehouses.manage');

  const hubsQuery = useWarehouseHubs();
  const createHubMutation = useCreateWarehouseHub();
  const updateHubMutation = useUpdateWarehouseHub();
  const deleteHubMutation = useDeleteWarehouseHub();
  const createZoneMutation = useCreateWarehouseZone();
  const updateZoneMutation = useUpdateWarehouseZone();
  const deleteZoneMutation = useDeleteWarehouseZone();
  const updateLayoutMutation = useUpdateWarehouseLayoutConfig();

  const hubs = hubsQuery.data ?? [];
  const [selectedHubId, setSelectedHubId] = useState<string>('');
  const [warehouseMode, setWarehouseMode] = useState<WarehouseMode>('create');
  const [zoneMode, setZoneMode] = useState<ZoneMode>('create');
  const [editingHub, setEditingHub] = useState<WarehouseHub | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'warehouse' | 'zone'; id: string; name: string } | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<WarehouseLayoutConfig | null>(null);

  useEffect(() => {
    if (hubs.length === 0) {
      setSelectedHubId('');
      return;
    }

    if (!selectedHubId || !hubs.some((item) => item.id === selectedHubId)) {
      setSelectedHubId(hubs[0].id);
    }
  }, [hubs, selectedHubId]);

  const selectedHub = useMemo(
    () => hubs.find((item) => item.id === selectedHubId) ?? null,
    [hubs, selectedHubId],
  );

  useEffect(() => {
    if (!selectedHub) {
      setLayoutDraft(null);
      return;
    }

    setLayoutDraft(withNormalizedZoneOrder(selectedHub.layoutConfig, selectedHub.zones));
  }, [selectedHub?.id, selectedHub?.layoutConfig, selectedHub?.zones]);

  const openWarehouseDialog = (mode: WarehouseMode, hub?: WarehouseHub) => {
    setWarehouseMode(mode);
    setEditingHub(hub ?? null);
    setWarehouseDialogOpen(true);
  };

  const openZoneDialog = (mode: ZoneMode, zone?: Zone) => {
    setZoneMode(mode);
    setEditingZone(zone ?? null);
    setZoneDialogOpen(true);
  };

  const handleSaveWarehouse = async (payload: WarehouseHubFormData) => {
    try {
      if (warehouseMode === 'edit' && editingHub) {
        await updateHubMutation.mutateAsync({ id: editingHub.id, payload });
      } else {
        await createHubMutation.mutateAsync(payload);
      }
      toast({ title: 'Đã lưu kho', description: 'Warehouse hub đã được cập nhật.' });
      setWarehouseDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Không thể lưu kho',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveZone = async (payload: WarehouseZoneFormData) => {
    if (!selectedHub) return;

    try {
      if (zoneMode === 'edit' && editingZone) {
        await updateZoneMutation.mutateAsync({
          warehouseId: selectedHub.id,
          zoneId: editingZone.id,
          payload,
        });
      } else {
        await createZoneMutation.mutateAsync({ warehouseId: selectedHub.id, payload });
      }

      toast({ title: 'Đã lưu khu vực', description: 'Zone configuration đã được cập nhật.' });
      setZoneDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Không thể lưu khu vực',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !selectedHub) return;

    try {
      if (deleteTarget.kind === 'warehouse') {
        await deleteHubMutation.mutateAsync(deleteTarget.id);
      } else {
        await deleteZoneMutation.mutateAsync({ warehouseId: selectedHub.id, zoneId: deleteTarget.id });
      }
      setDeleteTarget(null);
      toast({ title: 'Đã xóa dữ liệu', description: 'Cấu trúc kho đã được cập nhật.' });
    } catch (error) {
      toast({
        title: 'Không thể xóa',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveLayout = async () => {
    if (!selectedHub || !layoutDraft) return;

    try {
      const normalizedLayout = withNormalizedZoneOrder(layoutDraft, selectedHub.zones);
      await updateLayoutMutation.mutateAsync({
        warehouseId: selectedHub.id,
        payload: normalizedLayout,
      });
      toast({ title: 'Đã lưu sơ đồ kho', description: 'Cấu hình lướt của bản đồ đã được cập nhật.' });
    } catch (error) {
      toast({
        title: 'Không thể lưu sơ đồ',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  if (hubsQuery.isLoading) {
    return (
      <div className="flex-1 p-8">
        <StatePanel title="Đang tải Warehouse Hub" description="Hệ thống đang đồng bộ dữ liệu kho." icon="hourglass_top" />
      </div>
    );
  }

  if (hubsQuery.isError) {
    return (
      <div className="flex-1 p-8">
        <StatePanel title="Không tải được Warehouse Hub" description="Vui lòng thử lại sau." icon="error" tone="error" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-8 overflow-y-auto bg-[#fbfbfe] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Warehouse Hub</h2>
          <p className="mt-1 text-slate-600">Manage global distribution nodes and spatial optimization.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage ? (
            <button
              type="button"
              onClick={() => openZoneDialog('create')}
              disabled={!selectedHub}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Add Zone
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              onClick={() => openWarehouseDialog('create')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Warehouse
            </button>
          ) : null}
        </div>
      </div>

      {hubs.length === 0 ? (
        <StatePanel
          title="Chưa có warehouse hub"
          description="Tạo warehouse đầu tiên để bắt đầu cấu hình khu vực kho."
          icon="warehouse"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {hubs.map((warehouse) => (
              <button
                key={warehouse.id}
                type="button"
                onClick={() => setSelectedHubId(warehouse.id)}
                className={`relative rounded-xl p-6 text-left shadow-[0_12px_32px_-4px_rgba(25,28,30,0.06)] transition ${selectedHub?.id === warehouse.id
                  ? 'bg-white ring-2 ring-blue-600'
                  : 'border-2 border-transparent bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
              >
                {selectedHub?.id === warehouse.id ? (
                  <span className="absolute right-4 top-4 rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                    Selected
                  </span>
                ) : null}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <span className="material-symbols-outlined text-2xl">hub</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">{warehouse.name}</h3>
                    <p className="text-xs text-slate-600">{warehouse.location}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-end justify-between">
                      <span className="text-xs font-semibold uppercase text-slate-600">Used Capacity</span>
                      <span className="text-sm font-bold text-blue-600">{warehouse.usedCapacity}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${warehouse.usedCapacity}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-100 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-600">Total Space</p>
                      <p className="text-lg font-extrabold">{Math.round(warehouse.totalSpace / 1000)}k <span className="text-xs font-normal">m3</span></p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-600">Total Zones</p>
                      <p className="text-lg font-extrabold">{warehouse.totalZones}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedHub ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-cyan-700">grid_view</span>
                  <h3 className="text-xl font-bold tracking-tight">Zones in {selectedHub.name}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => openWarehouseDialog('edit', selectedHub)}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Edit Warehouse
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ kind: 'warehouse', id: selectedHub.id, name: selectedHub.name })}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete Warehouse
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedHub.zones.length === 0 ? (
                <StatePanel title="Chưa có khu vực kho" description="Tạo zone đầu tiên để bắt đầu cấu hình mặt bằng lưu trữ." icon="grid_view" />
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                  {selectedHub.zones.map((zone) => (
                    <div key={zone.id} className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-blue-600">{zone.code}</h4>
                          <p className="text-[10px] font-bold uppercase text-slate-600">{zone.name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/warehouses/${selectedHub.id}/zones/${zone.id}`, {
                                state: { warehouse: selectedHub, zone },
                              })
                            }
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openZoneDialog('edit', zone)}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          ) : null}
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ kind: 'zone', id: zone.id, name: zone.code })}
                              className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Rows</span><span className="font-semibold text-slate-900">{zone.rows}</span></p>
                        <p className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Shelves / Row</span><span className="font-semibold text-slate-900">{zone.shelves}</span></p>
                        <p className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Levels / Shelf</span><span className="font-semibold text-slate-900">{zone.levels}</span></p>
                        <p className="flex items-center justify-between"><span>Bin Count</span><span className="font-extrabold text-blue-700">{zone.binCount}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {layoutDraft ? (
                <>
                  <SpatialLayoutMap
                    warehouseName={selectedHub.name}
                    zones={selectedHub.zones}
                    config={layoutDraft}
                    canConfigure={canManage}
                    isSaving={updateLayoutMutation.isPending}
                    onConfigChange={setLayoutDraft}
                  />
                  {canManage ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setLayoutDraft(withNormalizedZoneOrder(selectedHub.layoutConfig, selectedHub.zones))}
                        disabled={updateLayoutMutation.isPending}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Reset Layout
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveLayout()}
                        disabled={updateLayoutMutation.isPending}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {updateLayoutMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình sơ đồ'}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <WarehouseHubFormDialog
        open={warehouseDialogOpen}
        mode={warehouseMode}
        hub={editingHub}
        isPending={createHubMutation.isPending || updateHubMutation.isPending}
        onClose={() => setWarehouseDialogOpen(false)}
        onSubmit={handleSaveWarehouse}
      />

      <WarehouseZoneFormDialog
        open={zoneDialogOpen}
        mode={zoneMode}
        zone={editingZone}
        isPending={createZoneMutation.isPending || updateZoneMutation.isPending}
        onClose={() => setZoneDialogOpen(false)}
        onSubmit={handleSaveZone}
      />

      <DeleteDialog
        open={!!deleteTarget}
        title={deleteTarget?.kind === 'warehouse' ? 'Xóa warehouse' : 'Xóa zone'}
        description={`Bạn có chắc chắn muốn xóa "${deleteTarget?.name ?? ''}" không?`}
        isPending={deleteHubMutation.isPending || deleteZoneMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}

function WarehouseHubFormDialog({
  open,
  mode,
  hub,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: WarehouseMode;
  hub: WarehouseHub | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: WarehouseHubFormData) => Promise<void>;
}) {
  const form = useForm<WarehouseHubFormData>({
    resolver: zodResolver(warehouseHubFormSchema),
    defaultValues: {
      code: '',
      name: '',
      location: '',
      tier: '',
      totalSpace: 10000,
      usedCapacity: 0,
    },
  });

  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      code: hub?.code ?? '',
      name: hub?.name ?? '',
      location: hub?.location ?? '',
      tier: hub?.tier ?? '',
      totalSpace: hub?.totalSpace ?? 10000,
      usedCapacity: hub?.usedCapacity ?? 0,
    });
  }, [hub, open, reset]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Warehouse Hub' : 'Edit Warehouse Hub'}</DialogTitle>
          <DialogDescription>Thiết lập thông tin dung tích và phân tầng cho warehouse hub.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit(async (payload) => { await onSubmit(payload); })}>
          <Field label="Code" error={errors.code?.message}><input {...register('code')} disabled={isPending} className={inputClass(!!errors.code)} /></Field>
          <Field label="Name" error={errors.name?.message}><input {...register('name')} disabled={isPending} className={inputClass(!!errors.name)} /></Field>
          <Field label="Location" error={errors.location?.message}><input {...register('location')} disabled={isPending} className={inputClass(!!errors.location)} /></Field>
          <Field label="Tier" error={errors.tier?.message}><input {...register('tier')} disabled={isPending} className={inputClass(!!errors.tier)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Space (m3)" error={errors.totalSpace?.message}><input type="number" {...register('totalSpace', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.totalSpace)} /></Field>
            <Field label="Used Capacity (%)" error={errors.usedCapacity?.message}><input type="number" {...register('usedCapacity', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.usedCapacity)} /></Field>
          </div>
          <DialogFooter className="mt-3 bg-transparent p-0">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang lưu...' : 'Lưu'}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WarehouseZoneFormDialog({
  open,
  mode,
  zone,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: ZoneMode;
  zone: Zone | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: WarehouseZoneFormData) => Promise<void>;
}) {
  const form = useForm<WarehouseZoneFormData>({
    resolver: zodResolver(warehouseZoneFormSchema),
    defaultValues: {
      code: '',
      name: '',
      type: '',
      rows: 1,
      shelves: 1,
      levels: 1,
      occupancy: 0,
    },
  });

  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      code: zone?.code ?? '',
      name: zone?.name ?? '',
      type: zone?.type ?? '',
      rows: zone?.rows ?? 1,
      shelves: zone?.shelves ?? 1,
      levels: zone?.levels ?? 1,
      occupancy: zone?.occupancy ?? 0,
    });
  }, [open, reset, zone]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Zone' : 'Edit Zone'}</DialogTitle>
          <DialogDescription>Cấu hình chi tiết rows, shelves, levels và occupancy cho khu vực kho.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit(async (payload) => { await onSubmit(payload); })}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zone Code" error={errors.code?.message}><input {...register('code')} disabled={isPending} className={inputClass(!!errors.code)} /></Field>
            <Field label="Zone Type" error={errors.type?.message}><input {...register('type')} disabled={isPending} className={inputClass(!!errors.type)} /></Field>
          </div>
          <Field label="Zone Name" error={errors.name?.message}><input {...register('name')} disabled={isPending} className={inputClass(!!errors.name)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rows" error={errors.rows?.message}><input type="number" {...register('rows', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.rows)} /></Field>
            <Field label="Shelves" error={errors.shelves?.message}><input type="number" {...register('shelves', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.shelves)} /></Field>
            <Field label="Levels" error={errors.levels?.message}><input type="number" {...register('levels', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.levels)} /></Field>
          </div>
          <Field label="Occupancy (%)" error={errors.occupancy?.message}><input type="number" {...register('occupancy', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.occupancy)} /></Field>
          <DialogFooter className="mt-3 bg-transparent p-0">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang lưu...' : 'Lưu'}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  title,
  description,
  isPending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent p-0 pt-4">
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang xóa...' : 'Xóa'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'}`;
}