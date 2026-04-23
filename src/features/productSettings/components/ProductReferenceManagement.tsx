import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
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
  useProductReferences,
  useUpdateProductReference,
} from '../hooks/useProductReferences';
import { productReferenceFormSchema, type ProductReferenceFormData } from '../schemas/referenceSchemas';
import type { ProductReferenceItem, ProductReferenceType } from '../types/referenceType';

const PAGE_SIZE = 8;

interface FilterSelectOption {
  value: string;
  label: string;
}

interface TabUiState {
  page: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
}

const DEFAULT_TAB_STATE: TabUiState = {
  page: 1,
  search: '',
  status: 'all',
};

const TAB_LABEL: Record<ProductReferenceType, string> = {
  unit: 'Units of Measure',
  brand: 'Brands',
  supplier: 'Suppliers',
};

export function ProductReferenceManagement() {
  const { toast } = useToast();
  const canReadUnit = usePermission('uoms:read');
  const canCreateUnit = usePermission('uoms:create');
  const canUpdateUnit = usePermission('uoms:update');

  const canReadBrand = usePermission('brands:read');
  const canCreateBrand = usePermission('brands:create');
  const canUpdateBrand = usePermission('brands:update');

  const canReadSupplier = usePermission('suppliers:read');
  const canCreateSupplier = usePermission('suppliers:create');
  const canUpdateSupplier = usePermission('suppliers:update');

  const [tab, setTab] = useState<ProductReferenceType>('unit');
  const [tabState, setTabState] = useState<Record<ProductReferenceType, TabUiState>>({
    unit: { ...DEFAULT_TAB_STATE },
    brand: { ...DEFAULT_TAB_STATE },
    supplier: { ...DEFAULT_TAB_STATE },
  });
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<ProductReferenceItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ProductReferenceItem | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const tabPermissions: Record<ProductReferenceType, { canRead: boolean; canCreate: boolean; canUpdate: boolean }> = {
    unit: {
      canRead: canReadUnit,
      canCreate: canCreateUnit,
      canUpdate: canUpdateUnit,
    },
    brand: {
      canRead: canReadBrand,
      canCreate: canCreateBrand,
      canUpdate: canUpdateBrand,
    },
    supplier: {
      canRead: canReadSupplier,
      canCreate: canCreateSupplier,
      canUpdate: canUpdateSupplier,
    },
  };

  const visibleTabs = (['unit', 'brand', 'supplier'] as ProductReferenceType[]).filter(
    (item) => tabPermissions[item].canRead,
  );

  const hasAnyReadableTab = visibleTabs.length > 0;
  const activeTab = hasAnyReadableTab && !visibleTabs.includes(tab) ? visibleTabs[0] : tab;
  const currentState = tabState[activeTab];
  const canCreateCurrentTab = tabPermissions[activeTab].canCreate;
  const canUpdateCurrentTab = tabPermissions[activeTab].canUpdate;
  const isSupplierTab = activeTab === 'supplier';
  const deferredSearch = useDeferredValue(currentState.search);
  const deferredStatus = useDeferredValue(currentState.status);
  const statusOptions = useMemo<FilterSelectOption[]>(
    () => [
      { value: 'all', label: 'All status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    [],
  );

  const setCurrentTabState = (next: Partial<TabUiState>) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        ...next,
      },
    }));
  };

  const { data, isLoading, isError, refetch, isFetching } = useProductReferences({
    type: activeTab,
    search: deferredSearch || undefined,
    status: deferredStatus,
    page: currentState.page,
    pageSize: PAGE_SIZE,
  });

  const createMutation = useCreateProductReference();
  const updateMutation = useUpdateProductReference();

  const updateTableScrollFade = useCallback(() => {
    const element = tableScrollRef.current;
    if (!element) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowTopFade(scrollTop > 2);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    updateTableScrollFade();
  }, [activeTab, data?.data, isFetching, isLoading, updateTableScrollFade]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const title = TAB_LABEL[activeTab];
  const description =
    activeTab === 'unit'
      ? 'Chuẩn hóa đơn vị tính để product master và giao dịch kho dùng lại xuyên suốt các sprint.'
      : activeTab === 'brand'
        ? 'Quản lý thương hiệu để đồng bộ dữ liệu nguồn cho danh mục sản phẩm.'
        : 'Quản lý nhà cung cấp để các nghiệp vụ import/export và product sourcing tái sử dụng nhất quán.';

  const getReferenceSummary = (item: ProductReferenceItem) => {
    if (item.type !== 'supplier') {
      return item.description || 'Khong co mo ta';
    }

    const contactLine = [item.contactPerson, item.phone].filter(Boolean).join(' / ');
    const infoLine = [item.email, item.address].filter(Boolean).join(' / ');

    return (
      <>
        <div>{contactLine || 'Chua co thong tin lien he'}</div>
        {infoLine ? <div className="mt-1 text-xs text-slate-400">{infoLine}</div> : null}
      </>
    );
  };

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

  const handleChangeStatus = async () => {
    if (!statusTarget) return;

    const nextStatus = statusTarget.status === 'active' ? 'inactive' : 'active';

    try {
      await updateMutation.mutateAsync({
        id: statusTarget.id,
        type: activeTab,
        payload: {
          code: statusTarget.code,
          name: statusTarget.name,
          description: statusTarget.description,
          status: nextStatus,
        },
      });

      toast({
        title: 'Cập nhật trạng thái thành công',
        description: `Đã chuyển ${statusTarget.name} sang ${nextStatus === 'active' ? 'Active' : 'Inactive'}.`,
      });
      setStatusTarget(null);
    } catch (error) {
      toast({
        title: 'Không thể cập nhật trạng thái',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3">
        <PageHeader
          // eyebrow="Sprint 1 · Product Foundation"
          title="Product Supporting Masters"
          description="Thiết lập đơn vị tính, thương hiệu, và nhà cung cấp để product master cùng luồng vận hành có thể tái sử dụng ổn định."
          actions={canCreateCurrentTab ? (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New {activeTab === 'unit' ? 'Unit' : activeTab === 'brand' ? 'Brand' : 'Supplier'}
            </button>
          ) : undefined}
        />

        {!hasAnyReadableTab ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <StatePanel
              title="Không có quyền truy cập"
              description="Bạn không có quyền xem Units of Measure, Brands, hoặc Suppliers."
              icon="lock"
              tone="error"
            />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setTab(value as ProductReferenceType)} className="flex min-h-0 flex-1 flex-col">
            <TabsList variant="line" className="shrink-0 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
              {tabPermissions.unit.canRead ? (
                <TabsTrigger value="unit" className="rounded-xl px-4 py-2 data-active:bg-slate-100">
                  Units of Measure
                </TabsTrigger>
              ) : null}
              {tabPermissions.brand.canRead ? (
                <TabsTrigger value="brand" className="rounded-xl px-4 py-2 data-active:bg-slate-100">
                  Brands
                </TabsTrigger>
              ) : null}
              {tabPermissions.supplier.canRead ? (
                <TabsTrigger value="supplier" className="rounded-xl px-4 py-2 data-active:bg-slate-100">
                  Suppliers
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-60">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                        search
                      </span>
                      <input
                        value={currentState.search}
                        onChange={(event) => {
                          setCurrentTabState({ search: event.target.value, page: 1 });
                        }}
                        placeholder={`Search ${activeTab === 'unit' ? 'unit' : activeTab === 'brand' ? 'brand' : 'supplier'}...`}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                      />
                    </div>

                    <FilterSelect
                      value={currentState.status}
                      onChange={(value) => {
                        setCurrentTabState({
                          status: value as 'all' | 'active' | 'inactive',
                          page: 1,
                        });
                      }}
                      placeholder="All status"
                      options={statusOptions}
                    />
                  </div>
                </div>

                <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200">
                  {isLoading ? (
                    <div className="flex min-h-80 flex-1 items-center justify-center p-8">
                      <StatePanel title="Đang tải dữ liệu" description="Hệ thống đang lấy danh sách master data." icon="hourglass_top" />
                    </div>
                  ) : isError ? (
                    <div className="flex min-h-80 flex-1 items-center justify-center p-8">
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
                    <div className="flex min-h-80 flex-1 items-center justify-center p-8">
                      <StatePanel
                        title="Chưa có dữ liệu phù hợp"
                        description="Tạo master data đầu tiên để product form và transaction modules có thể dùng lại."
                        icon={activeTab === 'unit' ? 'straighten' : activeTab === 'brand' ? 'branding_watermark' : 'local_shipping'}
                        action={canCreateCurrentTab ? (
                          <button
                            onClick={openCreate}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container"
                          >
                            Tạo mới
                          </button>
                        ) : undefined}
                      />
                    </div>
                  ) : (
                    <>
                      <div
                        ref={tableScrollRef}
                        onScroll={updateTableScrollFade}
                        className={`relative min-h-0 flex-1 overflow-auto transition-all duration-300 ease-out ${isFetching ? 'opacity-70 saturate-75' : 'opacity-100 saturate-100'}`}
                      >
                        <div
                          className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">Code</th>
                              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">Name</th>
                              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">{isSupplierTab ? 'Contact' : 'Description'}</th>
                              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">Usage</th>
                              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">Status</th>
                              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {data?.data.map((item) => (
                              <tr key={item.id} className="align-middle transition-colors duration-200 ease-out hover:bg-slate-50/60">
                                <td className="px-4 py-2">
                                  <div className="font-semibold text-slate-900">{item.code}</div>
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-slate-800">{item.name}</td>
                                <td className="px-4 py-2 text-sm text-slate-500">{getReferenceSummary(item)}</td>
                                <td className="px-4 py-2 text-sm text-slate-600">{item.usageCount} products</td>
                                <td className="px-4 py-2"><StatusBadge status={item.status} /></td>
                                <td className="px-4 py-2">
                                  <div className="flex justify-end gap-2">
                                    <ActionButton icon="visibility" label="View" onClick={() => openView(item)} />
                                    {canUpdateCurrentTab && (
                                      <ActionButton icon="edit" label="Edit" onClick={() => openEdit(item)} />
                                    )}
                                    {canUpdateCurrentTab && (
                                      <ActionButton
                                        icon={item.status === 'active' ? 'block' : 'check_circle'}
                                        label={item.status === 'active' ? 'Inactivate' : 'Activate'}
                                        danger={item.status === 'active'}
                                        onClick={() => setStatusTarget(item)}
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div
                          className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
                        />
                      </div>

                      <Pagination
                        page={currentState.page}
                        totalPages={totalPages}
                        totalItems={data?.total ?? 0}
                        onChange={(nextPage) => setCurrentTabState({ page: nextPage })}
                      />
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <ReferenceFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        mode={dialogMode}
        type={activeTab}
        item={selectedItem}
        onSubmit={async (payload) => {
          try {
            if (dialogMode === 'edit' && selectedItem) {
              await updateMutation.mutateAsync({ id: selectedItem.id, type: activeTab, payload });
              toast({ title: 'Đã cập nhật', description: 'Thông tin tham chiếu đã được lưu.' });
            } else {
              await createMutation.mutateAsync({ type: activeTab, payload });
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
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={`${statusTarget?.status === 'active' ? 'Inactivate' : 'Activate'} ${activeTab === 'unit' ? 'unit' : activeTab === 'brand' ? 'brand' : 'supplier'}`}
        description={statusTarget?.status === 'active'
          ? `Bạn có chắc chắn muốn chuyển "${statusTarget?.name ?? ''}" sang Inactive không?`
          : `Bạn có chắc chắn muốn chuyển "${statusTarget?.name ?? ''}" sang Active không?`}
        onConfirm={() => void handleChangeStatus()}
        isPending={updateMutation.isPending}
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
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
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
      contactPerson: item?.contactPerson ?? '',
      phone: item?.phone ?? '',
      email: item?.email ?? '',
      address: item?.address ?? '',
    });
  }, [item, open, reset]);

  const isSupplierType = type === 'supplier';
  const typeLabel = type === 'unit' ? 'unit' : type === 'brand' ? 'brand' : 'supplier';
  const typeLabelTitle = type === 'unit' ? 'Unit' : type === 'brand' ? 'Brand' : 'Supplier';

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
            {!isSupplierType ? (
              <Field label="Description" error={errors.description?.message}>
                <textarea
                  {...register('description')}
                  disabled={isView || isPending}
                  className={`${inputClass(!!errors.description)} min-h-28 resize-none`}
                />
              </Field>
            ) : null}
            {isSupplierType ? (
              <>
                <Field label="Contact Person" error={errors.contactPerson?.message}>
                  <input
                    {...register('contactPerson')}
                    disabled={isView || isPending}
                    className={inputClass(!!errors.contactPerson)}
                  />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <input
                    {...register('phone')}
                    disabled={isView || isPending}
                    className={inputClass(!!errors.phone)}
                  />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <input
                    {...register('email')}
                    disabled={isView || isPending}
                    className={inputClass(!!errors.email)}
                  />
                </Field>
                <Field label="Address" error={errors.address?.message}>
                  <textarea
                    {...register('address')}
                    disabled={isView || isPending}
                    className={`${inputClass(!!errors.address)} min-h-28 resize-none`}
                  />
                </Field>
              </>
            ) : null}
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
            {isPending ? 'Đang cập nhật...' : 'Xác nhận'}
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterSelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!wrapperRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    const currentIndex = options.findIndex((item) => item.value === value);
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : (options.length > 0 ? 0 : -1));
  }, [open, options, value]);

  const selectedLabel = options.find((item) => item.value === value)?.label;

  return (
    <div ref={wrapperRef} className="relative w-full min-w-40">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-base text-slate-700 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-blue-300 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 md:hidden"
      >
        <option value="all">All status</option>
        {options.filter((item) => item.value !== 'all').map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>

      <div className="relative hidden md:block">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (open && highlightedIndex >= 0 && highlightedIndex < options.length) {
                onChange(options[highlightedIndex].value);
                setOpen(false);
                return;
              }
              setOpen((prev) => !prev);
              return;
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              return;
            }

            if (event.key === 'Tab') {
              setOpen(false);
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                if (options.length === 0) return -1;
                if (prev < 0) return 0;
                return Math.min(options.length - 1, prev + 1);
              });
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                if (options.length === 0) return -1;
                if (prev < 0) return options.length - 1;
                return Math.max(0, prev - 1);
              });
            }
          }}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2 text-left text-base text-slate-700 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-blue-300 hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <span className={selectedLabel ? 'text-slate-700' : 'text-slate-500'}>{selectedLabel ?? placeholder}</span>
          <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
                {options.map((item, index) => {
                  const isSelected = item.value === value;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <li key={item.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-base transition-colors ${isSelected
                          ? 'bg-blue-50 text-blue-700'
                          : isHighlighted
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${danger ? 'text-red-600 hover:bg-red-50 hover:text-red-700 disabled:hover:bg-transparent' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:hover:bg-transparent disabled:hover:text-slate-500'}`}
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
