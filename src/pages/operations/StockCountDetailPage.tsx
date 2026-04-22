import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useStockCountDetail } from '@/features/stock-count/hooks/useStockCount';
import { StockCountDetail } from '@/features/stock-count/components/StockCountDetail';

function SkeletonDetail() {
  return (
    <div className="px-6 py-6 space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-6 w-36 rounded-full bg-slate-200" />
        <div className="h-6 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-slate-200" />
            <div className="h-5 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-6 rounded bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StockCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = Number(id);

  const { data: stockCount, isLoading, isError, error } = useStockCountDetail(numericId);

  if (isLoading) return <SkeletonDetail />;

  if (isError || !stockCount) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <span className="material-symbols-outlined text-[56px] text-rose-300">error</span>
        <div>
          <p className="text-base font-semibold text-slate-700">Failed to load audit ticket</p>
          <p className="mt-1 text-sm text-slate-400">
            {(error as { message?: string })?.message ?? 'Ticket not found or an error occurred.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/stock-count')}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Back to Audits
        </button>
      </motion.div>
    );
  }

  return <StockCountDetail stockCount={stockCount} />;
}
