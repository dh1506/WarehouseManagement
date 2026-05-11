import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProductCategory } from '../types/categoryType';

interface CategoryActionDialogsV2Props {
  openDelete: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  category: ProductCategory | null;
  isPending: boolean;
}

export function CategoryActionDialogsV2({
  openDelete,
  onCloseDelete,
  onConfirmDelete,
  category,
  isPending,
}: CategoryActionDialogsV2Props) {
  return (
    <Dialog open={openDelete} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onCloseDelete(); }}>
      <DialogContent className="max-w-md overflow-hidden rounded-[28px] border border-slate-200 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <DialogHeader className="space-y-4 px-6 py-6 pb-5 text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <span className="material-symbols-outlined text-[22px]">delete</span>
          </div>
          <DialogTitle className="text-[28px] font-semibold leading-none tracking-tight text-slate-900">
            Xóa danh mục
          </DialogTitle>
          <DialogDescription className="text-xs leading-7 text-slate-600">
            Bạn có chắc muốn xóa danh mục <span className="font-semibold text-slate-900">{category?.name}</span>? Yêu cầu sẽ bị từ chối nếu danh mục còn danh mục con hoặc sản phẩm liên kết.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 sm:justify-end">
          <button
            type="button"
            onClick={onCloseDelete}
            disabled={isPending}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isPending}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Đang xóa...' : 'Xóa danh mục'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
