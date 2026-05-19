import { useEffect, useRef } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useDebounce } from '@/hooks/useDebounce';
import { useProductInventoryAtLocation } from '../hooks/useOutbound';
import type { CreateStockOutSchemaValues } from '../schemas/outboundSchema';

// ─── LineItemEditor ───────────────────────────────────────────────────────────
// Danh sách sản phẩm xuất theo schema BE: details[{ product_id, quantity, unit_price? }]
// Lô hàng và vị trí chưa được chỉ định lúc tạo — chỉ gán sau khi APPROVED.
// Kiểm tra tồn kho tại đúng warehouse_location_id để tránh tạo phiếu không duyệt được.

export function LineItemEditor() {
  const { control, formState: { errors } } = useFormContext<CreateStockOutSchemaValues>();

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });

  const handleAdd = () => {
    append({ product_id: 0, quantity: 1, unit_price: null });
  };

  const detailErrors = errors.details;

  return (
    <div className="space-y-3">
      {/* Tiêu đề danh sách */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-[18px]">list_alt</span>
          <h3 className="text-sm font-bold text-slate-800">
            Danh sách sản phẩm xuất{' '}
            <span className="text-slate-400 font-normal">({fields.length} dòng)</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Thêm sản phẩm
        </button>
      </div>

      {/* Lỗi toàn cục (min items) */}
      {typeof detailErrors?.message === 'string' && (
        <p className="text-xs text-red-500">{detailErrors.message}</p>
      )}
      {detailErrors?.root?.message && (
        <p className="text-xs text-red-500">{detailErrors.root.message}</p>
      )}

      {/* Trạng thái rỗng */}
      {fields.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-200 mb-2 block">
            inventory_2
          </span>
          <p className="text-sm text-slate-400 mb-3">
            Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="text-sm text-blue-600 font-semibold underline underline-offset-2"
          >
            + Thêm sản phẩm đầu tiên
          </button>
        </div>
      )}

      {/* Ghi chú hướng dẫn */}
      {fields.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
          <span className="material-symbols-outlined text-blue-500 text-[16px] shrink-0 mt-0.5">
            info
          </span>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Lô hàng cụ thể sẽ được gán sau khi phiếu được{' '}
            <strong>Phê duyệt</strong>. Bước này chỉ cần nhập sản phẩm và số lượng yêu cầu.
          </p>
        </div>
      )}

      {/* Danh sách dòng */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <LineItemRow key={field.id} index={index} onRemove={() => remove(index)} />
        ))}
      </div>

      {/* Footer total */}
      {fields.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-400">{fields.length} sản phẩm</span>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Thêm dòng
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LineItemRow ──────────────────────────────────────────────────────────────
// Mỗi dòng tự quản lý truy vấn tồn kho của riêng mình.
// Dùng useWatch để tránh re-render toàn bộ form khi field khác thay đổi.

function LineItemRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const {
    register,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<CreateStockOutSchemaValues>();

  const productId = useWatch<CreateStockOutSchemaValues, `details.${number}.product_id`>({
    name: `details.${index}.product_id`,
  });
  const quantity = useWatch<CreateStockOutSchemaValues, `details.${number}.quantity`>({
    name: `details.${index}.quantity`,
  });
  const warehouseLocationId = useWatch<CreateStockOutSchemaValues, 'warehouse_location_id'>({
    name: 'warehouse_location_id',
  });

  // Debounce product ID 400ms để giảm số lần gọi API
  const debouncedProductId = useDebounce(productId, 400);
  const safeProductId =
    Number.isFinite(debouncedProductId) && debouncedProductId > 0 ? debouncedProductId : 0;
  const safeLocationId =
    Number.isFinite(warehouseLocationId) && warehouseLocationId > 0 ? warehouseLocationId : 0;

  // Truy vấn tồn kho tại vị trí xuất cụ thể (vô hiệu khi chưa nhập location)
  const { data: inventoryData, isLoading: isLoadingInventory } =
    useProductInventoryAtLocation(safeProductId, safeLocationId);

  const availableQty = safeLocationId > 0 ? inventoryData?.availableQty : undefined;

  // Theo dõi lỗi manual để tránh xóa nhầm lỗi do Zod resolver đặt
  const hasManualErrorRef = useRef(false);

  useEffect(() => {
    const fieldName = `details.${index}.quantity` as const;

    // Chưa chọn sản phẩm hoặc đang tải — xóa manual error nếu có
    if (safeProductId === 0 || isLoadingInventory || availableQty === undefined) {
      if (hasManualErrorRef.current) {
        clearErrors(fieldName);
        hasManualErrorRef.current = false;
      }
      return;
    }

    const numQty = Number(quantity);
    const isOverLimit = Number.isFinite(numQty) && numQty > 0 && numQty > availableQty;

    if (isOverLimit) {
      setError(fieldName, {
        type: 'manual',
        message: `Số lượng xuất không được vượt quá tồn kho khả dụng (${availableQty})`,
      });
      hasManualErrorRef.current = true;
    } else if (hasManualErrorRef.current) {
      clearErrors(fieldName);
      hasManualErrorRef.current = false;
    }
  }, [quantity, availableQty, isLoadingInventory, safeProductId, index, setError, clearErrors]);

  const lineErrors = Array.isArray(errors.details) ? errors.details[index] : undefined;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 group relative hover:border-blue-200 transition-colors">
      {/* Index + remove */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Dòng #{index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:text-red-500 rounded-md hover:bg-red-50 text-slate-400"
          title="Xóa dòng"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Product ID */}
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Mã sản phẩm (ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            placeholder="VD: 42"
            {...register(`details.${index}.product_id`, { valueAsNumber: true })}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
          {lineErrors?.product_id && (
            <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.product_id.message}</p>
          )}
          {/* Badge tồn kho — hiển thị ngay dưới ô nhập product_id */}
          <InventoryAvailabilityBadge
            productId={safeProductId}
            locationId={safeLocationId}
            isLoading={isLoadingInventory}
            availableQty={availableQty}
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Số lượng <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0.01}
            step="any"
            placeholder="VD: 10"
            {...register(`details.${index}.quantity`, { valueAsNumber: true })}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
          {lineErrors?.quantity && (
            <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.quantity.message}</p>
          )}
        </div>

        {/* Unit Price (optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Đơn giá (tùy chọn)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              ₫
            </span>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="0"
              {...register(`details.${index}.unit_price`, {
                setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
              })}
              className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>
          {lineErrors?.unit_price && (
            <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.unit_price.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── InventoryAvailabilityBadge ───────────────────────────────────────────────
// Hiển thị trạng thái tồn kho khả dụng — chỉ nhận props, không chứa logic.

interface InventoryAvailabilityBadgeProps {
  productId: number;
  locationId: number;
  isLoading: boolean;
  availableQty: number | undefined;
}

function InventoryAvailabilityBadge({ productId, locationId, isLoading, availableQty }: InventoryAvailabilityBadgeProps) {
  if (productId === 0) return null;

  // Đã chọn sản phẩm nhưng chưa nhập vị trí — nhắc người dùng
  if (locationId === 0) {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
        <span className="text-[10px] text-slate-400">Nhập ID vị trí xuất để xem tồn kho</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
        <span className="text-[10px] text-slate-400">Đang kiểm tra tồn kho...</span>
      </div>
    );
  }

  if (availableQty === undefined) return null;

  if (availableQty === 0) {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <span className="material-symbols-outlined text-[13px] text-red-500">
          production_quantity_limits
        </span>
        <span className="text-[10px] font-semibold text-red-600">
          Hết hàng tại vị trí #{locationId}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <span className="material-symbols-outlined text-[13px] text-emerald-600">
        inventory_2
      </span>
      <span className="text-[10px] font-semibold text-emerald-700">
        Khả dụng tại #{locationId}: <span className="font-bold">{availableQty}</span>
      </span>
    </div>
  );
}
