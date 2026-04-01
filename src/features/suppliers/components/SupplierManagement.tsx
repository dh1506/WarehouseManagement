import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import { usePermission } from '@/hooks/usePermission';
import {
  useCreateSupplier,
  useSupplierDetail,
  useSuppliers,
  useUpdateSupplier,
} from '../hooks/useSuppliers';
import { supplierFilterSchema, type SupplierFormData } from '../schemas/supplierSchemas';
import { SupplierFormSheet } from './SupplierFormSheet';
import type { SupplierItem } from '../types/supplierType';

type SupplierSheetMode = 'create' | 'edit' | 'view';

export function SupplierManagement() {
  const { toast } = useToast();
  const canCreate = usePermission('suppliers:create');
  const canEdit = usePermission('suppliers:update');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sheetMode, setSheetMode] = useState<SupplierSheetMode>('create');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const filters = useMemo(
    () =>
      supplierFilterSchema.parse({
        search,
        status,
        page,
        pageSize: 10,
      }),
    [page, search, status],
  );

  const suppliersQuery = useSuppliers(filters);
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const supplierDetailQuery = useSupplierDetail(
    selectedSupplier?.id ?? null,
    isSheetOpen && sheetMode === 'view' && !!selectedSupplier,
  );

  const items = suppliersQuery.data?.data ?? [];
  const total = suppliersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const isPending = createSupplierMutation.isPending || updateSupplierMutation.isPending;

  const openCreateSheet = () => {
    setSheetMode('create');
    setSelectedSupplier(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (supplier: SupplierItem) => {
    setSheetMode('edit');
    setSelectedSupplier(supplier);
    setIsSheetOpen(true);
  };

  const openViewSheet = (supplier: SupplierItem) => {
    setSheetMode('view');
    setSelectedSupplier(supplier);
    setIsSheetOpen(true);
  };

  const handleSubmit = async (payload: SupplierFormData) => {
    try {
      if (sheetMode === 'edit' && selectedSupplier) {
        await updateSupplierMutation.mutateAsync({
          id: selectedSupplier.id,
          payload,
        });
        toast({
          title: 'Cập nhật thành công',
          description: `Nhà cung cấp ${payload.name.trim()} đã được cập nhật.`,
        });
      } else {
        await createSupplierMutation.mutateAsync(payload);
        toast({
          title: 'Tạo thành công',
          description: `Nhà cung cấp ${payload.name.trim()} đã được thêm vào hệ thống.`,
        });
      }

      setIsSheetOpen(false);
      setSelectedSupplier(null);
    } catch (error) {
      const description =
        typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Không thể lưu nhà cung cấp. Vui lòng thử lại.';

      toast({
        title: 'Không thể lưu nhà cung cấp',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-slate-50/40">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <PageHeader
            eyebrow="Master Data"
            title="Supplier Management"
            description="Quản lý hồ sơ nhà cung cấp, đầu mối liên hệ và phạm vi sản phẩm đang liên kết."
            actions={
              <>
                <div className="relative min-w-[260px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                    search
                  </span>
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm mã, tên hoặc người liên hệ..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <select
                  value={status}
                  onChange={(event) => {
                    const nextStatus = event.target.value as 'all' | 'active' | 'inactive';
                    setStatus(nextStatus);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={openCreateSheet}
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container"
                  >
                    <span className="material-symbols-outlined mr-2 text-[18px]">add</span>
                    Thêm nhà cung cấp
                  </button>
                ) : null}
              </>
            }
          />

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            {suppliersQuery.isLoading ? (
              <div className="p-8">
                <StatePanel
                  title="Đang tải danh sách nhà cung cấp"
                  description="Hệ thống đang đồng bộ supplier master từ backend."
                  icon="hourglass_top"
                />
              </div>
            ) : suppliersQuery.isError ? (
              <div className="p-8">
                <StatePanel
                  title="Không tải được nhà cung cấp"
                  description="Vui lòng thử lại sau hoặc kiểm tra quyền truy cập của bạn."
                  icon="error"
                  tone="error"
                />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8">
                <StatePanel
                  title="Chưa có nhà cung cấp phù hợp"
                  description="Điều chỉnh bộ lọc hoặc tạo hồ sơ nhà cung cấp đầu tiên cho hệ thống."
                  icon="local_shipping"
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4">Liên hệ</th>
                        <th className="px-6 py-4">Trạng thái</th>
                        <th className="px-6 py-4">Sản phẩm</th>
                        <th className="px-6 py-4">Cập nhật</th>
                        <th className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((supplier) => (
                        <tr key={supplier.id} className="align-top">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{supplier.code}</p>
                              <p className="mt-1 text-sm text-slate-700">{supplier.name}</p>
                              <p className="mt-1 line-clamp-2 max-w-md text-xs text-slate-500">
                                {supplier.address || 'Chưa có địa chỉ'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-sm text-slate-600">
                              <p>{supplier.contactPerson || 'Chưa có người liên hệ'}</p>
                              <p>{supplier.phone || 'Chưa có số điện thoại'}</p>
                              <p>{supplier.email || 'Chưa có email'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={supplier.status} />
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                            {supplier.productCount}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {formatDateTime(supplier.updatedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton
                                label="Xem"
                                icon="visibility"
                                onClick={() => openViewSheet(supplier)}
                              />
                              <ActionButton
                                label="Sửa"
                                icon="edit"
                                onClick={() => openEditSheet(supplier)}
                                disabled={!canEdit}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Hiển thị {(filters.page - 1) * filters.pageSize + 1}-
                    {Math.min(filters.page * filters.pageSize, total)} trên {total} nhà cung cấp
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={filters.page === 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                      {filters.page}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={filters.page >= totalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SupplierFormSheet
        open={isSheetOpen}
        mode={sheetMode}
        supplier={selectedSupplier}
        supplierDetail={supplierDetailQuery.data ?? null}
        isDetailLoading={supplierDetailQuery.isLoading}
        isDetailError={supplierDetailQuery.isError}
        isPending={isPending}
        onClose={() => {
          if (isPending) {
            return;
          }

          setIsSheetOpen(false);
          setSelectedSupplier(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="material-symbols-outlined mr-1 text-[18px]">{icon}</span>
      {label}
    </button>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
