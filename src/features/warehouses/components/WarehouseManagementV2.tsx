import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { hasModuleActionPermission } from '@/utils/module-permission';
import {
  useCreateWarehouse,
  useCreateWarehouseLocation,
  useWarehouseLocations,
  useWarehouseOptions,
  useWarehouses,
  useUpdateWarehouse,
  useUpdateWarehouseLocation,
} from '../hooks/useWarehouses';
import type {
  StorageCondition,
  WarehouseItem,
  WarehouseLocationItem,
  WarehouseLocationStatus,
  WarehouseStatus,
} from '../types/warehouseType';
import { LocationFormDialog, WarehouseFormDialog } from './WarehouseSheets';

const PAGE_SIZE = 8;

export function WarehouseManagementV2() {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const canCreate = hasModuleActionPermission({
    permissions: userPermissions,
    moduleName: 'warehouses',
    moduleAliases: ['warehouse'],
    action: 'create',
    roleName: user?.role,
  });

  const canEdit = hasModuleActionPermission({
    permissions: userPermissions,
    moduleName: 'warehouses',
    moduleAliases: ['warehouse'],
    action: 'edit',
    roleName: user?.role,
  });

  const [tab, setTab] = useState<'warehouses' | 'locations'>('warehouses');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseStatus, setWarehouseStatus] = useState<WarehouseStatus | 'all'>('all');
  const [locationStatus, setLocationStatus] = useState<WarehouseLocationStatus | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [storageFilter, setStorageFilter] = useState<StorageCondition | 'all'>('all');
  const [warehouseMode, setWarehouseMode] = useState<'create' | 'edit' | 'view'>('create');
  const [locationMode, setLocationMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocationItem | null>(null);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const warehouseQuery = useWarehouses({
    search: tab === 'warehouses' ? search || undefined : undefined,
    status: tab === 'warehouses' ? warehouseStatus : 'all',
    page,
    pageSize: PAGE_SIZE,
  });

  const locationQuery = useWarehouseLocations({
    search: tab === 'locations' ? search || undefined : undefined,
    status: tab === 'locations' ? locationStatus : 'all',
    warehouseId: tab === 'locations' ? warehouseFilter || undefined : undefined,
    storageCondition: tab === 'locations' ? storageFilter : 'all',
    page,
    pageSize: PAGE_SIZE,
  });

  const warehouseOptionsQuery = useWarehouseOptions();
  const createWarehouseMutation = useCreateWarehouse();
  const updateWarehouseMutation = useUpdateWarehouse();
  const createLocationMutation = useCreateWarehouseLocation();
  const updateLocationMutation = useUpdateWarehouseLocation();

  const total = tab === 'warehouses' ? (warehouseQuery.data?.total ?? 0) : (locationQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const showNoPermissionToast = (actionLabel: string) => {
    toast({
      title: 'Khong co quyen thuc hien',
      description: `Ban khong co quyen ${actionLabel} trong module kho.`,
      variant: 'destructive',
    });
  };

  const openWarehouse = (mode: 'create' | 'edit' | 'view', item?: WarehouseItem) => {
    if (mode === 'create' && !canCreate) {
      showNoPermissionToast('tao moi');
      return;
    }

    if (mode === 'edit' && !canEdit) {
      showNoPermissionToast('chinh sua');
      return;
    }

    setWarehouseMode(mode);
    setSelectedWarehouse(item ?? null);
    setWarehouseOpen(true);
  };

  const openLocation = (mode: 'create' | 'edit' | 'view', item?: WarehouseLocationItem) => {
    if (mode === 'create' && !canCreate) {
      showNoPermissionToast('tao moi');
      return;
    }

    if (mode === 'edit' && !canEdit) {
      showNoPermissionToast('chinh sua');
      return;
    }

    setLocationMode(mode);
    setSelectedLocation(item ?? null);
    setLocationOpen(true);
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          eyebrow="Sprint 1 · Warehouse Structure"
          title="Warehouse & Locations"
          description="Định nghĩa kho và vị trí lưu trữ theo dữ liệu nền tảng để các sprint giao dịch sau có thể gán hàng vào cấu trúc vật lý ổn định."
          actions={
            <button
              type="button"
              onClick={() => (tab === 'warehouses' ? openWarehouse('create') : openLocation('create'))}
              disabled={!(canCreate && !warehouseOptionsQuery.isLoading)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {tab === 'warehouses' ? 'New Warehouse' : 'New Location'}
            </button>
          }
        />

        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as 'warehouses' | 'locations');
            setPage(1);
            setSearch('');
            setWarehouseStatus('all');
            setLocationStatus('all');
            setWarehouseFilter('');
            setStorageFilter('all');
          }}
        >
          <TabsList variant="line" className="rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <TabsTrigger value="warehouses" className="rounded-xl px-4 py-2 data-active:bg-slate-100">Warehouses</TabsTrigger>
            <TabsTrigger value="locations" className="rounded-xl px-4 py-2 data-active:bg-slate-100">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <TextInput
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder={tab === 'warehouses' ? 'Search warehouse code or name...' : 'Search location code or full path...'}
                />
                {tab === 'warehouses' ? (
                  <SelectInput
                    value={warehouseStatus}
                    onChange={(value) => {
                      setWarehouseStatus(value as WarehouseStatus | 'all');
                      setPage(1);
                    }}
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </SelectInput>
                ) : (
                  <>
                    <SelectInput
                      value={locationStatus}
                      onChange={(value) => {
                        setLocationStatus(value as WarehouseLocationStatus | 'all');
                        setPage(1);
                      }}
                    >
                      <option value="all">All occupancy status</option>
                      <option value="available">Available</option>
                      <option value="partial">Partial</option>
                      <option value="full">Full</option>
                      <option value="maintenance">Maintenance</option>
                    </SelectInput>
                    <SelectInput
                      value={storageFilter}
                      onChange={(value) => {
                        setStorageFilter(value as StorageCondition | 'all');
                        setPage(1);
                      }}
                    >
                      <option value="all">All storage types</option>
                      <option value="ambient">Ambient</option>
                      <option value="chilled">Chilled</option>
                      <option value="frozen">Frozen</option>
                      <option value="dry">Dry</option>
                    </SelectInput>
                    <SelectInput
                      value={warehouseFilter}
                      onChange={(value) => {
                        setWarehouseFilter(value);
                        setPage(1);
                      }}
                    >
                      <option value="">All warehouses</option>
                      {warehouseOptionsQuery.data?.data.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </SelectInput>
                  </>
                )}
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                {tab === 'warehouses' ? (
                  <WarehouseRows
                    items={warehouseQuery.data?.data ?? []}
                    isLoading={warehouseQuery.isLoading}
                    isError={warehouseQuery.isError}
                    isFetching={warehouseQuery.isFetching}
                    canEdit={canEdit}
                    onView={(item) => openWarehouse('view', item)}
                    onEdit={(item) => openWarehouse('edit', item)}
                    onRetry={() => void warehouseQuery.refetch()}
                  />
                ) : (
                  <LocationRows
                    items={locationQuery.data?.data ?? []}
                    isLoading={locationQuery.isLoading}
                    isError={locationQuery.isError}
                    isFetching={locationQuery.isFetching}
                    canEdit={canEdit}
                    onView={(item) => openLocation('view', item)}
                    onEdit={(item) => openLocation('edit', item)}
                    onRetry={() => void locationQuery.refetch()}
                  />
                )}
                {total > 0 ? <Pagination page={page} totalPages={totalPages} totalItems={total} onChange={setPage} /> : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <WarehouseFormDialog
        open={warehouseOpen}
        onClose={() => setWarehouseOpen(false)}
        mode={warehouseMode}
        warehouse={selectedWarehouse}
        isPending={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
        onSubmit={async (payload) => {
          try {
            if (warehouseMode === 'edit' && selectedWarehouse) {
              await updateWarehouseMutation.mutateAsync({ id: selectedWarehouse.id, payload });
              toast({ title: 'Đã cập nhật kho', description: 'Warehouse master đã được lưu.' });
            } else {
              await createWarehouseMutation.mutateAsync(payload);
              toast({ title: 'Đã tạo kho', description: 'Kho mới đã sẵn sàng để gán location.' });
            }
            setWarehouseOpen(false);
          } catch (error) {
            toast({
              title: 'Không thể lưu kho',
              description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
              variant: 'destructive',
            });
          }
        }}
      />

      <LocationFormDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        mode={locationMode}
        location={selectedLocation}
        warehouses={warehouseOptionsQuery.data?.data ?? []}
        isPending={createLocationMutation.isPending || updateLocationMutation.isPending}
        onSubmit={async (payload) => {
          try {
            if (locationMode === 'edit' && selectedLocation) {
              await updateLocationMutation.mutateAsync({ id: selectedLocation.id, payload });
              toast({ title: 'Đã cập nhật vị trí', description: 'Warehouse location đã được lưu.' });
            } else {
              await createLocationMutation.mutateAsync(payload);
              toast({ title: 'Đã tạo vị trí', description: 'Vị trí kho mới đã sẵn sàng sử dụng.' });
            }
            setLocationOpen(false);
          } catch (error) {
            toast({
              title: 'Không thể lưu vị trí',
              description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
              variant: 'destructive',
            });
          }
        }}
      />
    </div>
  );
}

function WarehouseRows({
  items,
  isLoading,
  isError,
  isFetching,
  canEdit,
  onView,
  onEdit,
  onRetry,
}: {
  items: WarehouseItem[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  canEdit: boolean;
  onView: (item: WarehouseItem) => void;
  onEdit: (item: WarehouseItem) => void;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <div className="p-8"><StatePanel title="Đang tải dữ liệu kho" description="Hệ thống đang đồng bộ warehouse master." icon="hourglass_top" /></div>;
  }

  if (isError) {
    return <div className="p-8"><StatePanel title="Không tải được kho" description="Vui lòng thử lại để tiếp tục quản trị warehouse master." icon="error" tone="error" action={<RetryButton onClick={onRetry} />} /></div>;
  }

  if (items.length === 0) {
    return <div className="p-8"><StatePanel title="Chưa có kho phù hợp" description="Tạo warehouse master đầu tiên để định nghĩa cấu trúc lưu trữ." icon="warehouse" /></div>;
  }

  return (
    <div className={isFetching ? 'opacity-70 transition' : 'transition'}>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <th className="px-4 py-3">Warehouse</th>
            <th className="px-4 py-3">Locations</th>
            <th className="px-4 py-3">Timeline</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-4 py-4">
                <div className="font-semibold text-slate-900">{item.name}</div>
                <div className="mt-1 text-sm text-slate-500">{item.code}</div>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600">{item.locationCount} locations</td>
              <td className="px-4 py-4 text-sm text-slate-600">
                <div>Created {formatDate(item.createdAt)}</div>
                <div className="mt-1 text-xs text-slate-400">Updated {formatDate(item.updatedAt)}</div>
              </td>
              <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <ActionButton icon="visibility" label="View" onClick={() => onView(item)} />
                  {canEdit ? <ActionButton icon="edit" label="Edit" onClick={() => onEdit(item)} /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LocationRows({
  items,
  isLoading,
  isError,
  isFetching,
  canEdit,
  onView,
  onEdit,
  onRetry,
}: {
  items: WarehouseLocationItem[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  canEdit: boolean;
  onView: (item: WarehouseLocationItem) => void;
  onEdit: (item: WarehouseLocationItem) => void;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <div className="p-8"><StatePanel title="Đang tải vị trí kho" description="Hệ thống đang đồng bộ warehouse locations." icon="hourglass_top" /></div>;
  }

  if (isError) {
    return <div className="p-8"><StatePanel title="Không tải được vị trí" description="Vui lòng thử lại để tiếp tục quản trị warehouse locations." icon="error" tone="error" action={<RetryButton onClick={onRetry} />} /></div>;
  }

  if (items.length === 0) {
    return <div className="p-8"><StatePanel title="Chưa có vị trí phù hợp" description="Tạo vị trí lưu trữ đầu tiên để gán hàng hóa trong kho." icon="grid_view" /></div>;
  }

  return (
    <div className={isFetching ? 'opacity-70 transition' : 'transition'}>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Warehouse</th>
            <th className="px-4 py-3">Structure</th>
            <th className="px-4 py-3">Capacity</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-4 py-4">
                <div className="font-semibold text-slate-900">{item.code}</div>
                <div className="mt-1 text-xs text-slate-400">{item.fullPath}</div>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600">
                <div>{item.warehouseName}</div>
                <div className="mt-1 text-xs text-slate-400">{item.warehouseCode}</div>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600">
                Zone {item.zoneCode || '-'} · Aisle {item.aisleCode || '-'} · Rack {item.rackCode || '-'}
                <div className="mt-1 text-xs text-slate-400">Level {item.levelCode || '-'} · Bin {item.binCode || '-'} · {item.storageCondition}</div>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600">
                <div>{item.currentWeight ?? 0} / {item.maxWeight ?? 0} kg</div>
                <div className="mt-1 text-xs text-slate-400">{item.currentVolume ?? 0} / {item.maxVolume ?? 0} m3 · {item.occupancyPercent}%</div>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col items-start gap-2">
                  <StatusBadge status={item.status} />
                  <StatusBadge status={item.isActive ? 'active' : 'inactive'} />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <ActionButton icon="visibility" label="View" onClick={() => onView(item)} />
                  {canEdit ? <ActionButton icon="edit" label="Edit" onClick={() => onEdit(item)} /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative min-w-[240px]"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15" /></div>;
}

function SelectInput({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15">{children}</select>;
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Thử lại</button>;
}

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" title={label}><span className="material-symbols-outlined text-[18px]">{icon}</span></button>;
}

function Pagination({ page, totalPages, totalItems, onChange }: { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }) {
  return <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Total {totalItems} items</p><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">Prev</button><span className="text-sm font-medium text-slate-700">{page} / {totalPages}</span><button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">Next</button></div></div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
}
