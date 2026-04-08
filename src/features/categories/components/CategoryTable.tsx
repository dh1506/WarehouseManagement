// @ts-nocheck
import { useMemo } from 'react';
import type { ProductCategory } from '../types/categoryType';

interface CategoryTableProps {
  categories: ProductCategory[];
  isLoading: boolean;
  onView: (cat: ProductCategory) => void;
  onEdit: (cat: ProductCategory) => void;
  onDelete: (cat: ProductCategory) => void;
}

// Helper để flat tree theo DFS
function buildFlattenedTree(categories: ProductCategory[]) {
  const map = new Map<string, ProductCategory[]>();
  categories.forEach((cat) => {
    const pId = cat.parentId || 'root';
    if (!map.has(pId)) map.set(pId, []);
    map.get(pId)!.push(cat);
  });

  const flatten: (ProductCategory & { depth: number; hasChildren: boolean; childrenCount: number })[] = [];

  function traverse(pId: string, depth: number) {
    const children = map.get(pId) || [];
    // Sort logic optional (currently by creation naturally)
    for (const child of children) {
      const childsOfChild = map.get(child.id) || [];
      flatten.push({
        ...child,
        depth,
        hasChildren: childsOfChild.length > 0,
        childrenCount: childsOfChild.length
      });
      traverse(child.id, depth + 1);
    }
  }

  traverse('root', 0);
  return flatten;
}

export function CategoryTable({ categories, isLoading, onView, onEdit, onDelete }: CategoryTableProps) {
  const treeData = useMemo(() => buildFlattenedTree(categories), [categories]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 animate-pulse text-slate-400">
        <span className="material-symbols-outlined text-lg sm:text-xl mb-2">hourglass_empty</span>
        <p className="text-sm font-medium">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
          <span className="material-symbols-outlined text-xs">category</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">Chưa có danh mục nào</h3>
        <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">
          Nhấn "New Category" để tạo danh mục sản phẩm đầu tiên của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="min-w-[800px]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 p-2 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white z-10">
          <div className="col-span-3 pl-8">Category Name</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-1">Sub-categories</div>
          <div className="col-span-1 text-right">Total Products</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 flex-1">
          {treeData.map((item) => {
            const hasKids = item.hasChildren;
            const depth = item.depth;
            const isSub = depth > 0;

            const paddingLeftBase = 24 + depth * 24;

            return (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors group relative ${isSub ? 'bg-slate-50/50 hover:bg-slate-50' : 'hover:bg-slate-50'}`}
              >
                {/* Tree lines graphics based on depth */}
                {depth > 0 && Array.from({ length: depth }).map((_, dIdx) => (
                  <div key={dIdx} className="absolute w-[1px] bg-slate-200 pointer-events-none" style={{ top: dIdx === depth - 1 ? '-16px' : 0, bottom: dIdx === depth - 1 ? '50%' : 0, left: `${32 + dIdx * 24}px` }} />
                ))}
                {depth > 0 && (
                  <div className="absolute h-[1px] bg-slate-200 pointer-events-none" style={{ left: `${32 + (depth - 1) * 24}px`, width: '16px', top: '50%' }} />
                )}

                <div className="col-span-3 flex items-center" style={{ paddingLeft: `${paddingLeftBase}px` }}>
                  {hasKids ? (
                    <button className="text-slate-400 hover:text-slate-600 w-6 flex justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-xs">expand_more</span>
                    </button>
                  ) : (
                    <div className="w-6 flex-shrink-0" /> // spacer
                  )}

                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center mr-3 text-blue-600 border border-blue-100 flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">{item.icon || 'category'}</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm truncate" title={item.name}>{item.name}</span>
                </div>

                <div className="col-span-4 text-sm text-slate-500 truncate" title={item.description}>
                  {item.description || 'No description'}
                </div>

                <div className="col-span-1 text-sm font-medium text-slate-900">
                  {item.childrenCount} Categories
                </div>

                <div className="col-span-1 text-sm font-bold text-slate-900 text-right">
                  {item.totalProducts?.toLocaleString() || '0'}
                </div>

                <div className="col-span-2 flex justify-center">
                  {item.status === 'active' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="col-span-1 flex justify-end space-x-2">
                  <button onClick={() => onView(item)} className="text-slate-400 hover:text-blue-600 transition-colors" title="View">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                  <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => onDelete(item)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
