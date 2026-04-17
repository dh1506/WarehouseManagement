import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { StatePanel } from '@/components/StatePanel';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useBinInventories,
  useUpdateZoneBinCapacity,
  useWarehouseCategoryOptions,
  useWarehouseHubs,
  useWarehouseProductOptions,
  useZoneBins,
} from '../hooks/useWarehouses';
import { BinInventoryPanel } from './BinInventoryPanel';
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilterCategoryId, setDraftFilterCategoryId] = useState('');
  const [draftFilterProductId, setDraftFilterProductId] = useState('');
  const [appliedFilterCategoryId, setAppliedFilterCategoryId] = useState('');
  const [appliedFilterProductId, setAppliedFilterProductId] = useState('');

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

  const hasActiveFilter = Boolean(appliedFilterCategoryId || appliedFilterProductId);
  const activeFilterCount = Number(Boolean(appliedFilterCategoryId)) + Number(Boolean(appliedFilterProductId));

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

  const locationId = selectedBin?.id.replace('loc-', '').trim() ?? '';
  const { data: binInventories = [], isLoading: isInventoryLoading } = useBinInventories(locationId);
  const inventoryCurrentLoad = binInventories.reduce((sum, row) => sum + row.available_quantity, 0);

  useEffect(() => {
    if (!isInventoryLoading) {
      setValue('currentLoad', inventoryCurrentLoad);
    }
  }, [inventoryCurrentLoad, isInventoryLoading, setValue]);

  const allowedCategories = useMemo(() => {
    const allowedIdSet = new Set(zone?.allowedCategoryIds ?? []);
    return (categoryOptionsQuery.data ?? []).filter((item) => allowedIdSet.has(item.id));
  }, [categoryOptionsQuery.data, zone?.allowedCategoryIds]);
  const isCategoryLoading = categoryOptionsQuery.isLoading || categoryOptionsQuery.isFetching;
  const isCategoryError = categoryOptionsQuery.isError;

  const productOptionsQuery = useWarehouseProductOptions(undefined, Boolean(zone));
  const isProductLoading = productOptionsQuery.isLoading || productOptionsQuery.isFetching;
  const isProductError = productOptionsQuery.isError;
  const allProductOptions = productOptionsQuery.data ?? [];
  const productCategoryMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allProductOptions.forEach((product) => {
      map.set(product.id, new Set(product.categoryIds));
    });
    return map;
  }, [allProductOptions]);

  const filterProducts = useMemo(() => {
    if (!draftFilterCategoryId) {
      return allProductOptions;
    }

    return allProductOptions.filter((product) => product.categoryIds.includes(draftFilterCategoryId));
  }, [allProductOptions, draftFilterCategoryId]);

  const filteredProducts = useMemo(
    () => {
      if (!categoryId) {
        return [];
      }

      return allProductOptions.filter((product) => product.categoryIds.includes(categoryId));
    },
    [allProductOptions, categoryId],
  );

  const doesBinMatchFilter = (bin: typeof bins[number]) => {
    if (!hasActiveFilter) {
      return true;
    }

    const matchedByCategory = !appliedFilterCategoryId
      || bin.assignedCategoryId === appliedFilterCategoryId
      || (bin.assignedProductId
        ? (productCategoryMap.get(bin.assignedProductId)?.has(appliedFilterCategoryId) ?? false)
        : false);

    const matchedByProduct = !appliedFilterProductId || bin.assignedProductId === appliedFilterProductId;
    return matchedByCategory && matchedByProduct;
  };

  const matchedBinIdSet = useMemo(() => {
    return new Set(
      bins
        .filter((bin) => doesBinMatchFilter(bin))
        .map((bin) => bin.id),
    );
  }, [appliedFilterCategoryId, appliedFilterProductId, bins, productCategoryMap]);

  const hasMatchedBinsInZone = matchedBinIdSet.size > 0;

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
  const occupancy = capacity > 0 ? Math.round((inventoryCurrentLoad / capacity) * 100) : 0;

  const onSubmit = async (payload: BinCapacityFormData) => {
    if (!zone || !selectedBin || !canManage) return;

    try {
      await updateBinMutation.mutateAsync({
        warehouseId,
        zoneId: zone.id,
        binId: selectedBin.id,
        payload,
      });
      await binsQuery.refetch();
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

  const handleSelectBin = (binId: string) => {
    setSelectedBinId(binId);
    void binsQuery.refetch();
  };

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftFilterCategoryId(appliedFilterCategoryId);
      setDraftFilterProductId(appliedFilterProductId);
    }
    setIsFilterOpen((current) => !current);
  };

  const handleApplyFilters = () => {
    setAppliedFilterCategoryId(draftFilterCategoryId);
    setAppliedFilterProductId(draftFilterProductId);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setDraftFilterCategoryId('');
    setDraftFilterProductId('');
    setAppliedFilterCategoryId('');
    setAppliedFilterProductId('');
  };

  if (hubsQuery.isError || binsQuery.isError || !zone) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <StatePanel title="Không tải được zone" description="Vui lòng quay lại Warehouse Hub để thử lại." icon="error" tone="error" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8f9fb] p-3 sm:p-4 lg:p-5">
      <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back to Warehouse"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-700 transition hover:bg-blue-50 hover:text-blue-800"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Warehouse Zone {zone.code}</h1>
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-slate-600">Storage Rack</p>
                  <div className="flex flex-wrap gap-3">
                    {(['empty', 'low', 'partial', 'full', 'overloaded'] as BinOccupancyLevel[]).map((levelValue) => (
                      <div key={levelValue} className="flex items-center gap-1.5">
                        <span className={`h-3.5 w-3.5 rounded ${getOccupancyColor(levelValue).split(' ')[0]}`}></span>
                        <span className="text-xs text-slate-600">{getLegendLabel(levelValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">search</span>
                    <input
                      value={rackBinSearch}
                      onChange={(event) => setRackBinSearch(event.target.value)}
                      placeholder="Tìm rack hoặc bin..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="relative sm:shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleFilter}
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-lg sm:w-auto ${hasActiveFilter ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600' : 'bg-blue-700 shadow-blue-700/20 hover:bg-blue-800'}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">filter_list</span>
                      View Filters
                      {hasActiveFilter ? (
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-black text-amber-700">{activeFilterCount}</span>
                      ) : null}
                    </button>

                    {isFilterOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Category
                            <select
                              value={draftFilterCategoryId}
                              onChange={(event) => {
                                const nextCategoryId = event.target.value;
                                setDraftFilterCategoryId(nextCategoryId);
                                setDraftFilterProductId('');
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                              disabled={isCategoryLoading || isCategoryError}
                            >
                              <option value="">All categories</option>
                              {allowedCategories.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Assigned Product
                            <select
                              value={draftFilterProductId}
                              onChange={(event) => setDraftFilterProductId(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                              disabled={isProductLoading || isProductError || filterProducts.length === 0}
                            >
                              <option value="">All products</option>
                              {filterProducts.map((item) => (
                                <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                              ))}
                            </select>
                          </label>

                          <div className="flex justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleClearFilters}
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                            >
                              Clear Filters
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyFilters}
                              className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
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
                {hasActiveFilter && !hasMatchedBinsInZone ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    No bins found matching the filter criteria.
                  </p>
                ) : null}
              </div>
            </div>

            {viewMode === 'grid' ? (
              <motion.div className="pb-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="h-[calc(100vh-22rem)] min-h-104 max-h-[70vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 pr-2 sm:p-3">
                  {levelGroups.map((group) => {
                    return (
                      <div key={group.levelCode} className="space-y-2">
                        <p className="text-center text-xs font-bold text-slate-900">LEVEL {group.levelCode}</p>
                        <div className="overflow-x-auto">
                          <div className="mx-auto flex w-max min-w-full justify-center gap-2 pb-1">
                            {group.items.map(({ bin, coordinate }) => (
                              (() => {
                                const matched = matchedBinIdSet.has(bin.id);
                                const isSelected = selectedBin?.id === bin.id;
                                const dimClass = hasActiveFilter && !matched
                                  ? (isSelected ? 'opacity-70 grayscale' : 'opacity-35 grayscale')
                                  : '';
                                return (
                                  <button
                                    key={bin.id}
                                    type="button"
                                    onClick={() => handleSelectBin(bin.id)}
                                    className={`flex h-10 w-20 items-center justify-center rounded-lg px-1 text-[11px] font-bold leading-tight ring-offset-2 transition hover:ring-2 ${getOccupancyColor(bin.occupancyLevel)} ${dimClass} ${isSelected ? 'ring-2 ring-blue-700' : ''}`}
                                    title={`Bin ${coordinate.binCode}`}
                                  >
                                    {coordinate.binCode}
                                  </button>
                                );
                              })()
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {levelGroups.length === 0 ? (
                    <StatePanel title="Không có ô phù hợp" description="Thử thay đổi bộ lọc rack/bin để xem dữ liệu phù hợp." icon="search" />
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <div className="max-h-105 space-y-2 overflow-y-auto pr-1">
                {binsOfRack.map(({ bin }) => (
                  <button
                    key={bin.id}
                    type="button"
                    onClick={() => handleSelectBin(bin.id)}
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

        </div>

        <div className="space-y-6 xl:col-span-4">
          {selectedBin && locationId && (
            <BinInventoryPanel
              locationId={locationId}
              warehouseId={warehouseId}
              zoneId={zone.id}
            />
          )}
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
                  <input type="hidden" {...register('items', { valueAsNumber: true })} />
                  <input type="hidden" {...register('productCount', { valueAsNumber: true })} />
                  <input type="hidden" {...register('currentLoad', { valueAsNumber: true })} />
                  <Field label="Capacity" error={errors.capacity?.message}><input type="number" min={1} step={1} {...register('capacity', { valueAsNumber: true })} disabled={!canManage || updateBinMutation.isPending} className={inputClass(!!errors.capacity)} /></Field>
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Current Load
                    </span>
                    <div className={`${inputClass(false)} flex items-center justify-between bg-slate-50 cursor-not-allowed`}>
                      {isInventoryLoading
                        ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                        : <span className="text-slate-500">{inventoryCurrentLoad}</span>
                      }
                      <span className="material-symbols-outlined text-[13px] text-slate-300">lock</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Từ API tồn kho</p>
                  </div>
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
                  <p className="text-[10px] text-slate-400 mt-1">Sức chứa thực tế được cập nhật qua kiểm kê ô bên dưới.</p>
                </div>

                <button
                  type="submit"
                  disabled={!canManage || updateBinMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateBinMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Đang lưu cấu hình...
                    </>
                  ) : canManage ? 'Lưu cấu hình sức chứa' : 'Bạn không có quyền chỉnh sửa'}
                </button>
              </motion.form>
            ) : (
              <StatePanel title="Chưa có bin" description="Không có dữ liệu bin cho zone hiện tại." icon="grid_view" />
            )}
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