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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateWarehouseHub,
  useWarehouseCategoryOptions,
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
import type { WarehouseCategoryOption, WarehouseHub, WarehouseLayoutConfig, Zone } from '../types/warehouseType';

type WarehouseMode = 'create' | 'edit';
type ZoneMode = 'create' | 'edit';
type CapacityTone = 'empty' | 'low' | 'partial' | 'full' | 'overloaded';

function getCapacityTone(occupancy: number): CapacityTone {
  if (occupancy <= 0) return 'empty';
  if (occupancy <= 20) return 'low';
  if (occupancy <= 60) return 'partial';
  if (occupancy <= 100) return 'full';
  return 'overloaded';
}

function getCapacityTextClass(occupancy: number) {
  const tone = getCapacityTone(occupancy);
  if (tone === 'low') return 'text-amber-700';
  if (tone === 'partial') return 'text-cyan-700';
  if (tone === 'overloaded') return 'text-red-700';
  return 'text-blue-600';
}

function getCapacityBarClass(occupancy: number) {
  const tone = getCapacityTone(occupancy);
  if (tone === 'low') return 'bg-amber-500';
  if (tone === 'partial') return 'bg-cyan-500';
  if (tone === 'overloaded') return 'bg-red-600';
  return 'bg-blue-600';
}

