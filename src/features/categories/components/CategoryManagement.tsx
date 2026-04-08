// @ts-nocheck
import { useState } from 'react';
import { useProductCategories } from '../hooks/useCategories';

import { exportCategoriesToExcel } from '../utils/exportCategories';
import type { ProductCategory, CategoryFormData } from '../types/categoryType';
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories';
import { CategoryTable } from './CategoryTable';
import { CategoryFormSheet } from './CategoryFormSheet';
import { CategoryActionDialogs } from './CategoryActionDialogs';
import { useToast } from '@/hooks/use-toast';

export function CategoryManagement() {
  const { toast } = useToast();

  // States
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<ProductCategory | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);

  // Data fetching
  const { data, isLoading } = useProductCategories({
    page,
    pageSize: 100, // Fetch 100 to build full tree on frontend for simplicity in this MVP
    search: searchTerm,
    status: statusFilter,
  });

  const allCategories = data?.data || [];
  const totalCategories = data?.total || 0;

  // Mutations
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Handlers
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setViewingCategory(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setViewingCategory(null);
    setIsFormOpen(true);
  };

  const handleOpenView = (category: ProductCategory) => {
    setViewingCategory(category);
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (category: ProductCategory) => {
    setDeletingCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveForm = async (formData: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: formData });
        toast({ title: 'Thành công', description: 'Đã cập nhật danh mục' });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: 'Thành công', description: 'Đã tạo danh mục mới' });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteMutation.mutateAsync(deletingCategory.id);
      toast({ title: 'Thành công', description: 'Đã xóa danh mục' });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    exportCategoriesToExcel(allCategories);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Top Bar (Optional if you want to keep it like the design, but in our layout it is part of Header. Assuming we have a standard header or we can just render page content) */}
      <div className="flex-1 overflow-auto p-4 pb-24">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-8 flex-shrink-0">
            <div>
              <nav className="flex text-xs text-slate-500 font-semibold tracking-wider uppercase mb-2">
                <a className="hover:text-slate-900" href="#">Inventory</a>
                <span className="mx-2"><span className="material-symbols-outlined text-[10px]">chevron_right</span></span>
                <span className="text-slate-800">Product Categories</span>
              </nav>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">Category Management</h2>
              <p className="text-slate-500 mt-1">Organize and manage global inventory hierarchy</p>
            </div>
            <div className="flex space-x-3 items-center">
              <div className="relative mr-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-64"
                />
              </div>

              <button
                onClick={handleExport}
                className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm flex items-center transition-colors"
              >
                <span className="material-symbols-outlined mr-2 text-slate-400 text-sm">download</span> Export
              </button>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 flex items-center transition-colors"
              >
                <span className="material-symbols-outlined mr-2 text-sm">add</span> New Category
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden relative">
            <CategoryTable
              categories={allCategories}
              isLoading={isLoading}
              onView={handleOpenView}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />

            {/* Pagination Box */}
            <div className="px-6 py-2 border-t border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
              <span className="text-sm text-slate-500">
                Showing {allCategories.length} of {totalCategories} categories
              </span>
              <div className="flex space-x-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <button className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded font-medium">{page}</button>
                <button
                  disabled={allCategories.length < 100} // Temporary simplistic end check
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Float Info Overlay when Drawer is open */}
            {isFormOpen && (
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] z-20 flex flex-col pointer-events-none transition-opacity duration-300">
                <div className="absolute bottom-8 left-8 p-4 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 flex items-center gap-4 max-w-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined" data-icon="info">info</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Data Locked</p>
                    <p className="text-xs text-slate-500">The table is currently locked while viewing/editing a category to ensure data consistency.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer & Dialogs */}
      <CategoryFormSheet
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveForm}
        isPending={createMutation.isPending || updateMutation.isPending}
        editingCategory={editingCategory}
        viewingCategory={viewingCategory}
        categories={allCategories}
      />

      <CategoryActionDialogs
        openDelete={isDeleteDialogOpen}
        onCloseDelete={() => setIsDeleteDialogOpen(false)}
        onConfirmDelete={handleConfirmDelete}
        category={deletingCategory}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
