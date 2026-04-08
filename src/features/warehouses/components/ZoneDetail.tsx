import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { StatePanel } from '@/components/StatePanel';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useUpdateZoneBinCapacity,
  useWarehouseCategoryOptions,
  useWarehouseHubs,
  useWarehouseProductOptions,
  useZoneBins,
} from '../hooks/useWarehouses';
import { binCapacityFormSchema, type BinCapacityFormData } from '../schemas/warehouseSchemas';
import type { BinOccupancyLevel, Zone } from '../types/warehouseType';

type CapacityTone = 'empty' | 'low' | 'partial' | 'full' | 'overloaded';

function getCapacityTone(occupancy: number): CapacityTone {
  if (occupancy <= 0) return 'empty';
  if (occupancy <= 20) return 'low';
  if (occupancy <= 60) return 'partial';
  if (occupancy <= 100) return 'full';
  return 'overloaded';
}

function getCapacityBarColor(occupancy: number) {
  const tone = getCapacityTone(occupancy);
  if (tone === 'low') return 'bg-amber-500';
  if (tone === 'partial') return 'bg-cyan-500';
  if (tone === 'full') return 'bg-blue-700';
  if (tone === 'overloaded') return 'bg-red-600';
  return 'bg-slate-300';
}

function getWarningText(tone: CapacityTone) {
  if (tone === 'low') return 'Cảnh báo sức chứa thấp (1-20%)';
  if (tone === 'overloaded') return 'Quá tải (>100%)';
  return null;
}

function getOccupancyColor(level: BinOccupancyLevel) {
  if (level === 'empty') return 'bg-slate-300 text-slate-600 ring-slate-400';
  if (level === 'low') return 'bg-amber-300 text-amber-900 ring-amber-400';
  if (level === 'partial') return 'bg-cyan-300 text-[#004e5d] ring-cyan-300';
  if (level === 'full') return 'bg-blue-700 text-white ring-blue-700';
  return 'bg-red-600 text-white ring-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]';
}

function getLegendLabel(level: BinOccupancyLevel) {
  if (level === 'empty') return 'Empty';
  if (level === 'low') return 'Low (1-20%)';
  if (level === 'partial') return 'Partial (21-60%)';
  if (level === 'full') return 'Full (61-100%)';
  return 'Overloaded';
}

function parseBinCoordinate(code: string, fallbackRack: number, fallbackLevel: number, fallbackBin: number) {
  const match = code.trim().toUpperCase().match(/-R(\d+)-L(\d+)-B(\d+)(?:-[A-Z0-9]+)?$/);
  if (match) {
    return {
      rackCode: `R${match[1].padStart(2, '0')}`,
      levelCode: `L${match[2].padStart(2, '0')}`,
      binCode: `B${match[3].padStart(2, '0')}`,
      rackNo: Number(match[1]),
      levelNo: Number(match[2]),
      binNo: Number(match[3]),
    };
  }

  return {
    rackCode: `R${String(Math.max(1, fallbackRack)).padStart(2, '0')}`,
    levelCode: `L${String(Math.max(1, fallbackLevel)).padStart(2, '0')}`,
    binCode: `B${String(Math.max(1, fallbackBin)).padStart(2, '0')}`,
    rackNo: Math.max(1, fallbackRack),
    levelNo: Math.max(1, fallbackLevel),
    binNo: Math.max(1, fallbackBin),
  };
}

