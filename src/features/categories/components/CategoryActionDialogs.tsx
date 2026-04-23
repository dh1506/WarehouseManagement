// @ts-nocheck
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProductCategory } from '../types/categoryType';

interface CategoryActionDialogsProps {
  openDelete: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  category: ProductCategory | null;
  isPending: boolean;
}

export function CategoryActionDialogs({
  openDelete,
  onCloseDelete,
  onConfirmDelete,
  category,
  isPending,
}: CategoryActionDialogsProps) {
  return (
    <Dialog open={openDelete} onOpenChange={(v) => { if (!v && !isPending) onCloseDelete(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <span className="material-symbols-outlined rounded-full bg-red-100 p-2">delete</span>
            Xác nhận xóa danh mục
          </DialogTitle>
          <DialogDescription className="pt-3">
            Bạn có chắc chắn muốn xóa danh mục <strong>{category?.name}</strong>?
            <br />
            Nếu danh mục này có danh mục con, hệ thống có thể từ chối xóa hoặc ảnh hưởng đến toàn bộ cấu trúc.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCloseDelete}
            disabled={isPending}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isPending && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
            Xóa danh mục
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
