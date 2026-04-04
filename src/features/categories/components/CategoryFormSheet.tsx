// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import type { ProductCategory, CategoryFormData, CategoryStatus } from '../types/categoryType';
import { CATEGORY_ICONS } from '../types/categoryType';

interface CategoryFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
  isPending: boolean;
  editingCategory: ProductCategory | null;
  viewingCategory: ProductCategory | null;
  categories: ProductCategory[];
}

export function CategoryFormSheet({
  open,
  onClose,
  onSave,
  isPending,
  editingCategory,
  viewingCategory,
  categories,
}: CategoryFormSheetProps) {
  const isView = !!viewingCategory;
  const isEdit = !!editingCategory;
  const activeCategory = viewingCategory || editingCategory;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [icon, setIcon] = useState('category');
  const [status, setStatus] = useState<CategoryStatus>('active');

  // Reset form khi mở/đóng
  useEffect(() => {
    if (open) {
      if (activeCategory) {
        setName(activeCategory.name);
        setDescription(activeCategory.description);
        setParentId(activeCategory.parentId ?? '');
        setIcon(activeCategory.icon);
        setStatus(activeCategory.status);
      } else {
        setName('');
        setDescription('');
        setParentId('');
        setIcon('category');
        setStatus('active');
      }
    }
  }, [open, activeCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) {
      onClose();
      return;
    }
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      parentId: parentId || null,
      icon,
      status,
    });
  };

  // Lọc bỏ chính nó ra khỏi danh sách parent (không cho chọn chính mình)
  const parentOptions = categories.filter((c) => c.id !== activeCategory?.id);

  const isValid = name.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      {/* Drawer Container (Side Sheet matching design) */}
      <SheetContent 
        side="right" 
        className="w-[440px] max-w-full p-0 bg-white shadow-[-16px_0_48px_-4px_rgba(0,0,0,0.15)] flex flex-col border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="px-8 py-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-headline">
              {isView ? 'Category Details' : isEdit ? 'Edit Category' : 'Create Category'}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              {isView ? 'View detailed product taxonomy parameters' : 'Define product taxonomy parameters'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined" data-icon="close">close</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 no-scrollbar">
          <form id="category-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Category Name */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                Category Name {!isView && <span className="text-red-600 font-body">*</span>}
              </label>
              <input 
                disabled={isView}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400 font-medium disabled:opacity-80" 
                placeholder="e.g. Micro-controllers" 
                type="text" 
              />
            </div>

            {/* Description */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Description</label>
              <textarea 
                disabled={isView}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400 resize-none font-medium leading-relaxed disabled:opacity-80" 
                placeholder="Detailed purpose and storage requirements..." 
                rows={4}
              />
            </div>

            {/* Parent Category */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Parent Category</label>
              <div className="relative group flex items-center bg-slate-50 rounded-xl px-4 py-3.5">
                <select
                  disabled={isView}
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-transparent border-none text-sm focus:ring-0 cursor-pointer font-medium p-0 outline-none appearance-none disabled:opacity-80 text-slate-900"
                >
                  <option value="">— Null (Root Category) —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-slate-400 absolute right-4 pointer-events-none">expand_more</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-2">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Affects sub-metrics structure. Auto increments child count.
              </p>
            </div>

            {/* Status Toggle Block */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm transition-transform ${status === 'active' ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-xs">{status === 'active' ? 'toggle_on' : 'toggle_off'}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Active Status</p>
                  <p className="text-[11px] text-slate-500 font-medium">Enable category for associations</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  disabled={isView}
                  checked={status === 'active'}
                  onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
              </label>
            </div>

            {/* Iconography Preview Section */}
            <div className="space-y-4 pt-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Iconography</label>
              
              <div className="flex items-center gap-6 p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-blue-800 text-white flex items-center justify-center shadow-xl shadow-blue-800/25 transform -rotate-3 hover:rotate-0 transition-transform flex-shrink-0">
                  <span className="material-symbols-outlined text-xs">{icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 mb-1">Category Glyph</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">Visual identifier for navigation menus and inventory labels.</p>
                </div>
              </div>

              {!isView && (
                <div className="grid grid-cols-6 gap-2 mt-4">
                  {CATEGORY_ICONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIcon(opt.value)}
                      title={opt.label}
                      className={`w-full aspect-square rounded-lg flex items-center justify-center border transition-all ${
                        icon === opt.value
                          ? 'bg-blue-100 border-blue-400 text-blue-700 ring-2 ring-blue-200'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">{opt.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Drawer Footer */}
        <div className="p-8 bg-white border-t border-slate-100 flex items-center gap-4 flex-shrink-0">
          {!isView && (
            <button 
              type="submit"
              form="category-form"
              disabled={!isValid || isPending}
              className="flex-1 py-4 px-6 bg-blue-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-800/25 hover:bg-blue-900 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              )}
              {isEdit ? 'Save Changes' : 'Save Category'}
            </button>
          )}
          <button 
            type="button"
            onClick={onClose}
            className={`px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-[0.98] ${isView ? 'flex-1' : ''}`}
          >
            {isView ? 'Close' : 'Discard'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
