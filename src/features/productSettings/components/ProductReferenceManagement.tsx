import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import {
  useCreateProductReference,
  useDeleteProductReference,
  useProductReferences,
  useUpdateProductReference,
} from '../hooks/useProductReferences';
import { productReferenceFormSchema, type ProductReferenceFormData } from '../schemas/referenceSchemas';
import type { ProductReferenceItem, ProductReferenceType } from '../types/referenceType';

const PAGE_SIZE = 8;

export function ProductReferenceManagement() {
  const { toast } = useToast();
  const canManage = usePermission('master_data.references.manage');

  const [tab, setTab] = useState<ProductReferenceType>('unit');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<ProductReferenceItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductReferenceItem | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useProductReferences({
    type: tab,
    search: search || undefined,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const createMutation = useCreateProductReference();
  const updateMutation = useUpdateProductReference();
  const deleteMutation = useDeleteProductReference();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const title = tab === 'unit'
    ? 'Units of Measure'
    : tab === 'brand'
      ? 'Brands'
      : 'Manufacturers';
  const description =
    tab === 'unit'
      ? 'Chuẩn hóa đơn vị tính để product master và giao dịch kho dùng lại xuyên suốt các sprint.'
      : tab === 'brand'
        ? 'Quản lý thương hiệu để đồng bộ dữ liệu nguồn cho danh mục sản phẩm.'
        : 'Quản lý nhà sản xuất làm dữ liệu gốc cho nguồn gốc sản phẩm.';

  const openCreate = () => {
    setDialogMode('create');
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const openEdit = (item: ProductReferenceItem) => {
    setDialogMode('edit');
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const openView = (item: ProductReferenceItem) => {
    setDialogMode('view');
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Thành công', description: 'Đã xóa dữ liệu tham chiếu.' });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Không thể xóa',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          eyebrow="Sprint 1 · Product Foundation"
          title="Product Supporting Masters"
          description="Thiết lập đơn vị tính và thương hiệu để product master ở Sprint 1–2 có thể tái sử dụng ổn định."
          actions={
            canManage ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                New {tab === 'unit' ? 'Unit' : tab === 'brand' ? 'Brand' : 'Manufacturer'}
              </button>
            ) : null
          }
        />

        <Tabs value={tab} onValueChange={(value) => { setTab(value as ProductReferenceType); setPage(1); }}>
          <TabsList variant="line" className="rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <TabsTrigger value="unit" className="rounded-xl px-4 py-2 data-active:bg-slate-100">
              Units of Measure
            </TabsTrigger>
            <TabsTrigger value="brand" className="rounded-xl px-4 py-2 data-active:bg-slate-100">
              Brands
            </TabsTrigger>
            <TabsTrigger value="manufacturer" className="rounded-xl px-4 py-2 data-active:bg-slate-100">
              Manufacturers
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-60">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                      search
                    </span>
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder={`Search ${tab === 'unit' ? 'unit' : tab === 'brand' ? 'brand' : 'manufacturer'}...`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    />
                  </div>

                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value as 'all' | 'active' | 'inactive');
                      setPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                {isLoading ? (
                  <div className="p-8">
                    <StatePanel title="Đang tải dữ liệu" description="Hệ thống đang lấy danh sách master data." icon="hourglass_top" />
                  </div>
                ) : isError ? (
                  <div className="p-8">
                    <StatePanel
                      title="Không tải được dữ liệu"
                      description="Vui lòng thử lại để tiếp tục cấu hình dữ liệu gốc."
                      icon="error"
                      tone="error"
                      action={
                        <button
                          onClick={() => void refetch()}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                          Thử lại
                        </button>
                      }
                    />
                  </div>
                ) : (data?.data.length ?? 0) === 0 ? (
                  <div className="p-8">
                    <StatePanel
                      title="Chưa có dữ liệu phù hợp"
                      description="Tạo master data đầu tiên để product form và transaction modules có thể dùng lại."
                      icon={tab === 'unit' ? 'straighten' : tab === 'brand' ? 'branding_watermark' : 'factory'}
                      action={
                        canManage ? (
                          <button
                            onClick={openCreate}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container"
                          >
                            Tạo mới
                          </button>
                        ) : null
                      }
                    />
                  </div>
                ) : (
                  <div className={isFetching ? 'opacity-70 transition' : 'transition'}>
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Usage</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {data?.data.map((item) => (
                          <tr key={item.id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-900">{item.code}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                Updated {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-4 text-sm text-slate-500">{item.description || 'Khong co mo ta'}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{item.usageCount} products</td>
                            <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <ActionButton icon="visibility" label="View" onClick={() => openView(item)} />
                                {canManage ? <ActionButton icon="edit" label="Edit" onClick={() => openEdit(item)} /> : null}
                                {canManage ? (
                                  <ActionButton
                                    icon="delete"
                                    label="Delete"
                                    danger
                                    onClick={() => setDeleteTarget(item)}
                                  />
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      totalItems={data?.total ?? 0}
                      onChange={setPage}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ReferenceFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        mode={dialogMode}
        type={tab}
        item={selectedItem}
        onSubmit={async (payload) => {
          try {
            if (dialogMode === 'edit' && selectedItem) {
              await updateMutation.mutateAsync({ id: selectedItem.id, type: tab, payload });
              toast({ title: 'Đã cập nhật', description: 'Thông tin tham chiếu đã được lưu.' });
            } else {
              await createMutation.mutateAsync({ type: tab, payload });
              toast({ title: 'Đã tạo mới', description: 'Dữ liệu tham chiếu đã sẵn sàng để dùng.' });
            }
            setIsFormOpen(false);
          } catch (error) {
            toast({
              title: 'Không thể lưu',
              description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
              variant: 'destructive',
            });
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Xóa ${tab === 'unit' ? 'unit' : tab === 'brand' ? 'brand' : 'manufacturer'}`}
        description={`Bạn có chắc chắn muốn xóa "${deleteTarget?.name ?? ''}" không?`}
        onConfirm={() => void handleDelete()}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

interface ReferenceFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  type: ProductReferenceType;
  item: ProductReferenceItem | null;
  onSubmit: (payload: ProductReferenceFormData) => Promise<void>;
  isPending: boolean;
}

function ReferenceFormDialog({
  open,
  onClose,
  mode,
  type,
  item,
  onSubmit,
  isPending,
}: ReferenceFormDialogProps) {
  const isView = mode === 'view';
  const form = useForm<ProductReferenceFormData>({
    resolver: zodResolver(productReferenceFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      status: 'active',
    },
  });

  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;

    reset({
      code: item?.code ?? '',
      name: item?.name ?? '',
      description: item?.description ?? '',
      status: item?.status ?? 'active',
    });
  }, [item, open, reset]);

  const typeLabel = type === 'unit' ? 'unit' : type === 'brand' ? 'brand' : 'manufacturer';
  const typeLabelTitle = type === 'unit' ? 'Unit' : type === 'brand' ? 'Brand' : 'Manufacturer';

  const heading = {
    create: `Create ${typeLabel}`,
    edit: `Update ${typeLabel}`,
    view: `${typeLabelTitle} detail`,
  }[mode];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <form onSubmit={handleSubmit(async (payload) => { if (!isView) await onSubmit(payload); })}>
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>
              {isView
                ? 'Xem chi tiết dữ liệu gốc đang được liên kết với product master.'
                : 'Giữ mã và tên chuẩn hóa để các module khác có thể tái sử dụng ổn định.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <Field label="Code" error={errors.code?.message}>
              <input {...register('code')} disabled={isView || isPending} className={inputClass(!!errors.code)} />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Name" error={errors.name?.message}>
              <input {...register('name')} disabled={isView || isPending} className={inputClass(!!errors.name)} />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <textarea
                {...register('description')}
                disabled={isView || isPending}
                className={`${inputClass(!!errors.description)} min-h-28 resize-none`}
              />
            </Field>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isView ? 'Đóng' : 'Hủy'}
            </button>
            {!isView ? (
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending: boolean;
}

function DeleteDialog({ open, onClose, title, description, onConfirm, isPending }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent p-0 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {isPending ? 'Đang xóa...' : 'Xóa'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </label>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
      title={label}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">Total {totalItems} items</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-sm font-medium text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'}`;
}