function getWarningText(occupancy: number) {
  const tone = getCapacityTone(occupancy);
  if (tone === 'low') return 'Cảnh báo thấp (1-20%)';
  if (tone === 'overloaded') return 'Quá tải (>100%)';
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Đã có lỗi xảy ra.';
}

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

  const [selectedHubId, setSelectedHubId] = useState<string>('');
  const [warehouseMode, setWarehouseMode] = useState<WarehouseMode>('create');
  const [zoneMode, setZoneMode] = useState<ZoneMode>('create');
  const [editingHub, setEditingHub] = useState<WarehouseHub | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneWarehouseId, setZoneWarehouseId] = useState<string>('');
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'warehouse' | 'zone'; id: string; name: string; warehouseId?: string } | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<WarehouseLayoutConfig | null>(null);
  const [structureSearch, setStructureSearch] = useState('');

  const hubsQuery = useWarehouseHubs();
  const categoryOptionsQuery = useWarehouseCategoryOptions();
  const createHubMutation = useCreateWarehouseHub();
  const updateHubMutation = useUpdateWarehouseHub();
  const deleteHubMutation = useDeleteWarehouseHub();
  const createZoneMutation = useCreateWarehouseZone();
  const updateZoneMutation = useUpdateWarehouseZone();
  const deleteZoneMutation = useDeleteWarehouseZone();
  const updateLayoutMutation = useUpdateWarehouseLayoutConfig();

  const hubs = hubsQuery.data ?? [];
  const categoryOptions = categoryOptionsQuery.data ?? [];
  const normalizedStructureSearch = structureSearch.trim().toLowerCase();

  const filteredHubs = useMemo(() => {
    if (!normalizedStructureSearch) {
      return hubs;
    }

    return hubs.filter((hub) => {
      const hubMatches = [hub.name, hub.code].some((value) => value.toLowerCase().includes(normalizedStructureSearch));
      const zoneMatches = hub.zones.some((zone) =>
        [zone.code, zone.name, zone.type].some((value) => value.toLowerCase().includes(normalizedStructureSearch)),
      );

      return hubMatches || zoneMatches;
    });
  }, [hubs, normalizedStructureSearch]);

  useEffect(() => {
    if (filteredHubs.length === 0) {
      setSelectedHubId('');
      return;
    }

    if (!selectedHubId || !filteredHubs.some((item) => item.id === selectedHubId)) {
      setSelectedHubId(filteredHubs[0].id);
    }
  }, [filteredHubs, selectedHubId]);

  const selectedHub = useMemo(
    () => filteredHubs.find((item) => item.id === selectedHubId) ?? null,
    [filteredHubs, selectedHubId],
  );

  const zoneWarehouse = useMemo(
    () => hubs.find((item) => item.id === zoneWarehouseId) ?? null,
    [hubs, zoneWarehouseId],
  );

  useEffect(() => {
    if (!selectedHub) {
      setLayoutDraft(null);
      return;
    }

    setLayoutDraft(withNormalizedZoneOrder(selectedHub.layoutConfig, selectedHub.zones));
  }, [selectedHub?.id, selectedHub?.layoutConfig, selectedHub?.zones]);

  const openWarehouseDialog = (mode: WarehouseMode, hub?: WarehouseHub) => {
    void categoryOptionsQuery.refetch();
    setWarehouseMode(mode);
    setEditingHub(hub ?? null);
    setWarehouseDialogOpen(true);
  };

  const openZoneDialog = (mode: ZoneMode, zone?: Zone) => {
    const targetWarehouseId = zone?.warehouseId ?? selectedHub?.id ?? '';
    if (!targetWarehouseId) {
      toast({
        title: 'Không xác định được kho',
        description: 'Vui lòng chọn kho trước khi thao tác với zone.',
        variant: 'destructive',
      });
      return;
    }

    void categoryOptionsQuery.refetch();
    setZoneWarehouseId(targetWarehouseId);
    setZoneMode(mode);
    setEditingZone(zone ?? null);
    setZoneDialogOpen(true);
  };

  const openCreateZoneForWarehouse = (warehouse: WarehouseHub) => {
    setSelectedHubId(warehouse.id);
    void categoryOptionsQuery.refetch();
    setZoneWarehouseId(warehouse.id);
    setZoneMode('create');
    setEditingZone(null);
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
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleSaveZone = async (payload: WarehouseZoneFormData) => {
    if (!zoneWarehouseId) {
      toast({
        title: 'Không thể lưu zone',
        description: 'Thiếu thông tin kho đích cho zone này.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (zoneMode === 'edit' && editingZone) {
        await updateZoneMutation.mutateAsync({
          warehouseId: zoneWarehouseId,
          zoneId: editingZone.id,
          payload,
        });
      } else {
        await createZoneMutation.mutateAsync({ warehouseId: zoneWarehouseId, payload });
      }

      toast({ title: 'Đã lưu khu vực', description: 'Zone configuration đã được cập nhật.' });
      setZoneDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Không thể lưu khu vực',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === 'warehouse') {
        await deleteHubMutation.mutateAsync(deleteTarget.id);
      } else {
        if (!deleteTarget.warehouseId) {
          throw new Error('Thiếu thông tin kho của zone cần xóa.');
        }

        await deleteZoneMutation.mutateAsync({ warehouseId: deleteTarget.warehouseId, zoneId: deleteTarget.id });
      }
      setDeleteTarget(null);
      toast({ title: 'Đã xóa dữ liệu', description: 'Cấu trúc kho đã được cập nhật.' });
    } catch (error) {
      toast({
        title: 'Không thể xóa',
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
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

      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
        <input
          value={structureSearch}
          onChange={(event) => setStructureSearch(event.target.value)}
          placeholder="Tìm theo kho/khu vực kho (mã, tên, type)..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filteredHubs.length === 0 ? (
        <StatePanel
          title={hubs.length === 0 ? 'Chưa có warehouse hub' : 'Không tìm thấy kho phù hợp'}
          description={hubs.length === 0 ? 'Tạo warehouse đầu tiên để bắt đầu cấu hình khu vực kho.' : 'Thử điều chỉnh từ khóa tìm kiếm kho.'}
          icon="warehouse"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredHubs.map((warehouse) => (
              (() => {
                const warehouseWarning = getWarningText(warehouse.usedCapacity);
                return (
                  <div
                    key={warehouse.id}
                    onClick={() => setSelectedHubId(warehouse.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedHubId(warehouse.id);
                      }
                    }}
                    className={`relative rounded-2xl border p-6 text-left shadow-[0_12px_32px_-4px_rgba(25,28,30,0.06)] transition ${selectedHub?.id === warehouse.id
                      ? 'border-blue-300 bg-white ring-2 ring-blue-500/60'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <span className="material-symbols-outlined text-2xl">hub</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold leading-tight">{warehouse.name}</h3>
                          <p className="text-xs text-slate-600">Code: {warehouse.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedHub?.id === warehouse.id ? (
                          <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                            Selected
                          </span>
                        ) : null}
                        {canManage ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openWarehouseDialog('edit', warehouse);
                            }}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200"
                            title="Edit warehouse"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        ) : null}
                        {canManage ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget({ kind: 'warehouse', id: warehouse.id, name: warehouse.name });
                            }}
                            className="rounded-lg bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100"
                            title="Delete warehouse"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex items-end justify-between">
                          <span className="text-xs font-semibold uppercase text-slate-600">Used Capacity</span>
                          <span className={`text-sm font-bold ${getCapacityTextClass(warehouse.usedCapacity)}`}>{warehouse.usedCapacity}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${getCapacityBarClass(warehouse.usedCapacity)}`} style={{ width: `${Math.min(warehouse.usedCapacity, 100)}%` }} />
                        </div>
                        {warehouseWarning ? (
                          <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            {warehouseWarning}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-slate-100 p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-600">Total Space</p>
                          <p className="text-lg font-extrabold">{Math.round(warehouse.totalSpace / 1000)}k <span className="text-xs font-normal">m3</span></p>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-600">Locations</p>
                          <p className="text-lg font-extrabold">{warehouse.totalLocations}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-600">Total Zones</p>
                          <p className="text-lg font-extrabold">{warehouse.totalZones}</p>
                        </div>
                      </div>
                      {canManage ? (
                        <div className="flex justify-end border-t border-slate-200 pt-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCreateZoneForWarehouse(warehouse);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            <span className="material-symbols-outlined text-[14px]">add_circle</span>
                            Add Zone
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ))}
          </div>

          {selectedHub ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-cyan-700">grid_view</span>
                  <h3 className="text-xl font-bold tracking-tight">Zones in {selectedHub.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Grouped by zone code
                  </span>
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

              {selectedHub.zones.filter((zone) => {
                if (!normalizedStructureSearch) {
                  return true;
                }

                const hubMatches = [selectedHub.name, selectedHub.code].some((value) => value.toLowerCase().includes(normalizedStructureSearch));
                if (hubMatches) {
                  return true;
                }

                return [zone.code, zone.name, zone.type].some((value) => value.toLowerCase().includes(normalizedStructureSearch));
              }).length === 0 ? (
                <StatePanel
                  title={selectedHub.zones.length === 0 ? 'Chưa có khu vực kho' : 'Không tìm thấy zone phù hợp'}
                  description={selectedHub.zones.length === 0 ? 'Tạo zone đầu tiên để bắt đầu cấu hình mặt bằng lưu trữ.' : 'Thử điều chỉnh từ khóa tìm kiếm.'}
                  icon="grid_view"
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                  {selectedHub.zones
                    .filter((zone) => {
                      if (!normalizedStructureSearch) {
                        return true;
                      }

                      const hubMatches = [selectedHub.name, selectedHub.code].some((value) => value.toLowerCase().includes(normalizedStructureSearch));
                      if (hubMatches) {
                        return true;
                      }

                      return [zone.code, zone.name, zone.type].some((value) => value.toLowerCase().includes(normalizedStructureSearch));
                    })
                    .map((zone) => (
                      (() => {
                        const zoneWarning = getWarningText(zone.occupancy);
                        return (
                          <div key={zone.id} className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-blue-600">{zone.code}</h4>
                                <p className="text-[10px] font-bold uppercase text-slate-600">{zone.name}</p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">{zone.type}</p>
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
                                    onClick={() => setDeleteTarget({ kind: 'zone', id: zone.id, name: zone.code, warehouseId: zone.warehouseId })}
                                    className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                              <p className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span>Occupancy</span>
                                <span className={`font-extrabold ${getCapacityTextClass(zone.occupancy)}`}>{zone.occupancy}%</span>
                              </p>
                              <p className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Storage Slots</span><span className="font-extrabold text-blue-700">{zone.binCount}</span></p>
                              <p className="flex items-center justify-between"><span>Allowed Categories</span><span className="font-semibold text-slate-900">{zone.allowedCategoryIds.length}</span></p>
                              {zoneWarning ? (
                                <p className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                  <span className="material-symbols-outlined text-[13px]">warning</span>
                                  {zoneWarning}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })()
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
        categoryOptions={categoryOptions}
        isCategoryLoading={categoryOptionsQuery.isLoading || categoryOptionsQuery.isFetching}
        isCategoryError={categoryOptionsQuery.isError}
        isPending={createHubMutation.isPending || updateHubMutation.isPending}
        onClose={() => setWarehouseDialogOpen(false)}
        onSubmit={handleSaveWarehouse}
      />

      <WarehouseZoneFormDialog
        open={zoneDialogOpen}
        mode={zoneMode}
        zone={editingZone}
        categoryOptions={categoryOptions}
        warehouseCategoryIds={zoneWarehouse?.allowedCategoryIds ?? []}
        isCategoryLoading={categoryOptionsQuery.isLoading || categoryOptionsQuery.isFetching}
        isCategoryError={categoryOptionsQuery.isError}
        isPending={createZoneMutation.isPending || updateZoneMutation.isPending}
        onClose={() => {
          setZoneDialogOpen(false);
          setZoneWarehouseId('');
        }}
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
  categoryOptions,
  isCategoryLoading,
  isCategoryError,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: WarehouseMode;
  hub: WarehouseHub | null;
  categoryOptions: WarehouseCategoryOption[];
  isCategoryLoading: boolean;
  isCategoryError: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: WarehouseHubFormData) => Promise<void>;
}) {
  const form = useForm<WarehouseHubFormData>({
    resolver: zodResolver(warehouseHubFormSchema),
    defaultValues: {
      code: '',
      name: '',
      totalSpace: 10000,
      usedCapacity: 0,
      categoryIds: [],
    },
  });

  const { register, reset, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedCategoryIds = watch('categoryIds');

  useEffect(() => {
    if (!open) return;
    reset({
      code: hub?.code ?? '',
      name: hub?.name ?? '',
      totalSpace: hub?.totalSpace ?? 10000,
      usedCapacity: hub?.usedCapacity ?? 0,
      categoryIds: hub?.allowedCategoryIds ?? [],
    });
  }, [hub, open, reset]);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <form className="flex h-full flex-col" onSubmit={handleSubmit(async (payload) => { await onSubmit(payload); })}>
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle>{mode === 'create' ? 'Create Warehouse Hub' : 'Edit Warehouse Hub'}</SheetTitle>
            <SheetDescription>Thiết lập thông tin dung tích và phân tầng cho warehouse hub.</SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 gap-3 overflow-y-auto px-6 py-5">
            <Field label="Code" error={errors.code?.message}><input {...register('code')} disabled={isPending} className={inputClass(!!errors.code)} /></Field>
            <Field label="Name" error={errors.name?.message}><input {...register('name')} disabled={isPending} className={inputClass(!!errors.name)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total Space (m3)" error={errors.totalSpace?.message}><input type="number" {...register('totalSpace', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.totalSpace)} /></Field>
              <Field label="Used Capacity (%)" error={errors.usedCapacity?.message}><input type="number" {...register('usedCapacity', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.usedCapacity)} /></Field>
            </div>
            <CategoryMultiSelect
              label="Danh mục được phép bảo quản"
              options={categoryOptions}
              selectedIds={selectedCategoryIds}
              error={errors.categoryIds?.message}
              disabled={isPending || isCategoryLoading}
              isLoading={isCategoryLoading}
              isError={isCategoryError}
              onToggle={(categoryId, checked) => {
                const next = checked
                  ? [...selectedCategoryIds, categoryId]
                  : selectedCategoryIds.filter((id) => id !== categoryId);
                setValue('categoryIds', Array.from(new Set(next)), { shouldValidate: true });
              }}
            />
          </div>
          <SheetFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function WarehouseZoneFormDialog({
  open,
  mode,
  zone,
  categoryOptions,
  warehouseCategoryIds,
  isCategoryLoading,
  isCategoryError,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: ZoneMode;
  zone: Zone | null;
  categoryOptions: WarehouseCategoryOption[];
  warehouseCategoryIds: string[];
  isCategoryLoading: boolean;
  isCategoryError: boolean;
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
      racks: 1,
      levels: 1,
      bins: 1,
      categoryIds: [],
    },
  });

  const { register, reset, handleSubmit, watch, setValue, formState: { errors } } = form;
  const selectedCategoryIds = watch('categoryIds');
  const availableCategories = categoryOptions.filter((option) => warehouseCategoryIds.includes(option.id));

  useEffect(() => {
    if (!open) return;
    reset({
      code: zone?.code ?? '',
      name: zone?.name ?? '',
      type: zone?.type ?? '',
      racks: zone?.rackCodes.length || 1,
      levels: zone?.levelCodes.length || 1,
      bins: zone?.binCodes.length || 1,
      categoryIds: zone?.allowedCategoryIds ?? [],
    });
  }, [open, reset, zone]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Zone' : 'Edit Zone'}</DialogTitle>
          <DialogDescription>Cấu hình zone theo rack, level, bin và phạm vi danh mục được phép lưu trữ.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit(async (payload) => { await onSubmit(payload); })}>
          {warehouseCategoryIds.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Kho hiện chưa cấu hình danh mục bảo quản. Bạn vẫn có thể nhập thông tin zone, nhưng cần cập nhật danh mục kho trước khi lưu.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zone Code" error={errors.code?.message}><input {...register('code')} disabled={isPending} className={inputClass(!!errors.code)} /></Field>
            <Field label="Zone Type" error={errors.type?.message}><input {...register('type')} disabled={isPending} className={inputClass(!!errors.type)} /></Field>
          </div>
          <Field label="Zone Name" error={errors.name?.message}><input {...register('name')} disabled={isPending} className={inputClass(!!errors.name)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Racks" error={errors.racks?.message}><input type="number" {...register('racks', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.racks)} /></Field>
            <Field label="Levels" error={errors.levels?.message}><input type="number" {...register('levels', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.levels)} /></Field>
            <Field label="Bins" error={errors.bins?.message}><input type="number" {...register('bins', { valueAsNumber: true })} disabled={isPending} className={inputClass(!!errors.bins)} /></Field>
          </div>
          <CategoryMultiSelect
            label="Danh mục hợp lệ trong zone"
            options={availableCategories}
            selectedIds={selectedCategoryIds}
            error={errors.categoryIds?.message}
            disabled={isPending || isCategoryLoading || availableCategories.length === 0}
            isLoading={isCategoryLoading}
            isError={isCategoryError}
            emptyText="Kho chưa có danh mục để zone lựa chọn."
            onToggle={(categoryId, checked) => {
              const next = checked
                ? [...selectedCategoryIds, categoryId]
                : selectedCategoryIds.filter((id) => id !== categoryId);
              setValue('categoryIds', Array.from(new Set(next)), { shouldValidate: true });
            }}
          />
          <p className="text-xs text-slate-500">Số vị trí tạo theo công thức Racks × Levels × Bins (tối đa 500 vị trí).</p>
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

function CategoryMultiSelect({
  label,
  options,
  selectedIds,
  error,
  disabled,
  onToggle,
  emptyText,
  isLoading,
  isError,
}: {
  label: string;
  options: WarehouseCategoryOption[];
  selectedIds: string[];
  error?: string;
  disabled?: boolean;
  onToggle: (categoryId: string, checked: boolean) => void;
  emptyText?: string;
  isLoading?: boolean;
  isError?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {isLoading ? (
          <p className="text-xs text-slate-500">Đang tải danh mục từ API...</p>
        ) : isError ? (
          <p className="text-xs text-red-600">Không tải được danh mục từ API category. Vui lòng thử lại.</p>
        ) : options.length === 0 ? (
          <p className="text-xs text-slate-500">{emptyText ?? 'Không có danh mục để lựa chọn.'}</p>
        ) : (
          options.map((option) => {
            const checked = selectedIds.includes(option.id);
            return (
              <label key={option.id} className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm ${disabled ? 'opacity-70' : 'hover:bg-white'}`}>
                <span className="font-medium text-slate-700">{option.name}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => onToggle(option.id, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                />
              </label>
            );
          })
        )}
      </div>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}