import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Plus,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  ChevronsUpDown,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAllocateLots } from '../hooks/useInboundDetail';
import { useProductLocationInventory } from '@/features/inventory/hooks/useInventoryOverview';
import type { StockInDetail } from '../types/inboundType';
import type { AllocateLotPayload } from '../types/inboundDetailType';
import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { OccupancyBadge } from '@/components/OccupancyBadge';
import { CapacityProgress } from '@/components/CapacityProgress';

// ── Kiểu dữ liệu thô từ API tìm kiếm vị trí ─────────────────────────────────

interface LocationRaw {
  id: number;
  location_code: string;
  full_path: string;
  location_status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  zone_code: string | null;
  warehouse: { name: string; code: string };
  // Trường sức chứa tuỳ chọn — có mặt khi endpoint tìm kiếm BE trả về
  capacity?: number;
  current_load?: number;
}

interface LocationListResponse {
  locations: LocationRaw[];
  pagination: { total: number };
}

// ── Kiểu dữ liệu form ────────────────────────────────────────────────────────

interface AllocRow {
  rowId: string;
  location_id: number | null;
  location_code: string;
  location_status?: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  location_capacity?: number;
  location_current_load?: number;
  lot_no: string;
  quantity: number | '';
  production_date: string;
  expired_date: string;
}

type FormState = Record<number, AllocRow[]>; // key là StockInDetail.id

// ── Props ────────────────────────────────────────────────────────────────────

interface AllocateLotsSheetProps {
  open: boolean;
  onClose: () => void;
  stockInId: number;
  details: StockInDetail[];
  defaultLocationId?: number;
  defaultLocationCode?: string;
}

// ── Hàm tiện ích thuần túy ────────────────────────────────────────────────────

function makeRow(defaults?: { location_id: number; location_code: string }): AllocRow {
  return {
    rowId: Math.random().toString(36).slice(2),
    location_id: defaults?.location_id ?? null,
    location_code: defaults?.location_code ?? '',
    location_status: undefined,
    location_capacity: undefined,
    location_current_load: undefined,
    lot_no: '',
    quantity: '',
    production_date: '',
    expired_date: '',
  };
}

function sumAlreadyAllocated(detail: StockInDetail): number {
  return detail.lots.reduce((acc, l) => acc + Number(l.quantity), 0);
}

function calcRemaining(detail: StockInDetail): number {
  return Math.max(0, Number(detail.received_quantity) - sumAlreadyAllocated(detail));
}

