import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
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
  useUpdateWarehouseZone,
  useWarehouseHubs,
} from '../hooks/useWarehouses';
import {
  warehouseHubFormSchema,
  warehouseZoneFormSchema,
  type WarehouseHubFormData,
  type WarehouseZoneFormData,
} from '../schemas/warehouseSchemas';
import type { WarehouseCategoryOption, WarehouseHub, Zone } from '../types/warehouseType';

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
  const [structureSearch, setStructureSearch] = useState('');
  const warehouseListScrollRef = useRef<HTMLDivElement | null>(null);
  const zoneListScrollRef = useRef<HTMLDivElement | null>(null);
  const [showWarehouseTopFade, setShowWarehouseTopFade] = useState(false);
  const [showWarehouseBottomFade, setShowWarehouseBottomFade] = useState(false);
  const [showZoneTopFade, setShowZoneTopFade] = useState(false);
  const [showZoneBottomFade, setShowZoneBottomFade] = useState(false);
  const deferredStructureSearch = useDeferredValue(structureSearch);

  const hubsQuery = useWarehouseHubs();
  const categoryOptionsQuery = useWarehouseCategoryOptions();
  const createHubMutation = useCreateWarehouseHub();
  const updateHubMutation = useUpdateWarehouseHub();
  const deleteHubMutation = useDeleteWarehouseHub();
  const createZoneMutation = useCreateWarehouseZone();
  const updateZoneMutation = useUpdateWarehouseZone();
  const deleteZoneMutation = useDeleteWarehouseZone();

  const hubs = hubsQuery.data ?? [];
  const categoryOptions = categoryOptionsQuery.data ?? [];
  const normalizedStructureSearch = deferredStructureSearch.trim().toLowerCase();

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

  const updateWarehouseListFade = useCallback(() => {
    const element = warehouseListScrollRef.current;
    if (!element) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowWarehouseTopFade(scrollTop > 2);
    setShowWarehouseBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  const updateZoneListFade = useCallback(() => {
    const element = zoneListScrollRef.current;
    if (!element) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowZoneTopFade(scrollTop > 2);
    setShowZoneBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    updateWarehouseListFade();
  }, [filteredHubs, updateWarehouseListFade]);

  useEffect(() => {
    updateZoneListFade();
  }, [selectedHub, normalizedStructureSearch, updateZoneListFade]);

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
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-[#fbfbfe] p-3 sm:p-4 lg:p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">Warehouse Hub</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage ? (
            <button
              type="button"
              onClick={() => openWarehouseDialog('create')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Warehouse
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              onClick={() => openZoneDialog('create')}
              disabled={!selectedHub}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Add Zone
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
        <input
          value={structureSearch}
          onChange={(event) => setStructureSearch(event.target.value)}
          placeholder="Search warehouses or zones by code/name/type..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-all duration-200 ease-out hover:border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filteredHubs.length === 0 ? (
        <StatePanel
          title={hubs.length === 0 ? 'No warehouse hubs found' : 'No matching warehouses'}
          description={hubs.length === 0 ? 'Create your first warehouse hub to start managing zones.' : 'Try adjusting your search keyword.'}
          icon="warehouse"
        />
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Warehouses</h3>
              <span className="text-xs font-semibold text-slate-500">{filteredHubs.length}</span>
            </div>
            <div
              ref={warehouseListScrollRef}
              onScroll={updateWarehouseListFade}
              className="relative min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
            >
              <div
                className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showWarehouseTopFade ? 'opacity-100' : 'opacity-0'}`}
              />
              {filteredHubs.map((warehouse, index) => {
                const warehouseWarning = getWarningText(warehouse.usedCapacity);

                return (
                  <motion.div
                    key={warehouse.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedHubId(warehouse.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ease-out ${selectedHub?.id === warehouse.id
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{warehouse.name}</p>
                          <p className="text-xs text-slate-600">{warehouse.code}</p>
                        </div>
                        {selectedHub?.id === warehouse.id ? (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Active</span>
                        ) : null}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
                          <p className="text-[10px] uppercase text-slate-500">Zones</p>
                          <p className="text-xs font-bold text-slate-900">{warehouse.totalZones}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
                          <p className="text-[10px] uppercase text-slate-500">Locations</p>
                          <p className="text-xs font-bold text-slate-900">{warehouse.totalLocations}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
                          <p className="text-[10px] uppercase text-slate-500">Usage</p>
                          <p className={`text-xs font-bold ${getCapacityTextClass(warehouse.usedCapacity)}`}>{warehouse.usedCapacity}%</p>
                        </div>
                      </div>

                      {warehouseWarning ? (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          {warehouseWarning}
                        </p>
                      ) : null}

                      {canManage ? (
                        <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-200 pt-2">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              openWarehouseDialog('edit', warehouse);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                openWarehouseDialog('edit', warehouse);
                              }
                            }}
                            className="material-symbols-outlined rounded-md p-1 text-[16px] text-slate-600 transition-colors duration-200 hover:bg-slate-200"
                          >
                            edit
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget({ kind: 'warehouse', id: warehouse.id, name: warehouse.name });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                setDeleteTarget({ kind: 'warehouse', id: warehouse.id, name: warehouse.name });
                              }
                            }}
                            className="material-symbols-outlined rounded-md p-1 text-[16px] text-red-600 transition-colors duration-200 hover:bg-red-50"
                          >
                            delete
                          </span>
                        </div>
                      ) : null}
                    </button>
                  </motion.div>
                );
              })}
              <div
                className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showWarehouseBottomFade ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!selectedHub ? (
              <div className="p-6">
                <StatePanel
                  title="No warehouse selected"
                  description="Select a warehouse on the left to view its zones."
                  icon="grid_view"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Zones in {selectedHub.name}</h3>
                    <p className="text-sm text-slate-600">Code: {selectedHub.code} · {selectedHub.totalZones} zones</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => openCreateZoneForWarehouse(selectedHub)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:opacity-90"
                      >
                        Add Zone
                      </button>
                    ) : null}
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => openWarehouseDialog('edit', selectedHub)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100"
                      >
                        Edit Warehouse
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  ref={zoneListScrollRef}
                  onScroll={updateZoneListFade}
                  className="relative min-h-0 flex-1 overflow-y-auto p-5"
                >
                  <div
                    className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showZoneTopFade ? 'opacity-100' : 'opacity-0'}`}
                  />
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
                      title={selectedHub.zones.length === 0 ? 'No zones found' : 'No matching zones'}
                      description={selectedHub.zones.length === 0 ? 'Create the first zone for this warehouse.' : 'Try adjusting your search keyword.'}
                      icon="grid_view"
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                        .map((zone, index) => {
                          const zoneWarning = getWarningText(zone.occupancy);
                          return (
                            <motion.div
                              key={zone.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                            >
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-blue-700">{zone.code}</h4>
                                  <p className="text-xs text-slate-600">{zone.name}</p>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700">{zone.type}</p>
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
                                <p className="flex items-center justify-between border-b border-slate-200 pb-2">
                                  <span>Occupancy</span>
                                  <span className={`font-extrabold ${getCapacityTextClass(zone.occupancy)}`}>{zone.occupancy}%</span>
                                </p>
                                <p className="flex items-center justify-between border-b border-slate-200 pb-2"><span>Storage Slots</span><span className="font-extrabold text-blue-700">{zone.binCount}</span></p>
                                <p className="flex items-center justify-between"><span>Allowed Categories</span><span className="font-semibold text-slate-900">{zone.allowedCategoryIds.length}</span></p>
                                {zoneWarning ? (
                                  <p className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                    <span className="material-symbols-outlined text-[13px]">warning</span>
                                    {zoneWarning}
                                  </p>
                                ) : null}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  )}
                </div>
                <div
                  className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showZoneBottomFade ? 'opacity-100' : 'opacity-0'}`}
                />
              </>
            )}
          </section>
        </div>
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
        key={`${zoneMode}-${editingZone?.id ?? 'new'}-${zoneWarehouseId || 'none'}`}
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
            <SheetDescription>Thiết lập thông tin cơ bản và phạm vi danh mục cho warehouse hub.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 overflow-y-auto px-6 py-5">
            <Field label="Code" error={errors.code?.message}><input {...register('code')} disabled={isPending} className={inputClass(!!errors.code)} /></Field>
            <Field label="Name" error={errors.name?.message}><input {...register('name')} disabled={isPending} className={inputClass(!!errors.name)} /></Field>
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
    const isCreateMode = mode === 'create';
    reset({
      code: isCreateMode ? '' : (zone?.code ?? ''),
      name: isCreateMode ? '' : (zone?.name ?? ''),
      type: isCreateMode ? '' : (zone?.type ?? ''),
      racks: isCreateMode ? 1 : (zone?.rackCodes.length || 1),
      levels: isCreateMode ? 1 : (zone?.levelCodes.length || 1),
      bins: isCreateMode ? 1 : (zone?.binCodes.length || 1),
      categoryIds: isCreateMode ? [] : (zone?.allowedCategoryIds ?? []),
    });
  }, [mode, open, reset, zone]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Zone' : 'Edit Zone'}</DialogTitle>
          <DialogDescription>Cấu hình zone theo rack, level, bin và phạm vi danh mục được phép lưu trữ.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-2.5" onSubmit={handleSubmit(async (payload) => { await onSubmit(payload); })}>
          {warehouseCategoryIds.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Kho hiện chưa cấu hình danh mục bảo quản. Bạn vẫn có thể nhập thông tin zone, nhưng cần cập nhật danh mục kho trước khi lưu.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {mode === 'edit' ? (
              <Field label="Zone Code">
                <div className={`${inputClass(false)} flex items-center bg-slate-50 text-slate-500 select-none`}>{zone?.code ?? ''}</div>
              </Field>
            ) : (
              <Field label="Zone Code" error={errors.code?.message}><input {...register('code')} disabled={isPending} className={inputClass(!!errors.code)} /></Field>
            )}
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
      <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
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
              <label key={option.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm ${disabled ? 'opacity-70' : 'hover:bg-white'}`}>
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