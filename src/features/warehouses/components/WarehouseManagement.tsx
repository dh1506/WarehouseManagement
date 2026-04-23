import { useDeferredValue, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateWarehouse,
  useCreateWarehouseLocation,
  useDeleteWarehouse,
  useDeleteWarehouseLocation,
  useWarehouseLocations,
  useWarehouseOptions,
  useWarehouses,
  useUpdateWarehouse,
  useUpdateWarehouseLocation,
} from '../hooks/useWarehouses';
import type { WarehouseItem, WarehouseLocationItem } from '../types/warehouseType';
import { LocationFormDialog, WarehouseFormDialog } from './WarehouseSheets';

const PAGE_SIZE = 8;

export function WarehouseManagement() {
  const { toast } = useToast();
  const canManage = usePermission('master_data.warehouses.manage');
  const [tab, setTab] = useState<'warehouses' | 'locations'>('warehouses');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouseMode, setWarehouseMode] = useState<'create' | 'edit' | 'view'>('create');
  const [locationMode, setLocationMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocationItem | null>(null);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'warehouse' | 'location'; id: string; name: string } | null>(null);
  const deferredSearch = useDeferredValue(search);
  const deferredStatus = useDeferredValue(status);
  const deferredWarehouseFilter = useDeferredValue(warehouseFilter);

  const warehouseQuery = useWarehouses({
    search: tab === 'warehouses' ? deferredSearch || undefined : undefined,
    status: tab === 'warehouses' ? (deferredStatus as 'all' | 'operational' | 'maintenance' | 'inactive') : 'all',
    page,
    pageSize: PAGE_SIZE,
  });
  const locationQuery = useWarehouseLocations({
    search: tab === 'locations' ? deferredSearch || undefined : undefined,
    status: tab === 'locations' ? (deferredStatus as 'all' | 'active' | 'blocked' | 'inactive') : 'all',
    warehouseId: tab === 'locations' ? deferredWarehouseFilter || undefined : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const warehouseOptionsQuery = useWarehouseOptions();

  const createWarehouseMutation = useCreateWarehouse();
  const updateWarehouseMutation = useUpdateWarehouse();
  const deleteWarehouseMutation = useDeleteWarehouse();
  const createLocationMutation = useCreateWarehouseLocation();
  const updateLocationMutation = useUpdateWarehouseLocation();
  const deleteLocationMutation = useDeleteWarehouseLocation();

  const total = tab === 'warehouses' ? (warehouseQuery.data?.total ?? 0) : (locationQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'warehouse') {
        await deleteWarehouseMutation.mutateAsync(deleteTarget.id);
      } else {
        await deleteLocationMutation.mutateAsync(deleteTarget.id);
      }
      toast({ title: 'Đã xóa dữ liệu', description: 'Cấu trúc kho đã được cập nhật.' });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Không thể xóa',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  const openWarehouse = (mode: 'create' | 'edit' | 'view', item?: WarehouseItem) => {
    setWarehouseMode(mode);
    setSelectedWarehouse(item ?? null);
    setWarehouseOpen(true);
  };

  const openLocation = (mode: 'create' | 'edit' | 'view', item?: WarehouseLocationItem) => {
    setLocationMode(mode);
    setSelectedLocation(item ?? null);
    setLocationOpen(true);
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#fbfbfe] px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex w-full flex-1 flex-col gap-3">
        <PageHeader
          eyebrow="Sprint 1 · Warehouse Structure"
          title="Warehouse & Locations"
          description="Định nghĩa kho và vị trí lưu trữ để những sprint giao dịch sau có thể gán hàng vào cấu trúc vật lý ổn định."
          actions={
            canManage ? (
              <button
                onClick={() => tab === 'warehouses' ? openWarehouse('create') : openLocation('create')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                New {tab === 'warehouses' ? 'Warehouse' : 'Location'}
              </button>
            ) : null
          }
        />

        <Tabs value={tab} onValueChange={(value) => { setTab(value as 'warehouses' | 'locations'); setPage(1); setSearch(''); setStatus('all'); }}>
          <TabsList variant="line" className="rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <TabsTrigger value="warehouses" className="rounded-xl px-4 py-2 data-active:bg-slate-100">Warehouses</TabsTrigger>
            <TabsTrigger value="locations" className="rounded-xl px-4 py-2 data-active:bg-slate-100">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <TextInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={tab === 'warehouses' ? 'Search code, warehouse, manager...' : 'Search code, warehouse, zone...'} />
                <SelectInput value={status} onChange={(value) => { setStatus(value); setPage(1); }}>
                  <option value="all">All status</option>
                  {tab === 'warehouses' ? (
                    <>
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                      <option value="inactive">Inactive</option>
                    </>
                  )}
                </SelectInput>
                {tab === 'locations' ? (
                  <SelectInput value={warehouseFilter} onChange={(value) => { setWarehouseFilter(value); setPage(1); }}>
                    <option value="">All warehouses</option>
                    {warehouseOptionsQuery.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </SelectInput>
                ) : null}
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className={`transition-all duration-300 ease-out ${((tab === 'warehouses' ? warehouseQuery.isFetching : locationQuery.isFetching) ? 'opacity-70 saturate-75' : 'opacity-100 saturate-100')}`}>
                  {tab === 'warehouses' ? (
                    <WarehouseRows
                      items={warehouseQuery.data?.data ?? []}
                      isLoading={warehouseQuery.isLoading}
                      isError={warehouseQuery.isError}
                      canManage={canManage}
                      onView={(item) => openWarehouse('view', item)}
                      onEdit={(item) => openWarehouse('edit', item)}
                      onDelete={(item) => setDeleteTarget({ kind: 'warehouse', id: item.id, name: item.name })}
                    />
                  ) : (
                    <LocationRows
                      items={locationQuery.data?.data ?? []}
                      isLoading={locationQuery.isLoading}
                      isError={locationQuery.isError}
                      canManage={canManage}
                      onView={(item) => openLocation('view', item)}
                      onEdit={(item) => openLocation('edit', item)}
                      onDelete={(item) => setDeleteTarget({ kind: 'location', id: item.id, name: item.code })}
                    />
                  )}
                </div>
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
          if (warehouseMode === 'edit' && selectedWarehouse) {
            await updateWarehouseMutation.mutateAsync({ id: selectedWarehouse.id, payload });
          } else {
            await createWarehouseMutation.mutateAsync(payload);
          }
          toast({ title: 'Đã lưu kho', description: 'Warehouse master đã được cập nhật.' });
          setWarehouseOpen(false);
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
          if (locationMode === 'edit' && selectedLocation) {
            await updateLocationMutation.mutateAsync({ id: selectedLocation.id, payload });
          } else {
            await createLocationMutation.mutateAsync(payload);
          }
          toast({ title: 'Đã lưu vị trí', description: 'Warehouse location đã được cập nhật.' });
          setLocationOpen(false);
        }}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Xóa ${deleteTarget?.kind === 'warehouse' ? 'kho' : 'vị trí kho'}`}
        description={`Bạn có chắc chắn muốn xóa "${deleteTarget?.name ?? ''}" không?`}
        onConfirm={() => void confirmDelete()}
        isPending={deleteWarehouseMutation.isPending || deleteLocationMutation.isPending}
      />
    </div>
  );
}

function WarehouseRows({
  items, isLoading, isError, canManage, onView, onEdit, onDelete,
}: {
  items: WarehouseItem[]; isLoading: boolean; isError: boolean; canManage: boolean;
  onView: (item: WarehouseItem) => void; onEdit: (item: WarehouseItem) => void; onDelete: (item: WarehouseItem) => void;
}) {
  if (isLoading) return <div className="p-8"><StatePanel title="Đang tải dữ liệu kho" description="Hệ thống đang đồng bộ warehouse master." icon="hourglass_top" /></div>;
  if (isError) return <div className="p-8"><StatePanel title="Không tải được kho" description="Vui lòng thử lại sau." icon="error" tone="error" /></div>;
  if (items.length === 0) return <div className="p-8"><StatePanel title="Chưa có kho phù hợp" description="Tạo warehouse master đầu tiên để định nghĩa cấu trúc lưu trữ." icon="warehouse" /></div>;
  return <table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Manager</th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{items.map((item) => <tr key={item.id} className="align-top"><td className="px-4 py-4"><div className="font-semibold text-slate-900">{item.name}</div><div className="mt-1 text-sm text-slate-500">{item.code}</div><div className="mt-2 text-xs text-slate-400">{item.locationCount} locations</div></td><td className="px-4 py-4 text-sm text-slate-600">{item.manager}</td><td className="px-4 py-4 text-sm text-slate-600">{item.address}</td><td className="px-4 py-4 text-sm text-slate-600">{item.capacityUsage}% utilized</td><td className="px-4 py-4"><StatusBadge status={item.status} /></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><ActionButton icon="visibility" label="View" onClick={() => onView(item)} />{canManage ? <ActionButton icon="edit" label="Edit" onClick={() => onEdit(item)} /> : null}{canManage ? <ActionButton icon="delete" label="Delete" danger onClick={() => onDelete(item)} /> : null}</div></td></tr>)}</tbody></table>;
}

function LocationRows({
  items, isLoading, isError, canManage, onView, onEdit, onDelete,
}: {
  items: WarehouseLocationItem[]; isLoading: boolean; isError: boolean; canManage: boolean;
  onView: (item: WarehouseLocationItem) => void; onEdit: (item: WarehouseLocationItem) => void; onDelete: (item: WarehouseLocationItem) => void;
}) {
  if (isLoading) return <div className="p-8"><StatePanel title="Đang tải vị trí kho" description="Hệ thống đang đồng bộ warehouse locations." icon="hourglass_top" /></div>;
  if (isError) return <div className="p-8"><StatePanel title="Không tải được vị trí" description="Vui lòng thử lại sau." icon="error" tone="error" /></div>;
  if (items.length === 0) return <div className="p-8"><StatePanel title="Chưa có vị trí phù hợp" description="Tạo vị trí lưu trữ đầu tiên để gán hàng hóa trong kho." icon="grid_view" /></div>;
  return <table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"><th className="px-4 py-3">Location</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Coordinates</th><th className="px-4 py-3">Load</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{items.map((item) => <tr key={item.id} className="align-top"><td className="px-4 py-4"><div className="font-semibold text-slate-900">{item.code}</div><div className="mt-1 text-xs text-slate-400">{item.productCount} products</div></td><td className="px-4 py-4 text-sm text-slate-600">{item.warehouseName}</td><td className="px-4 py-4 text-sm text-slate-600">Zone {item.zone} · Rack {item.rack} · Level {item.level} · Bin {item.bin}</td><td className="px-4 py-4 text-sm text-slate-600">{item.currentLoad} / {item.capacity}</td><td className="px-4 py-4"><StatusBadge status={item.status} /></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><ActionButton icon="visibility" label="View" onClick={() => onView(item)} />{canManage ? <ActionButton icon="edit" label="Edit" onClick={() => onEdit(item)} /> : null}{canManage ? <ActionButton icon="delete" label="Delete" danger onClick={() => onDelete(item)} /> : null}</div></td></tr>)}</tbody></table>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative min-w-60"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15" /></div>;
}

function SelectInput({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15">{children}</select>;
}

function DeleteDialog({ open, onClose, title, description, onConfirm, isPending }: { open: boolean; onClose: () => void; title: string; description: string; onConfirm: () => void; isPending: boolean }) {
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter className="bg-transparent p-0 pt-4"><button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button><button type="button" onClick={onConfirm} disabled={isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">{isPending ? 'Đang xóa...' : 'Xóa'}</button></DialogFooter></DialogContent></Dialog>;
}

function ActionButton({ icon, label, onClick, danger = false }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-lg p-2 transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} title={label}><span className="material-symbols-outlined text-[18px]">{icon}</span></button>;
}

function Pagination({ page, totalPages, totalItems, onChange }: { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }) {
  return <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Total {totalItems} items</p><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">Prev</button><span className="text-sm font-medium text-slate-700">{page} / {totalPages}</span><button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">Next</button></div></div>;
}