// Ngày hôm nay dạng YYYY-MM-DD theo giờ địa phương — dùng cho thuộc tính min/max và kiểm tra hợp lệ
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Số ngày còn lại trên kệ tính từ hôm nay; null nếu ngày trống
function shelfLifeDays(expiredDate: string): number | null {
  if (!expiredDate) return null;
  const expiry = new Date(expiredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── LocationCombobox ──────────────────────────────────────────────────────────
// Dropdown tìm kiếm vị trí lưu kho; ưu tiên vị trí đã chứa cùng SKU (AC02).

interface LocationOption {
  id: number;
  code: string;
  status?: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  capacity?: number;
  current_load?: number;
}

interface LocationComboboxProps {
  productId: number;
  value: LocationOption | null;
  onSelect: (loc: LocationOption) => void;
}

function LocationCombobox({ productId, value, onSelect }: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Vị trí đã chứa hàng cùng SKU (AC02)
  const { data: existingLocs, isLoading: existingLoading } = useProductLocationInventory(
    String(productId),
    '',
    open,
  );

  // Tất cả vị trí qua tìm kiếm toàn văn
  const { data: allLocsRaw, isLoading: allLoading } = useQuery({
    queryKey: ['warehouse-locations', 'alloc-search', search],
    queryFn: async () => {
      const res = await apiClient.get('/api/warehouses/locations/search', {
        params: { page: 1, limit: 100, search: search || undefined },
      });
      return (res as unknown as ApiResponse<LocationListResponse>).data.locations;
    },
    staleTime: 30_000,
    enabled: open,
  });

  const existingLocIds = useMemo(
    () => new Set((existingLocs ?? []).map((l) => l.locationId)),
    [existingLocs],
  );

  const otherLocs = useMemo(
    () => (allLocsRaw ?? []).filter((l) => !existingLocIds.has(l.id)),
    [allLocsRaw, existingLocIds],
  );

  const isLoading = existingLoading || allLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-lg border bg-white px-2.5 text-xs outline-none transition-all hover:border-slate-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-100',
            value ? 'border-slate-200 text-slate-800' : 'border-slate-200 text-slate-400',
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            {value ? (
              <span className="truncate font-medium text-slate-800">{value.code}</span>
            ) : (
              'Chọn vị trí lưu kho...'
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm mã vị trí..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-60">
            {isLoading ? (
              <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải...
              </div>
            ) : (
              <>
                {(existingLocs?.length ?? 0) === 0 && otherLocs.length === 0 && (
                  <CommandEmpty>Không tìm thấy vị trí nào.</CommandEmpty>
                )}

                {/* Nhóm 1 — vị trí đã chứa hàng cùng SKU (ưu tiên AC02) */}
                {(existingLocs?.length ?? 0) > 0 && (
                  <CommandGroup heading="Đã có hàng cùng SKU (ưu tiên)">
                    {existingLocs!.map((loc) => {
                      const allLocData = (allLocsRaw ?? []).find((l) => l.id === loc.locationId);
                      return (
                        <CommandItem
                          key={loc.locationId}
                          value={loc.locationCode}
                          onSelect={() => {
                            onSelect({
                              id: loc.locationId,
                              code: loc.locationCode,
                              status: allLocData?.location_status,
                              capacity: allLocData?.capacity,
                              current_load: allLocData?.current_load,
                            });
                            setOpen(false);
                            setSearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-1.5 h-3.5 w-3.5 shrink-0',
                              value?.id === loc.locationId ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-slate-800">{loc.locationCode}</span>
                            {loc.warehouseName && (
                              <span className="ml-1 text-[10px] text-slate-400">· {loc.warehouseName}</span>
                            )}
                          </div>
                          <span className="ml-2 shrink-0 text-[10px] font-semibold text-emerald-600">
                            {loc.available.toLocaleString()} khả dụng
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {(existingLocs?.length ?? 0) > 0 && otherLocs.length > 0 && (
                  <CommandSeparator />
                )}

                {/* Nhóm 2 — tất cả vị trí còn lại */}
                {otherLocs.length > 0 && (
                  <CommandGroup heading="Vị trí khác">
                    {otherLocs.slice(0, 50).map((loc) => (
                      <CommandItem
                        key={loc.id}
                        value={loc.location_code}
                        onSelect={() => {
                          onSelect({
                            id: loc.id,
                            code: loc.location_code,
                            status: loc.location_status,
                            capacity: loc.capacity,
                            current_load: loc.current_load,
                          });
                          setOpen(false);
                          setSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-1.5 h-3.5 w-3.5 shrink-0',
                            value?.id === loc.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-slate-800">{loc.location_code}</span>
                          {loc.warehouse?.name && (
                            <span className="ml-1 text-[10px] text-slate-400">· {loc.warehouse.name}</span>
                          )}
                        </div>
                        <span
                          className={cn(
                            'ml-2 shrink-0 text-[10px] font-semibold',
                            loc.location_status === 'AVAILABLE'
                              ? 'text-emerald-600'
                              : loc.location_status === 'PARTIAL'
                              ? 'text-amber-500'
                              : 'text-rose-400',
                          )}
                        >
                          {loc.location_status}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── LotCombobox ───────────────────────────────────────────────────────────────
// Dropdown tìm kiếm lô hàng cho sản phẩm; hiển thị lô hiện có làm gợi ý
// và cho phép nhập mã lô mới sẽ được tạo khi xác nhận.

interface LotSuggestion {
  lotNo: string;
  expiredDate: string | null;
}

interface InventoryLotApiItem {
  id: number;
  lot_no: string;
  status: string;
  expired_date: string | null;
}

interface InventoryApiRow {
  lots?: InventoryLotApiItem[];
}

interface InventoryApiData {
  items?: InventoryApiRow[];
  inventories?: InventoryApiRow[];
}

interface LotComboboxProps {
  productId: number;
  value: string;
  onChange: (lotNo: string) => void;
}

function LotCombobox({ productId, value, onChange }: LotComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: suggestions = [], isLoading } = useQuery<LotSuggestion[]>({
    queryKey: ['lot-suggestions', productId],
    queryFn: async () => {
      const res = await apiClient.get('/api/inventories', {
        params: { page: 1, limit: 100, product_id: productId },
      });
      const payload = (res as unknown as ApiResponse<InventoryApiData>).data;
      const rows = payload.items ?? payload.inventories ?? [];
      const map = new Map<string, LotSuggestion>();
      rows.forEach((row) => {
        (row.lots ?? []).forEach((lot) => {
          if (!map.has(lot.lot_no)) {
            map.set(lot.lot_no, { lotNo: lot.lot_no, expiredDate: lot.expired_date });
          }
        });
      });
      return Array.from(map.values()).sort((a, b) => a.lotNo.localeCompare(b.lotNo));
    },
    staleTime: 60_000,
    enabled: open && productId > 0,
  });

  const filtered = search
    ? suggestions.filter((s) => s.lotNo.toLowerCase().includes(search.toLowerCase()))
    : suggestions;

  const isNewLot = search.trim() !== '' && !suggestions.some((s) => s.lotNo === search.trim());

  const apply = (lotNo: string) => {
    onChange(lotNo);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-lg border bg-white px-2.5 text-xs outline-none transition-all hover:border-slate-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-100',
            value ? 'border-slate-200 text-slate-800' : 'border-slate-200 text-slate-400',
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <Package className="h-3 w-3 shrink-0 text-slate-400" />
            {value ? (
              <span className="truncate font-medium text-slate-800">{value}</span>
            ) : (
              'Chọn hoặc nhập mã lô...'
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm hoặc nhập mã lô mới..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-52">
            {isLoading ? (
              <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải lô hiện có...
              </div>
            ) : (
              <>
                {/* Mã lô mới */}
                {isNewLot && (
                  <CommandGroup heading="Lô mới">
                    <CommandItem value={search.trim()} onSelect={() => apply(search.trim())}>
                      <Check className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-0" />
                      <span className="text-xs font-medium text-blue-700">{search.trim()}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-slate-400">Tạo mới</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* Lô hiện có */}
                {filtered.length > 0 && (
                  <CommandGroup heading={suggestions.length > 0 ? 'Lô hiện có trong hệ thống' : undefined}>
                    {filtered.map((s) => (
                      <CommandItem
                        key={s.lotNo}
                        value={s.lotNo}
                        onSelect={() => apply(s.lotNo)}
                      >
                        <Check
                          className={cn(
                            'mr-1.5 h-3.5 w-3.5 shrink-0',
                            value === s.lotNo ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="text-xs font-medium text-slate-800">{s.lotNo}</span>
                        {s.expiredDate && (
                          <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                            HSD: {s.expiredDate.slice(0, 10)}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {filtered.length === 0 && !isNewLot && (
                  <CommandEmpty>
                    {productId > 0
                      ? 'Chưa có lô nào. Nhập mã lô mới ở trên.'
                      : 'Chọn sản phẩm trước.'}
                  </CommandEmpty>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── AllocateLotsSheet — Form phân bổ lô hàng ─────────────────────────────────

export function AllocateLotsSheet({
  open,
  onClose,
  stockInId,
  details,
  defaultLocationId,
  defaultLocationCode,
}: AllocateLotsSheetProps) {
  const { toast } = useToast();
  const allocateMutation = useAllocateLots(stockInId);

  // Chỉ lấy các dòng đã nhận hàng thực tế (received_quantity > 0)
  const activeDetails = useMemo(
    () => details.filter((d) => Number(d.received_quantity) > 0),
    [details],
  );

  const [formState, setFormState] = useState<FormState>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Đặt lại form mỗi khi mở sheet; điền sẵn vị trí kho mặc định cho từng dòng.
  useEffect(() => {
    if (!open) return;
    const locDefaults =
      defaultLocationId && defaultLocationCode
        ? { location_id: defaultLocationId, location_code: defaultLocationCode }
        : undefined;
    const fresh: FormState = Object.fromEntries(
      details
        .filter((d) => Number(d.received_quantity) > 0)
        .map((d) => {
          const rem = calcRemaining(d);
          return [d.id, rem > 0 ? [makeRow(locDefaults)] : []];
        }),
    );
    setFormState(fresh);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Thêm / xoá / cập nhật dòng phân bổ ────────────────────────────────────

  const addRow = useCallback((detailId: number) => {
    setFormState((prev) => ({
      ...prev,
      [detailId]: [...(prev[detailId] ?? []), makeRow()],
    }));
  }, []);

  const removeRow = useCallback((detailId: number, rowId: string) => {
    setFormState((prev) => ({
      ...prev,
      [detailId]: (prev[detailId] ?? []).filter((r) => r.rowId !== rowId),
    }));
  }, []);

  const updateRow = useCallback(
    (detailId: number, rowId: string, patch: Partial<AllocRow>) => {
      setFormState((prev) => ({
        ...prev,
        [detailId]: (prev[detailId] ?? []).map((r) =>
          r.rowId === rowId ? { ...r, ...patch } : r,
        ),
      }));
    },
    [],
  );

  const clearError = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  // ── Kiểm tra hợp lệ trước khi gửi ─────────────────────────────────────────
  // AC03 — lot_no, ngày sản xuất, ngày hết hạn bắt buộc; hạn dùng phải sau hôm nay
  // AC04 — mỗi dòng đã nhận phải có ít nhất một dòng phân bổ
  // AC05 — tổng số lượng các dòng mới phải bằng số lượng còn lại (±0.001)
  // AC08 — số lượng phân bổ không được vượt sức chứa còn lại của vị trí

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const today = todayStr();

    for (const detail of activeDetails) {
      const rem = calcRemaining(detail);
      if (rem <= 0) continue; // already fully allocated — skip

      const rows = formState[detail.id] ?? [];

      // AC04 — phải có ít nhất một dòng phân bổ
      if (rows.length === 0) {
        newErrors[`detail_${detail.id}`] =
          `Chưa có dòng phân bổ nào cho sản phẩm "${detail.product.name}".`;
        continue;
      }

      // Kiểm tra trùng lặp lot_no + location_id trong cùng sản phẩm
      const seenLotLoc = new Set<string>();
      for (const row of rows) {
        if (row.lot_no.trim() && row.location_id) {
          const key = `${row.lot_no.trim()}::${row.location_id}`;
          if (seenLotLoc.has(key)) {
            newErrors[`dup_${detail.id}`] =
              `Lô "${row.lot_no.trim()}" và vị trí đã nhập trùng — hãy gộp lại thành 1 dòng.`;
            break;
          }
          seenLotLoc.add(key);
        }
      }

      let totalNewQty = 0;

      for (const row of rows) {
        // Vị trí bắt buộc và không được ở trạng thái ĐẦY
        if (!row.location_id) {
          newErrors[`loc_${detail.id}_${row.rowId}`] = 'Chưa chọn vị trí lưu kho.';
        } else if (row.location_status === 'FULL') {
          newErrors[`loc_${detail.id}_${row.rowId}`] =
            'Vị trí này đã đầy (FULL) — vui lòng chọn vị trí khác.';
        }

        // Mã lô bắt buộc
        if (!row.lot_no.trim()) {
          newErrors[`lot_${detail.id}_${row.rowId}`] = 'Chưa nhập mã lô.';
        }

        // Số lượng phải > 0
        if (row.quantity === '' || Number(row.quantity) <= 0) {
          newErrors[`qty_${detail.id}_${row.rowId}`] = 'Số lượng phải > 0.';
        } else {
          totalNewQty += Number(row.quantity);

          // AC08 — kiểm tra sức chứa vị trí
          if (row.location_capacity && row.location_capacity > 0) {
            const remaining = row.location_capacity - (row.location_current_load ?? 0);
            if (Number(row.quantity) > remaining) {
              newErrors[`cap_${detail.id}_${row.rowId}`] =
                `Vượt công suất: vị trí chỉ còn ${remaining.toLocaleString()} chỗ trống.`;
            }
          }
        }

        // Ngày sản xuất — bắt buộc (§11.4 quy định F&B)
        if (!row.production_date) {
          newErrors[`mfg_${detail.id}_${row.rowId}`] = 'Ngày sản xuất là bắt buộc.';
        }

        // Ngày hết hạn — bắt buộc và phải sau hôm nay (§11.4, AC03)
        if (!row.expired_date) {
          newErrors[`exp_${detail.id}_${row.rowId}`] = 'Ngày hết hạn là bắt buộc.';
        } else if (row.expired_date <= today) {
          newErrors[`exp_${detail.id}_${row.rowId}`] =
            'Ngày hết hạn phải sau ngày hôm nay.';
        }
      }

      // AC05 — tổng số lượng dòng mới phải bằng phần chưa phân bổ
      const hasRowLevelErrors = Object.keys(newErrors).some(
        (k) =>
          k.startsWith(`loc_${detail.id}`) ||
          k.startsWith(`lot_${detail.id}`) ||
          k.startsWith(`qty_${detail.id}`),
      );
      if (
        !newErrors[`detail_${detail.id}`] &&
        !newErrors[`dup_${detail.id}`] &&
        !hasRowLevelErrors &&
        Math.abs(totalNewQty - rem) > 0.001
      ) {
        newErrors[`detail_${detail.id}`] = `Tổng số lượng (${totalNewQty.toLocaleString()}) phải bằng số lượng còn lại cần phân bổ (${rem.toLocaleString()}).`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [activeDetails, formState]);

  // ── Gửi dữ liệu phân bổ lên server ──────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const allocations: AllocateLotPayload['allocations'] = [];

    for (const detail of activeDetails) {
      const rem = calcRemaining(detail);
      if (rem <= 0) continue;

      for (const row of formState[detail.id] ?? []) {
        allocations.push({
          stock_in_detail_id: detail.id,
          location_id: row.location_id!,
          lot_no: row.lot_no.trim(),
          quantity: Number(row.quantity),
          // Schema BE dùng z.string().datetime() — chuyển YYYY-MM-DD sang ISO 8601 đầy đủ
          production_date: row.production_date
            ? `${row.production_date}T00:00:00.000Z`
            : undefined,
          expired_date: row.expired_date
            ? `${row.expired_date}T00:00:00.000Z`
            : undefined,
        });
      }
    }

    if (allocations.length === 0) {
      toast({
        title: 'Không có dữ liệu phân bổ mới',
        description: 'Tất cả sản phẩm đã được phân bổ đầy đủ.',
        variant: 'destructive',
      });
      return;
    }

    allocateMutation.mutate(
      { allocations },
      {
        onSuccess: () => {
          toast({
            title: 'Phân bổ lô thành công',
            description: 'Lô hàng đã được ghi nhận vào vị trí lưu kho.',
          });
          onClose();
        },
        onError: (e) => {
          toast({
            title: 'Phân bổ thất bại',
            description: (e as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }, [validate, allocateMutation, activeDetails, formState, toast, onClose]);

  if (!open) return null;

  const allFullyAllocated = activeDetails.every((d) => calcRemaining(d) <= 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Lớp phủ nền */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />

        {/* Tấm panel bên phải */}
        <motion.div
          className="relative flex h-full w-145 max-w-full flex-col bg-white shadow-2xl"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Tiêu đề */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Phân bổ lô hàng</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Chỉ định vị trí, mã lô, ngày sản xuất và hạn sử dụng cho từng sản phẩm
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nội dung chính */}
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

            {/* Trạng thái rỗng */}
            {activeDetails.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <Package className="h-10 w-10" />
                <p className="text-sm">Không có sản phẩm nào cần phân bổ.</p>
              </div>
            )}

            {/* Tất cả đã phân bổ đầy đủ */}
            {activeDetails.length > 0 && allFullyAllocated && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <p className="text-sm font-medium text-emerald-700">
                  Tất cả sản phẩm đã được phân bổ lô đầy đủ.
                </p>
              </div>
            )}

            {/* Form phân bổ từng dòng sản phẩm */}
            {activeDetails.map((detail) => {
              const receivedQty  = Number(detail.received_quantity);
              const allocatedQty = sumAlreadyAllocated(detail);
              const remainingQty = calcRemaining(detail);
              const isFullyAllocated = remainingQty <= 0;
              const rows = formState[detail.id] ?? [];

              const newRowsTotal = rows.reduce(
                (acc, r) => acc + (r.quantity !== '' ? Number(r.quantity) : 0),
                0,
              );

              return (
                <motion.section
                  key={detail.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
                >
                  {/* Tiêu đề sản phẩm */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {detail.product.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {detail.product.code} · {detail.product.base_uom.code}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px]">
                      <span className="text-slate-500">
                        Đã nhận:{' '}
                        <span className="font-bold text-slate-700">
                          {receivedQty.toLocaleString()}
                        </span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">
                        Đã p/b:{' '}
                        <span
                          className={cn(
                            'font-bold',
                            isFullyAllocated ? 'text-emerald-600' : 'text-amber-600',
                          )}
                        >
                          {allocatedQty.toLocaleString()}
                        </span>
                      </span>
                      {isFullyAllocated ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-3">
                    {/* Lô đã phân bổ trước — chỉ đọc */}
                    {detail.lots.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Đã phân bổ trước
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.lots.map((lot) => (
                            <span
                              key={lot.id}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200"
                            >
                              <span className="font-semibold">{lot.product_lot.lot_no}</span>
                              <span className="text-emerald-400">·</span>
                              <span>
                                {Number(lot.quantity).toLocaleString()} {detail.product.base_uom.code}
                              </span>
                              <span className="text-[10px] text-emerald-500">
                                @ {lot.product_lot.inventory.location.full_path}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Đã phân bổ đầy đủ — không cần form */}
                    {isFullyAllocated ? (
                      <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Đã phân bổ đầy đủ — không cần thêm dòng mới
                      </p>
                    ) : (
                      <>
                        {/* Chỉ báo tiến trình số lượng còn lại */}
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-slate-500">
                            Cần phân bổ thêm:{' '}
                            <span
                              className={cn(
                                'font-bold',
                                newRowsTotal === remainingQty
                                  ? 'text-emerald-600'
                                  : newRowsTotal > remainingQty
                                  ? 'text-rose-500'
                                  : 'text-amber-600',
                              )}
                            >
                              {newRowsTotal.toLocaleString()} / {remainingQty.toLocaleString()}{' '}
                              {detail.product.base_uom.code}
                            </span>
                          </p>
                          {(errors[`detail_${detail.id}`] || errors[`dup_${detail.id}`]) && (
                            <p className="max-w-55 text-right text-[11px] font-medium text-rose-500">
                              {errors[`detail_${detail.id}`] ?? errors[`dup_${detail.id}`]}
                            </p>
                          )}
                        </div>

                        {/* Các dòng nhập liệu phân bổ */}
                        <div className="space-y-2">
                          <AnimatePresence initial={false}>
                            {rows.map((row, rowIdx) => {
                              // Tổng số lượng các dòng cùng sản phẩm hướng đến cùng vị trí
                              const totalPendingForLoc = rows
                                .filter((r) => r.location_id === row.location_id)
                                .reduce(
                                  (acc, r) => acc + (r.quantity !== '' ? Number(r.quantity) : 0),
                                  0,
                                );

                              const hasCapacity =
                                !!row.location_id &&
                                !!row.location_capacity &&
                                row.location_capacity > 0;

                              const occupancyPct =
                                hasCapacity
                                  ? ((row.location_current_load ?? 0) / row.location_capacity!) * 100
                                  : undefined;

                              return (
                                <motion.div
                                  key={row.rowId}
                                  layout
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="group space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
                                >
                                  {/* Tiêu đề dòng */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Dòng {rowIdx + 1}
                                    </span>
                                    {rows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeRow(detail.id, row.rowId)}
                                        className="rounded p-0.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {/* ── Chọn vị trí lưu kho (AC02) ── */}
                                  <div>
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                      Vị trí lưu kho <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 min-w-0">
                                        <LocationCombobox
                                          productId={detail.product_id}
                                          value={
                                            row.location_id
                                              ? { id: row.location_id, code: row.location_code }
                                              : null
                                          }
                                          onSelect={(loc) => {
                                            updateRow(detail.id, row.rowId, {
                                              location_id: loc.id,
                                              location_code: loc.code,
                                              location_status: loc.status,
                                              location_capacity: loc.capacity,
                                              location_current_load: loc.current_load,
                                            });
                                            clearError(`loc_${detail.id}_${row.rowId}`);
                                          }}
                                        />
                                      </div>
                                      {/* Huy hiệu mức độ chiếm dụng — AC07 màu trạng thái vị trí */}
                                      {row.location_id && (
                                        <OccupancyBadge
                                          occupancyPct={occupancyPct}
                                          locationStatus={row.location_status}
                                        />
                                      )}
                                    </div>
                                    {errors[`loc_${detail.id}_${row.rowId}`] && (
                                      <p className="mt-0.5 text-[10px] text-rose-500">
                                        {errors[`loc_${detail.id}_${row.rowId}`]}
                                      </p>
                                    )}
                                    {/* Thanh tiến trình sức chứa — AC08 hiển thị mức chiếm dụng */}
                                    {hasCapacity && (
                                      <div className="mt-1.5">
                                        <CapacityProgress
                                          capacity={row.location_capacity!}
                                          currentLoad={row.location_current_load ?? 0}
                                          pendingQty={totalPendingForLoc}
                                        />
                                      </div>
                                    )}
                                    {errors[`cap_${detail.id}_${row.rowId}`] && (
                                      <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                                        <AlertTriangle className="h-3 w-3 shrink-0" />
                                        {errors[`cap_${detail.id}_${row.rowId}`]}
                                      </p>
                                    )}
                                  </div>

                                  {/* ── Mã lô + Số lượng ── */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                        Mã lô <span className="text-rose-500">*</span>
                                      </label>
                                      <LotCombobox
                                        productId={detail.product_id}
                                        value={row.lot_no}
                                        onChange={(lotNo) => {
                                          updateRow(detail.id, row.rowId, { lot_no: lotNo });
                                          clearError(
                                            `lot_${detail.id}_${row.rowId}`,
                                            `dup_${detail.id}`,
                                          );
                                        }}
                                      />
                                      {errors[`lot_${detail.id}_${row.rowId}`] && (
                                        <p className="mt-0.5 text-[10px] text-rose-500">
                                          {errors[`lot_${detail.id}_${row.rowId}`]}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                        Số lượng <span className="text-rose-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        value={row.quantity}
                                        onChange={(e) => {
                                          updateRow(detail.id, row.rowId, {
                                            quantity:
                                              e.target.value === '' ? '' : Number(e.target.value),
                                          });
                                          clearError(
                                            `qty_${detail.id}_${row.rowId}`,
                                            `detail_${detail.id}`,
                                            `cap_${detail.id}_${row.rowId}`,
                                          );
                                        }}
                                        min={0.001}
                                        step="any"
                                        placeholder="0"
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs tabular-nums outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                                      />
                                      {errors[`qty_${detail.id}_${row.rowId}`] && (
                                        <p className="mt-0.5 text-[10px] text-rose-500">
                                          {errors[`qty_${detail.id}_${row.rowId}`]}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* ── Ngày sản xuất & hạn dùng — bắt buộc theo §11.4 F&B ── */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                        NSX <span className="text-rose-500">*</span>
                                      </label>
                                      <input
                                        type="date"
                                        value={row.production_date}
                                        max={todayStr()}
                                        onChange={(e) => {
                                          updateRow(detail.id, row.rowId, {
                                            production_date: e.target.value,
                                          });
                                          clearError(`mfg_${detail.id}_${row.rowId}`);
                                        }}
                                        className={cn(
                                          'h-8 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100',
                                          errors[`mfg_${detail.id}_${row.rowId}`]
                                            ? 'border-rose-300'
                                            : 'border-slate-200',
                                        )}
                                      />
                                      {errors[`mfg_${detail.id}_${row.rowId}`] && (
                                        <p className="mt-0.5 text-[10px] text-rose-500">
                                          {errors[`mfg_${detail.id}_${row.rowId}`]}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                        HSD <span className="text-rose-500">*</span>
                                      </label>
                                      <input
                                        type="date"
                                        value={row.expired_date}
                                        min={todayStr()}
                                        onChange={(e) => {
                                          updateRow(detail.id, row.rowId, {
                                            expired_date: e.target.value,
                                          });
                                          clearError(`exp_${detail.id}_${row.rowId}`);
                                        }}
                                        className={cn(
                                          'h-8 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100',
                                          errors[`exp_${detail.id}_${row.rowId}`]
                                            ? 'border-rose-300'
                                            : 'border-slate-200',
                                        )}
                                      />
                                      {errors[`exp_${detail.id}_${row.rowId}`] && (
                                        <p className="mt-0.5 text-[10px] text-rose-500">
                                          {errors[`exp_${detail.id}_${row.rowId}`]}
                                        </p>
                                      )}
                                      {/* Chip hạn sử dụng còn lại — hiển thị khi nhập ngày tương lai hợp lệ */}
                                      {(() => {
                                        const days = shelfLifeDays(row.expired_date);
                                        if (days === null || days <= 0) return null;
                                        return (
                                          <span
                                            className={cn(
                                              'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                                              days <= 30
                                                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                                : 'bg-slate-50 text-slate-500 ring-slate-200',
                                            )}
                                          >
                                            Còn {days} ngày
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        {/* Thêm dòng phân bổ */}
                        <button
                          type="button"
                          onClick={() => addRow(detail.id)}
                          className="flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-[11px] font-medium text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
                        >
                          <Plus className="h-3 w-3" />
                          Thêm dòng phân bổ
                        </button>
                      </>
                    )}
                  </div>
                </motion.section>
              );
            })}
          </div>

          {/* Chân trang */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={allocateMutation.isPending}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={allocateMutation.isPending || allFullyAllocated}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {allocateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận phân bổ
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
