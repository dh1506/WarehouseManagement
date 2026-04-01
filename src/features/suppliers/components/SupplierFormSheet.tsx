import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StatePanel } from '@/components/StatePanel';
import { supplierFormSchema, type SupplierFormData } from '../schemas/supplierSchemas';
import type { SupplierDetail, SupplierItem } from '../types/supplierType';

interface SupplierFormSheetProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  supplier: SupplierItem | null;
  supplierDetail: SupplierDetail | null;
  isDetailLoading: boolean;
  isDetailError: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: SupplierFormData) => Promise<void>;
}

export function SupplierFormSheet({
  open,
  mode,
  supplier,
  supplierDetail,
  isDetailLoading,
  isDetailError,
  isPending,
  onClose,
  onSubmit,
}: SupplierFormSheetProps) {
  const isView = mode === 'view';

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
    },
  });

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!open) {
      return;
    }

    const source = supplierDetail ?? supplier;

    reset({
      code: source?.code ?? '',
      name: source?.name ?? '',
      contactPerson: source?.contactPerson ?? '',
      phone: source?.phone ?? '',
      email: source?.email ?? '',
      address: source?.address ?? '',
      status: source?.status ?? 'active',
    });
  }, [open, reset, supplier, supplierDetail]);

  const title = {
    create: 'Tạo nhà cung cấp',
    edit: 'Cập nhật nhà cung cấp',
    view: 'Chi tiết nhà cung cấp',
  }[mode];

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) {
          onClose();
        }
      }}
    >
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(async (payload) => {
            if (!isView) {
              await onSubmit(payload);
            }
          })}
          className="flex h-full flex-col"
        >
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>
                  {isView
                    ? 'Xem thông tin liên hệ và danh mục sản phẩm đang liên kết với nhà cung cấp.'
                    : 'Chuẩn hóa hồ sơ nhà cung cấp để phục vụ nhập hàng và quản trị master data.'}
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {isView && isDetailLoading ? (
              <StatePanel
                title="Đang tải chi tiết nhà cung cấp"
                description="Hệ thống đang đồng bộ danh sách sản phẩm liên kết."
                icon="hourglass_top"
              />
            ) : isView && isDetailError ? (
              <StatePanel
                title="Không tải được chi tiết"
                description="Vui lòng đóng lại và thử truy cập nhà cung cấp này lần nữa."
                icon="error"
                tone="error"
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Mã nhà cung cấp" error={errors.code?.message}>
                    <input
                      {...register('code')}
                      disabled={isView || isPending}
                      className={inputClass(!!errors.code)}
                    />
                  </Field>
                  <Field label="Trạng thái" error={errors.status?.message}>
                    <select
                      {...register('status')}
                      disabled={isView || isPending}
                      className={inputClass(!!errors.status)}
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </select>
                  </Field>
                  <Field label="Tên nhà cung cấp" error={errors.name?.message}>
                    <input
                      {...register('name')}
                      disabled={isView || isPending}
                      className={inputClass(!!errors.name)}
                    />
                  </Field>
                  <Field label="Người liên hệ" error={errors.contactPerson?.message}>
                    <input
                      {...register('contactPerson')}
                      disabled={isView || isPending}
                      className={inputClass(!!errors.contactPerson)}
                    />
                  </Field>
                  <Field label="Số điện thoại" error={errors.phone?.message}>
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
                  <div className="md:col-span-2">
                    <Field label="Địa chỉ" error={errors.address?.message}>
                      <textarea
                        {...register('address')}
                        disabled={isView || isPending}
                        className={`${inputClass(!!errors.address)} min-h-28 resize-none`}
                      />
                    </Field>
                  </div>
                </div>

                {isView && supplierDetail ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Sản phẩm liên kết</p>
                      <p className="text-xs text-slate-500">
                        {supplierDetail.products.length} sản phẩm đang sử dụng nhà cung cấp này.
                      </p>
                    </div>

                    {supplierDetail.products.length === 0 ? (
                      <StatePanel
                        title="Chưa có sản phẩm liên kết"
                        description="Nhà cung cấp này chưa được gán vào product master nào."
                        icon="inventory_2"
                      />
                    ) : (
                      <div className="space-y-2">
                        {supplierDetail.products.map((product) => (
                          <div
                            key={product.id}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {product.code} · {product.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {product.productType} · {product.productStatus}
                                  {product.supplierSku ? ` · Supplier SKU: ${product.supplierSku}` : ''}
                                </p>
                              </div>
                              <div className="text-xs font-medium text-slate-500 sm:text-right">
                                <p>{product.isPrimary ? 'NCC chính' : 'NCC phụ'}</p>
                                <p>
                                  {product.purchasePrice === null
                                    ? 'Chưa có giá nhập'
                                    : `${new Intl.NumberFormat('vi-VN').format(product.purchasePrice)} đ`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <SheetFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {isView ? 'Đóng' : 'Hủy'}
              </button>
              {!isView ? (
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu nhà cung cấp'}
                </button>
              ) : null}
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
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

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 focus:border-primary focus:ring-primary/15'
  }`;
}