export function ZoneDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const canManage = usePermission('master_data.warehouses.manage');
  const { id: warehouseIdParam, zoneId } = useParams<{ id: string; zoneId: string }>();

  const hubsQuery = useWarehouseHubs();
  const hubs = hubsQuery.data ?? [];

  const fallbackWarehouse = (location.state as { warehouse?: { id: string } } | undefined)?.warehouse;
  const fallbackZone = (location.state as { zone?: Zone } | undefined)?.zone;
  const warehouseId = warehouseIdParam ?? fallbackWarehouse?.id ?? '';

  const zone = useMemo(() => {
    if (zoneId && warehouseId) {
      const hub = hubs.find((item) => item.id === warehouseId);
      if (hub) {
        const foundZone = hub.zones.find((item) => item.id === zoneId);
        if (foundZone) return foundZone;
      }
    }

    return fallbackZone ?? null;
  }, [fallbackZone, hubs, warehouseId, zoneId]);

  const binsQuery = useZoneBins(warehouseId || undefined, zone?.id || undefined);
  const categoryOptionsQuery = useWarehouseCategoryOptions(Boolean(zone));
  const updateBinMutation = useUpdateZoneBinCapacity();

  const bins = binsQuery.data ?? [];
  const binCoordinates = useMemo(
    () => bins.map((bin) => ({
      bin,
      coordinate: parseBinCoordinate(bin.code, bin.row, bin.level, bin.shelf),
    })),
    [bins],
  );
  const rackList = useMemo(
    () => Array.from(new Set(binCoordinates.map((item) => item.coordinate.rackCode)))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [binCoordinates],
  );
  const [rackBinSearch, setRackBinSearch] = useState('');
  const normalizedRackBinSearch = rackBinSearch.trim().toLowerCase();
  const filteredRackList = useMemo(() => {
    if (!normalizedRackBinSearch) {
      return rackList;
    }

    return rackList.filter((rackCode) => {
      if (rackCode.toLowerCase().includes(normalizedRackBinSearch)) {
        return true;
      }

      return binCoordinates.some((item) =>
        item.coordinate.rackCode === rackCode
        && [item.coordinate.binCode, item.bin.code].some((value) => value.toLowerCase().includes(normalizedRackBinSearch)),
      );
    });
  }, [binCoordinates, normalizedRackBinSearch, rackList]);
  const [selectedRackCode, setSelectedRackCode] = useState<string>(rackList[0] ?? '');
  const viewMode: 'grid' = 'grid';
  const [selectedBinId, setSelectedBinId] = useState<string>('');

  useEffect(() => {
    if (filteredRackList.length === 0) return;
    if (!filteredRackList.includes(selectedRackCode)) {
      setSelectedRackCode(filteredRackList[0]);
    }
  }, [filteredRackList, selectedRackCode]);

  const binsOfRack = useMemo(() => {
    const filteredByRack = binCoordinates
      .filter((item) => item.coordinate.rackCode === selectedRackCode)
      .sort((left, right) => {
        if (left.coordinate.levelNo !== right.coordinate.levelNo) {
          return left.coordinate.levelNo - right.coordinate.levelNo;
        }

        return left.coordinate.binNo - right.coordinate.binNo;
      });

    if (!normalizedRackBinSearch) {
      return filteredByRack;
    }

    if (selectedRackCode.toLowerCase().includes(normalizedRackBinSearch)) {
      return filteredByRack;
    }

    return filteredByRack.filter(({ bin, coordinate }) =>
      [coordinate.binCode, bin.code].some((value) => value.toLowerCase().includes(normalizedRackBinSearch)),
    );
  }, [binCoordinates, normalizedRackBinSearch, selectedRackCode]);

  const rackOccupancyMap = useMemo(() => {
    const grouped = new Map<string, { load: number; capacity: number; fallbackOccupancyTotal: number; count: number }>();
    binCoordinates.forEach(({ bin, coordinate }) => {
      const current = grouped.get(coordinate.rackCode) ?? { load: 0, capacity: 0, fallbackOccupancyTotal: 0, count: 0 };
      current.load += Math.max(0, bin.currentLoad);
      current.capacity += Math.max(0, bin.capacity);
      current.fallbackOccupancyTotal += Math.max(0, bin.occupancy);
      current.count += 1;
      grouped.set(coordinate.rackCode, current);
    });

    const result = new Map<string, number>();
    grouped.forEach((value, rackCode) => {
      if (value.capacity > 0) {
        result.set(rackCode, Math.round((value.load / value.capacity) * 100));
        return;
      }

      const fallback = value.count > 0 ? Math.round(value.fallbackOccupancyTotal / value.count) : 0;
      result.set(rackCode, fallback);
    });

    return result;
  }, [binCoordinates]);

  const levelGroups = useMemo(() => {
    const map = new Map<string, typeof binsOfRack>();

    binsOfRack.forEach((item) => {
      const key = item.coordinate.levelCode;
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    });

    return Array.from(map.entries())
      .sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true }))
      .map(([levelCode, items]) => ({ levelCode, items }));
  }, [binsOfRack]);

  const zoneTone = getCapacityTone(zone?.occupancy ?? 0);
  const selectedRackTone = getCapacityTone(rackOccupancyMap.get(selectedRackCode) ?? 0);

  const selectedBin = useMemo(() => {
    const rackBins = binsOfRack.map((item) => item.bin);
    if (!selectedBinId) return rackBins[0] ?? null;
    return bins.find((bin) => bin.id === selectedBinId) ?? rackBins[0] ?? null;
  }, [bins, binsOfRack, selectedBinId]);

  const selectedBinTone = selectedBin ? getCapacityTone(selectedBin.occupancy) : null;

  useEffect(() => {
    if (selectedBin) {
      setSelectedBinId(selectedBin.id);
    }
  }, [selectedBin?.id]);

  const form = useForm<BinCapacityFormData>({
    resolver: zodResolver(binCapacityFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      capacity: 1,
      currentLoad: 0,
      items: 0,
      productCount: 0,
      categoryId: '',
      productId: '',
    },
  });

  const { register, reset, handleSubmit, setValue, watch, clearErrors, trigger, formState: { errors } } = form;
  const categoryField = register('categoryId');
  const productField = register('productId');
  const categoryId = watch('categoryId');
  const productId = watch('productId');

  const allowedCategories = useMemo(() => {
    const allowedIdSet = new Set(zone?.allowedCategoryIds ?? []);
    return (categoryOptionsQuery.data ?? []).filter((item) => allowedIdSet.has(item.id));
  }, [categoryOptionsQuery.data, zone?.allowedCategoryIds]);
  const isCategoryLoading = categoryOptionsQuery.isLoading || categoryOptionsQuery.isFetching;
  const isCategoryError = categoryOptionsQuery.isError;

  const productOptionsQuery = useWarehouseProductOptions(undefined, Boolean(zone));
  const isProductLoading = productOptionsQuery.isLoading || productOptionsQuery.isFetching;
  const isProductError = productOptionsQuery.isError;
  const filteredProducts = useMemo(
    () => {
      if (!categoryId) {
        return [];
      }

      return (productOptionsQuery.data ?? []).filter((product) => product.categoryIds.includes(categoryId));
    },
    [categoryId, productOptionsQuery.data],
  );

  useEffect(() => {
    if (!selectedBin) return;

    reset({
      capacity: selectedBin.capacity,
      currentLoad: selectedBin.currentLoad,
      items: selectedBin.items,
      productCount: selectedBin.productCount,
      categoryId: selectedBin.assignedCategoryId ?? zone?.allowedCategoryIds[0] ?? '',
      productId: selectedBin.assignedProductId ?? '',
    });
  }, [reset, selectedBin, zone?.allowedCategoryIds]);

  useEffect(() => {
    if (!productId) {
      return;
    }

    clearErrors('productId');
  }, [clearErrors, productId]);

  const capacity = watch('capacity');
  const currentLoad = watch('currentLoad');
  const occupancy = capacity > 0 ? Math.round((currentLoad / capacity) * 100) : 0;

  const onSubmit = async (payload: BinCapacityFormData) => {
    if (!zone || !selectedBin || !canManage) return;

    try {
      await updateBinMutation.mutateAsync({
        warehouseId,
        zoneId: zone.id,
        binId: selectedBin.id,
        payload,
      });
      toast({ title: 'Đã cập nhật sức chứa', description: `Bin ${selectedBin.code} đã được cấu hình.` });
    } catch (error) {
      toast({
        title: 'Không thể lưu cấu hình',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  if (hubsQuery.isLoading || binsQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <StatePanel title="Đang tải sơ đồ kho" description="Hệ thống đang đồng bộ dữ liệu zone bins." icon="hourglass_top" />
      </div>
    );
  }

  if (hubsQuery.isError || binsQuery.isError || !zone) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <StatePanel title="Không tải được zone" description="Vui lòng quay lại Warehouse Hub để thử lại." icon="error" tone="error" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8f9fb] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Warehouse
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">Warehouse Zone {zone.code}</h1>
          <p className="mt-1 flex items-center gap-2 text-slate-600">
            <span className="material-symbols-outlined text-sm text-cyan-700">auto_awesome</span>
            AI-Optimized Storage Map • Last updated {selectedBin?.lastUpdated ? 'just now' : 'N/A'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Occupancy</span>
            <span className={`text-xs font-bold ${zoneTone === 'low' ? 'text-amber-700' : zoneTone === 'partial' ? 'text-cyan-700' : zoneTone === 'overloaded' ? 'text-red-700' : 'text-blue-700'}`}>{zone.occupancy}%</span>
            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full ${getCapacityBarColor(zone.occupancy)}`} style={{ width: `${Math.min(zone.occupancy, 100)}%` }} />
            </div>
            {getWarningText(zoneTone) ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                {getWarningText(zoneTone)}
              </span>
            ) : null}
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            View Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8 flex flex-wrap gap-6 border-b border-slate-200 pb-6">
              {(['empty', 'low', 'partial', 'full', 'overloaded'] as BinOccupancyLevel[]).map((levelValue) => (
                <div key={levelValue} className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded ${getOccupancyColor(levelValue).split(' ')[0]}`}></span>
                  <span className="text-sm text-slate-600">{getLegendLabel(levelValue)}</span>
                </div>
              ))}
            </div>

            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-600">Storage Rack</p>
                <div className="mb-2 relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">search</span>
                  <input
                    value={rackBinSearch}
                    onChange={(event) => setRackBinSearch(event.target.value)}
                    placeholder="Tìm rack hoặc bin..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredRackList.map((item) => (
                    (() => {
                      const rackOccupancy = rackOccupancyMap.get(item) ?? 0;
                      const rackTone = getCapacityTone(rackOccupancy);
                      const rackWarning = getWarningText(rackTone);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSelectedRackCode(item)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${selectedRackCode === item
                            ? 'bg-blue-700 text-white'
                            : rackTone === 'low'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          title={rackWarning ? `${item}: ${rackWarning}` : `${item}: ${rackOccupancy}%`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {item}
                            {rackWarning ? <span className="material-symbols-outlined text-[14px]">warning</span> : null}
                          </span>
                        </button>
                      );
                    })()
                  ))}
                </div>
                {getWarningText(selectedRackTone) ? (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Rack {selectedRackCode} đang ở mức thấp ({rackOccupancyMap.get(selectedRackCode) ?? 0}%).
                  </p>
                ) : null}
                {filteredRackList.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">Không có rack phù hợp với từ khóa tìm kiếm.</p>
                ) : null}
              </div>
              <div className="inline-flex rounded-full bg-slate-100 p-1.5 shadow-inner">
                <span className="rounded-full bg-white px-6 py-2 text-sm font-bold text-blue-700 shadow-sm">Grid View</span>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <motion.div className="space-y-6 pb-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {levelGroups.map((group) => {
                  return (
                    <div key={group.levelCode} className="space-y-3">
                      <p className="text-sm font-bold text-slate-900">LEVEL {group.levelCode}</p>
                      <div className="overflow-x-auto">
                        <div className="flex min-w-max gap-2 pb-1">
                          {group.items.map(({ bin, coordinate }) => (
                            <button
                              key={bin.id}
                              type="button"
                              onClick={() => setSelectedBinId(bin.id)}
                              className={`flex h-12 w-24 items-center justify-center rounded-lg px-1 text-[11px] font-bold leading-tight ring-offset-2 transition hover:ring-2 ${getOccupancyColor(bin.occupancyLevel)} ${selectedBin?.id === bin.id ? 'ring-2 ring-blue-700' : ''}`}
                              title={`Bin ${coordinate.binCode}`}
                            >
                              {coordinate.binCode}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {levelGroups.length === 0 ? (
                  <StatePanel title="Không có ô phù hợp" description="Thử thay đổi bộ lọc rack/bin để xem dữ liệu phù hợp." icon="search" />
                ) : null}
              </motion.div>
            ) : (
              <div className="max-h-105 space-y-2 overflow-y-auto pr-1">
                {binsOfRack.map(({ bin }) => (
                  <button
                    key={bin.id}
                    type="button"
                    onClick={() => setSelectedBinId(bin.id)}
                    className={`w-full rounded-lg border-2 p-3 text-left transition ${selectedBin?.id === bin.id ? 'border-blue-700 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{bin.code}</p>
                        <p className="text-xs text-slate-600">{bin.currentLoad}/{bin.capacity} • {bin.occupancy}% • {bin.productCount} SKU</p>
                      </div>
                      <span className={`h-3 w-3 rounded-full ${getOccupancyColor(bin.occupancyLevel).split(' ')[0]}`}></span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-300 bg-cyan-100 p-6">
              <span className="mb-4 inline-block rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-900">AI Optimization</span>
              <h3 className="mb-2 text-xs font-bold text-slate-900">Space Consolidation</h3>
              <p className="text-sm leading-relaxed text-slate-700">System recommends moving items from Row A to Row B to free up 12% space for upcoming high-velocity shipments.</p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-red-300 bg-red-100 p-6">
              <span className="mb-4 inline-block rounded-full bg-red-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-900">Urgent Attention</span>
              <h3 className="mb-2 text-xs font-bold text-slate-900">Critical Congestion</h3>
              <p className="text-sm leading-relaxed text-slate-700">Bin {selectedBin?.code ?? 'N/A'} exceeds capacity threshold and requires reallocation workflow.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold text-slate-900">Bin Inspector</h2>
                <p className="text-xs font-medium text-slate-500">Cấu hình sức chứa theo bin</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <span className="material-symbols-outlined">info</span>
              </div>
            </div>

            {selectedBin ? (
              <motion.form
                className="space-y-5"
                onSubmit={handleSubmit(async (payload) => { await onSubmit(payload); })}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Selection</span>
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">LEVEL {selectedBin.level}</span>
                  </div>
                  <p className="text-sm font-black tracking-tight text-slate-900">BIN {selectedBin.code}</p>
                  {selectedBinTone && getWarningText(selectedBinTone) ? (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {getWarningText(selectedBinTone)}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacity" error={errors.capacity?.message}><input type="number" {...register('capacity', { valueAsNumber: true })} disabled={!canManage || updateBinMutation.isPending} className={inputClass(!!errors.capacity)} /></Field>
                  <Field label="Current Load" error={errors.currentLoad?.message}><input type="number" {...register('currentLoad', { valueAsNumber: true })} disabled={!canManage || updateBinMutation.isPending} className={inputClass(!!errors.currentLoad)} /></Field>
                  <Field label="Items" error={errors.items?.message}><input type="number" {...register('items', { valueAsNumber: true })} disabled={!canManage || updateBinMutation.isPending} className={inputClass(!!errors.items)} /></Field>
                  <Field label="Product Count" error={errors.productCount?.message}><input type="number" {...register('productCount', { valueAsNumber: true })} disabled={!canManage || updateBinMutation.isPending} className={inputClass(!!errors.productCount)} /></Field>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Field label="Category Scope" error={errors.categoryId?.message}>
                    <select
                      {...categoryField}
                      disabled={!canManage || updateBinMutation.isPending || isCategoryLoading || isCategoryError || allowedCategories.length === 0}
                      className={inputClass(!!errors.categoryId)}
                      onChange={(event) => {
                        categoryField.onChange(event);
                        clearErrors('categoryId');
                        setValue('productId', '', { shouldValidate: true });
                      }}
                    >
                      <option value="">Select category</option>
                      {allowedCategories.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    {isCategoryLoading ? <p className="text-[11px] font-medium normal-case tracking-normal text-slate-500">Đang tải danh mục...</p> : null}
                    {isCategoryError ? <p className="text-[11px] font-medium normal-case tracking-normal text-red-600">Không tải được danh mục. Vui lòng thử lại.</p> : null}
                    {!isCategoryLoading && !isCategoryError && allowedCategories.length === 0 ? <p className="text-[11px] font-medium normal-case tracking-normal text-amber-700">Zone này chưa có danh mục hợp lệ để gán bin.</p> : null}
                  </Field>

                  <Field label="Assigned Product" error={errors.productId?.message}>
                    <select
                      {...productField}
                      disabled={!canManage || updateBinMutation.isPending || !categoryId || isProductLoading || isProductError || filteredProducts.length === 0}
                      className={inputClass(!!errors.productId)}
                      onChange={(event) => {
                        productField.onChange(event);
                        clearErrors('productId');
                        void trigger('productId');
                      }}
                    >
                      <option value="">Select product</option>
                      {filteredProducts.map((item) => (
                        <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                      ))}
                    </select>
                    {isProductLoading ? <p className="text-[11px] font-medium normal-case tracking-normal text-slate-500">Đang tải sản phẩm...</p> : null}
                    {isProductError ? <p className="text-[11px] font-medium normal-case tracking-normal text-red-600">Không tải được sản phẩm. Vui lòng thử lại.</p> : null}
                    {!isProductLoading && !isProductError && categoryId && filteredProducts.length === 0 ? <p className="text-[11px] font-medium normal-case tracking-normal text-amber-700">Không có sản phẩm trong danh mục đã chọn.</p> : null}
                  </Field>
                </div>

                {selectedBin.assignedProductName ? (
                  <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                    Bin đang gán sản phẩm: <span className="font-semibold">{selectedBin.assignedProductName}</span>
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                    <span>Occupancy Preview</span>
                    <span className={occupancy > 100 ? 'text-red-600' : 'text-blue-700'}>{occupancy}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full ${occupancy > 100 ? 'bg-red-600' : 'bg-blue-700'}`} style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }}></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setValue('currentLoad', Math.max(0, currentLoad - 10))} disabled={!canManage || updateBinMutation.isPending} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">-10</button>
                    <button type="button" onClick={() => setValue('currentLoad', currentLoad + 10)} disabled={!canManage || updateBinMutation.isPending} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">+10</button>
                    <button type="button" onClick={() => setValue('currentLoad', capacity)} disabled={!canManage || updateBinMutation.isPending} className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60">Set Full</button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canManage || updateBinMutation.isPending}
                  className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateBinMutation.isPending ? 'Đang lưu cấu hình...' : canManage ? 'Lưu cấu hình sức chứa' : 'Bạn không có quyền chỉnh sửa'}
                </button>
              </motion.form>
            ) : (
              <StatePanel title="Chưa có bin" description="Không có dữ liệu bin cho zone hiện tại." icon="grid_view" />
            )}
          </div>

          <div className="rounded-[2rem] bg-slate-100 p-6">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-900">
              <span className="material-symbols-outlined text-sm">thermostat</span>
              Zone Telemetry
            </h4>
            <div className="space-y-3 text-sm">
              <p className="flex items-center justify-between"><span className="text-slate-600">Temperature</span><span className="font-bold text-slate-900">{selectedBin?.temperature?.toFixed(1) ?? 'N/A'}°C</span></p>
              <p className="flex items-center justify-between"><span className="text-slate-600">Humidity</span><span className="font-bold text-slate-900">{selectedBin?.humidity?.toFixed(0) ?? 'N/A'}%</span></p>
              <p className="flex items-center justify-between"><span className="text-slate-600">AGV Activity</span><span className="font-bold text-cyan-700">High (6 active)</span></p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-700">trending_up</span>
              <h4 className="text-sm font-bold text-slate-900">Demand Forecast</h4>
            </div>
            <div className="mb-4 flex h-24 items-end gap-2">
              <div className="h-[40%] flex-1 rounded-t-lg bg-slate-100"></div>
              <div className="h-[60%] flex-1 rounded-t-lg bg-slate-100"></div>
              <div className="h-[50%] flex-1 rounded-t-lg bg-slate-100"></div>
              <div className="h-[90%] flex-1 rounded-t-lg bg-cyan-700"></div>
              <div className="h-[75%] flex-1 rounded-t-lg bg-cyan-500"></div>
              <div className="h-[55%] flex-1 rounded-t-lg bg-cyan-400"></div>
              <div className="h-[40%] flex-1 rounded-t-lg bg-cyan-300"></div>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">Zone {zone.code} expected to reach <span className="font-bold text-slate-900">98% capacity</span> in 4 days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
      <span>{label}</span>
      {children}
      {error ? <p className="text-[11px] font-medium normal-case tracking-normal text-red-600">{error}</p> : null}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-700 focus:ring-blue-100'}`;
}