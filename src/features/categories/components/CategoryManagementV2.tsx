import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { exportCategoriesToExcel } from '../utils/exportCategories';
import type { CategoryFormData, ProductCategory } from '../types/categoryType';
import {
  useCategoryDetail,
  useCreateCategory,
  useDeleteCategory,
  useProductCategories,
  useUpdateCategory,
} from '../hooks/useCategories';
import { CategoryTableV2 } from './CategoryTableV2';
import { CategoryFormSheetV2 } from './CategoryFormSheetV2';
import { CategoryActionDialogsV2 } from './CategoryActionDialogsV2';

const PAGE_SIZE = 10;

function hasPermission(permissions: string[], tokens: string[], role?: string | null) {
  if ((role ?? '').trim().toUpperCase() === 'CEO') {
    return true;
  }

  const normalized = new Set(permissions.map((permission) => permission.trim().toLowerCase()));
  if (normalized.has('*')) {
    return true;
  }

  return tokens.some((token) => normalized.has(token.toLowerCase()));
}

export function CategoryManagementV2() {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const canCreate = hasPermission(permissions, ['categories:create'], user?.role);
  const canEdit = hasPermission(permissions, ['categories:update'], user?.role);
  const canDelete = hasPermission(permissions, ['categories:delete'], user?.role);
  const canExport = hasPermission(permissions, ['categories:read', 'categories:export'], user?.role);

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<ProductCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const listQuery = useProductCategories({
    page,
    pageSize: PAGE_SIZE,
    search: deferredSearchTerm || undefined,
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  useCategoryDetail(viewingCategory?.id, false);

  const categories = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const filteredCategories = useMemo(() => categories, [categories]);

  const updateScrollFade = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowTopFade(scrollTop > 2);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    updateScrollFade();
  }, [filteredCategories, listQuery.isLoading, listQuery.isFetching, updateScrollFade]);

  const openCreate = () => {
    setEditingCategory(null);
    setViewingCategory(null);
    setIsFormOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setViewingCategory(null);
    setIsFormOpen(true);
  };

  const openView = (category: ProductCategory) => {
    setViewingCategory(category);
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const openDelete = (category: ProductCategory) => {
    setDeletingCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data });
        toast({ title: 'Category updated', description: 'The category details have been saved.' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: 'Category created', description: 'The new category is now available in the system.' });
      }

      setIsFormOpen(false);
    } catch (error) {
      toast({
        title: 'Unable to save category',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deletingCategory.id);
      toast({ title: 'Category deleted', description: 'The category has been removed from the system.' });
      setIsDeleteDialogOpen(false);
      setDeletingCategory(null);
    } catch (error) {
      toast({
        title: 'Unable to delete category',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    await exportCategoriesToExcel(filteredCategories);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          title="Category Management"
          description="Manage the hierarchical product category structure that supports product master data and future inventory workflows."
          actions={(
            <>
              {canExport ? (
                <button type="button" onClick={() => void handleExport()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/15">
                  Export
                </button>
              ) : null}
              {canCreate ? (
                <button type="button" onClick={openCreate} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-container hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  New Category
                </button>
              ) : null}
            </>
          )}
        />

        <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search by category code, name, or description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 ease-out focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200">
            <div
              ref={tableScrollRef}
              onScroll={updateScrollFade}
              className={`relative min-h-0 flex-1 overflow-auto transition-all duration-300 ease-out ${listQuery.isFetching ? 'opacity-70 saturate-75' : 'opacity-100 saturate-100'}`}
            >
              <div
                className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
              />
              <CategoryTableV2
                categories={filteredCategories}
                isLoading={listQuery.isLoading}
                isError={listQuery.isError}
                canEdit={canEdit}
                canDelete={canDelete}
                onRetry={() => void listQuery.refetch()}
                onView={openView}
                onEdit={openEdit}
                onDelete={openDelete}
              />
              <div
                className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>

            {total > 0 ? (
              <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Showing {pageStart} - {pageEnd} of {total} categories
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors duration-200 ease-out hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    Prev
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    const targetPage = index + 1;
                    return (
                      <button
                        key={targetPage}
                        type="button"
                        onClick={() => setPage(targetPage)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 ease-out ${page === targetPage ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        {targetPage}
                      </button>
                    );
                  })}
                  {totalPages > 5 ? <span className="px-1 text-slate-400">...</span> : null}
                  {totalPages > 5 ? (
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 ease-out ${page === totalPages ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {totalPages}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-900 transition-colors duration-200 ease-out hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CategoryFormSheetV2
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
        editingCategory={editingCategory}
        viewingCategory={viewingCategory}
        categories={categories}
      />

      <CategoryActionDialogsV2
        openDelete={isDeleteDialogOpen}
        onCloseDelete={() => {
          setIsDeleteDialogOpen(false);
          setDeletingCategory(null);
        }}
        onConfirmDelete={() => void handleDelete()}
        category={deletingCategory}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
