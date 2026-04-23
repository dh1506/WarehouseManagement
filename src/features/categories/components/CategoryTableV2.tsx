import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StatePanel } from '@/components/StatePanel';
import type { ProductCategory } from '../types/categoryType';

interface CategoryTableV2Props {
  categories: ProductCategory[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onRetry: () => void;
  onView: (category: ProductCategory) => void;
  onEdit: (category: ProductCategory) => void;
  onDelete: (category: ProductCategory) => void;
}

interface FlattenedCategory extends ProductCategory {
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

export function CategoryTableV2({
  categories,
  isLoading,
  isError,
  canEdit,
  canDelete,
  onRetry,
  onView,
  onEdit,
  onDelete,
}: CategoryTableV2Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const map = new Map<string | null, ProductCategory[]>();
    const existingIds = new Set(categories.map((category) => category.id));

    for (const category of categories) {
      const normalizedParentId = category.parentId && existingIds.has(category.parentId)
        ? category.parentId
        : null;
      const siblings = map.get(normalizedParentId) ?? [];
      siblings.push(category);
      map.set(normalizedParentId, siblings);
    }

    for (const [key, value] of map.entries()) {
      value.sort((left, right) => left.name.localeCompare(right.name));
      map.set(key, value);
    }

    const flattened: FlattenedCategory[] = [];

    const traverse = (parentId: string | null, depth: number, hiddenByParent: boolean) => {
      const children = map.get(parentId) ?? [];

      for (const child of children) {
        if (!hiddenByParent) {
          const hasChildren = (map.get(child.id) ?? []).length > 0;
          const isExpanded = !collapsedIds.has(child.id);

          flattened.push({
            ...child,
            depth,
            hasChildren,
            isExpanded,
          });

          traverse(child.id, depth + 1, !isExpanded);
        }
      }
    };

    traverse(null, 0, false);
    return flattened;
  }, [categories, collapsedIds]);

  if (isLoading) {
    return <div className="flex h-full min-h-80 items-center justify-center p-8"><StatePanel title="Loading categories" description="The system is syncing category data from the API." icon="hourglass_top" /></div>;
  }

  if (isError) {
    return <div className="flex h-full min-h-80 items-center justify-center p-8"><StatePanel title="Unable to load categories" description="Please try again to continue managing categories." icon="error" tone="error" action={<RetryButton onClick={onRetry} />} /></div>;
  }

  if (treeData.length === 0) {
    return <div className="flex h-full min-h-80 items-center justify-center p-8"><StatePanel title="No matching categories" description="Create the first category or adjust your search filter." icon="category" /></div>;
  }

  return (
    <div className="h-full">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">Category Name</th>
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3">Description</th>
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center">Sub-categories</th>
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center">Total Products</th>
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          <AnimatePresence initial={false}>
            {treeData.map((category) => (
              <motion.tr
                key={category.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="align-top transition-colors duration-200 ease-out hover:bg-slate-50/60"
              >
                <td className="px-4 py-4">
                  <div className="flex items-start gap-2" style={{ paddingLeft: `${category.depth * 20}px` }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!category.hasChildren) {
                          return;
                        }

                        setCollapsedIds((current) => {
                          const next = new Set(current);
                          if (next.has(category.id)) {
                            next.delete(category.id);
                          } else {
                            next.add(category.id);
                          }
                          return next;
                        });
                      }}
                      className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 ease-out hover:bg-slate-100 hover:text-slate-700"
                      disabled={!category.hasChildren}
                    >
                      <motion.span
                        className={`material-symbols-outlined text-[18px] ${category.hasChildren ? '' : 'scale-75'}`}
                        initial={false}
                        animate={{ rotate: category.hasChildren && category.isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        {category.hasChildren ? 'chevron_right' : 'fiber_manual_record'}
                      </motion.span>
                    </button>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{category.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{category.code}</div>
                      {category.parentName ? <div className="mt-1 text-xs text-slate-400">Parent: {category.parentName}</div> : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{category.description || 'No description'}</td>
                <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">{category.childrenCount}</td>
                <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">{category.totalProducts}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-center gap-2">
                    <ActionButton icon="visibility" label="View" onClick={() => onView(category)} />
                    {canEdit ? <ActionButton icon="edit" label="Edit" onClick={() => onEdit(category)} /> : null}
                    {canDelete ? <ActionButton icon="delete" label="Delete" danger onClick={() => onDelete(category)} /> : null}
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Retry</button>;
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
      className={`rounded-lg p-2 transition-colors duration-200 ease-out ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
      title={label}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
