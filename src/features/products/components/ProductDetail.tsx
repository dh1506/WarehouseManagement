import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { hasModuleActionPermission } from '@/utils/module-permission';
import { useProductDetail } from '@/features/products/hooks/useProductDetail';
import {
  useProductCategoryOptions,
  useProductUnitOptions,
  useProductBrandOptions,
  useProductManufacturerOptions,
  useUpdateProduct,
} from '../hooks/useProducts';

import type { ProductFormData } from '../schemas/productSchemas';
import { ProductFormSheet } from '@/features/products/components/ProductFormSheets';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null);
  const user = useAuthStore((state) => state.user);
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canEdit = hasModuleActionPermission({
    permissions: userPermissions,
    moduleName: 'products',
    moduleAliases: ['product'],
    action: 'edit',
    roleName: user?.role,
  });

  const showNoPermissionToast = () => {
    toast({
      title: 'Khong co quyen thuc hien',
      description: 'Ban khong co quyen chinh sua san pham nay.',
      variant: 'destructive',
    });
  };

  if (!id) {
    return <StatePanel title="Invalid Product" description="No product ID provided." icon="error" tone="error" />;
  }

  const { data: product, isLoading, isError, refetch } = useProductDetail(id);
  const categoriesQuery = useProductCategoryOptions();
  const unitsQuery = useProductUnitOptions();
  const brandsQuery = useProductBrandOptions();
  const manufacturersQuery = useProductManufacturerOptions();
  const updateMutation = useUpdateProduct();

  const isOptionsLoading =
    categoriesQuery.isLoading ||
    unitsQuery.isLoading ||
    brandsQuery.isLoading ||
    manufacturersQuery.isLoading;

  if (isLoading) {
    return (
      <div className="p-8">
        <StatePanel title="Đang tải thông tin sản phẩm" description="Hệ thống đang truy xuất dữ liệu chi tiết." icon="hourglass_top" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-8">
        <StatePanel
          title="Không thể tải chi tiết sản phẩm"
          description="Hãy thử lại để xem thông tin sản phẩm."
          icon="error"
          tone="error"
          action={
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              Thử lại
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#fbfbfe]">
      {/* Navigation Back Button */}
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6 lg:px-8 border-b border-slate-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          {/* Header Section */}
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                  Chi tiết sản phẩm
                </span>
                {product.status === 'active' && (
                  <span className="rounded bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    Hoạt động
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{product.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                SKU: {product.sku} | ID: {product.id}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <span className="material-symbols-outlined text-lg">print</span>
                In nhãn
              </button>
              <button
                onClick={() => {
                  if (!canEdit) {
                    showNoPermissionToast();
                    return;
                  }

                  setIsEditSheetOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Chỉnh sửa
              </button>
            </div>
          </div>

          {/* Detail Grid Layout */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Images & Barcode */}
            <div className="col-span-12 space-y-6 xl:col-span-3">
              {/* Main Image */}
              <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setFullscreenImageIndex(selectedImageIndex)}
                  className="relative mb-4 overflow-hidden rounded-lg bg-slate-100 aspect-square group w-full cursor-pointer"
                >
                  {product.images && product.images.length > 0 ? (
                    <>
                      <img
                        src={product.images[selectedImageIndex].url}
                        alt={product.images[selectedImageIndex].alt || `${product.name} - ảnh ${selectedImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Navigation Buttons */}
                      {product.images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            aria-label="Ảnh trước"
                          >
                            <span className="material-symbols-outlined">chevron_left</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            aria-label="Ảnh tiếp"
                          >
                            <span className="material-symbols-outlined">chevron_right</span>
                          </button>
                          {/* Image Counter */}
                          <div className="absolute bottom-3 right-3 z-10 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                            {selectedImageIndex + 1} / {product.images.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <span className="material-symbols-outlined text-6xl text-slate-300">image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
                  </div>
                </button>
                {/* Thumbnail Grid */}
                {product.images && product.images.length > 0 && (
                  <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
                    {product.images.map((img, idx) => (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`aspect-square overflow-hidden rounded-md border-2 transition ${selectedImageIndex === idx ? 'border-primary shadow-md' : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <img src={img.url} alt={img.alt || `Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFullscreenImageIndex(selectedImageIndex)}
                      className="aspect-square rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition"
                      title="Xem ảnh to"
                    >
                      <span className="material-symbols-outlined text-slate-500">zoom_in</span>
                    </button>
                  </div>
                )}
              </div>

              {/* QR Code / Barcode */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Asset Tagging</span>
                  <span className="material-symbols-outlined text-slate-400 text-sm cursor-help">info</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-center h-32 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900 font-mono">{product.sku}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-mono text-slate-400 mb-1">SKU IDENTIFIER</p>
                  <p className="text-xs font-bold text-blue-700 tracking-widest">{product.sku}</p>
                </div>
                <button className="w-full mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-tight text-slate-700 hover:bg-slate-200 transition">
                  Quét để kiểm tra
                </button>
              </div>
            </div>

            {/* Center Column: General Info */}
            <div className="col-span-12 space-y-6 xl:col-span-6">
              {/* General Information */}
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <h3 className="text-lg font-bold">Thông tin chung</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danh mục</label>
                    <p className="font-semibold text-slate-900">{product.categoryName}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thương hiệu</label>
                    <p className="font-semibold text-slate-900">{product.brandName}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhà sản xuất</label>
                    <p className="font-semibold text-slate-900">{product.manufacturer}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn vị tính</label>
                    <p className="font-semibold text-slate-900">{product.unitName}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả</label>
                    <p className="text-sm leading-relaxed text-slate-600">{product.description || 'Không có mô tả'}</p>
                  </div>
                </div>
              </div>

              {/* Tracking & Policies */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">tracking_ads</span>
                    <h3 className="text-lg font-bold">Quy tắc theo dõi</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={product.trackedByLot}
                        disabled
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700">Theo dõi theo lô / batch</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={product.trackedByExpiry}
                        disabled
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700">Theo dõi ngày hết hạn</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                    <h3 className="text-lg font-bold">Chính sách tồn kho</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">Tồn tối thiểu</span>
                      <span className="text-sm font-bold text-slate-900">{product.minStock}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">Tồn tối đa</span>
                      <span className="text-sm font-bold text-slate-900">{product.maxStock}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Stock & Locations */}
            <div className="col-span-12 space-y-6 xl:col-span-3">
              {/* Stock Summary */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border-l-4 border-primary">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Tóm tắt tồn kho</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-4xl font-extrabold text-slate-900">0</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Tổng số đơn vị</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xl font-bold text-slate-900">0</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Có sẵn</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3">
                      <p className="text-xl font-bold text-red-600">0</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Đã đặt</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Locations */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vị trí hiện tại</h3>
                  <button className="text-xs font-bold text-blue-700 hover:underline">Quản lý</button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white shrink-0">
                      <span className="material-symbols-outlined">location_on</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">Chưa có vị trí</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-1">Cần gán vị trí kho</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                    <span className="material-symbols-outlined text-lg">info</span>
                    <span>Thông tin vị trí</span>
                  </div>
                  <p className="mt-2 text-xs leading-tight text-slate-600">
                    Sản phẩm này chưa được gán vào bất kỳ vị trí kho nào. Hãy sử dụng chức năng quản lý để gán vị trí.
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Trạng thái</h3>
                <div className="flex items-center gap-3">
                  <StatusBadge status={product.status} />
                  <span className="text-sm text-slate-600">
                    {product.status === 'active' ? 'Sản phẩm đang hoạt động' : product.status === 'inactive' ? 'Sản phẩm không hoạt động' : 'Bản nháp'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Movement Log */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b border-slate-100 flex items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">swap_horiz</span>
                <h3 className="text-lg font-bold">Nhật ký hoạt động gần đây</h3>
              </div>
              <button className="text-xs font-bold text-blue-700 flex items-center gap-1 hover:underline">
                Xem tất cả
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="p-6 text-center text-sm text-slate-500">
              Chưa có hoạt động nào được ghi nhận
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-2xl bg-primary px-4 py-4 text-white shadow-2xl transition hover:scale-105 group">
        <span className="material-symbols-outlined text-2xl transition-transform group-hover:rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
        <span className="text-sm font-bold pr-2">Phân tích ngay</span>
      </button>

      {/* Edit Sheet */}
      {product && (
        <ProductFormSheet
          open={isEditSheetOpen}
          onClose={() => setIsEditSheetOpen(false)}
          mode="edit"
          product={product}
          categories={categoriesQuery.data ?? []}
          units={unitsQuery.data ?? []}
          brands={brandsQuery.data ?? []}
          manufacturers={manufacturersQuery.data ?? []}
          onSubmit={async (payload: ProductFormData) => {
            try {
              if (!canEdit) {
                showNoPermissionToast();
                return;
              }

              await updateMutation.mutateAsync({ id: product.id, payload });
              toast({ title: 'Đã cập nhật sản phẩm', description: 'Product master đã được lưu.' });
              setIsEditSheetOpen(false);
              refetch();
            } catch (error) {
              toast({
                title: 'Không thể lưu sản phẩm',
                description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
                variant: 'destructive',
              });
            }
          }}
          isPending={updateMutation.isPending}
          isOptionsLoading={isOptionsLoading}
        />
      )}

      {/* Fullscreen Image Viewer */}
      {fullscreenImageIndex !== null && product.images?.[fullscreenImageIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <img
              src={product.images[fullscreenImageIndex].url}
              alt={product.images[fullscreenImageIndex].alt || `${product.name}`}
              className="w-full h-auto rounded-lg"
            />
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setFullscreenImageIndex(null)}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
              aria-label="Đóng"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            {/* Navigation Buttons */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev! - 1))
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                  aria-label="Ảnh trước"
                >
                  <span className="material-symbols-outlined text-2xl">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev! + 1))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                  aria-label="Ảnh tiếp"
                >
                  <span className="material-symbols-outlined text-2xl">chevron_right</span>
                </button>
              </>
            )}
            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              {fullscreenImageIndex + 1} / {product.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
