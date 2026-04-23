import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useStockDisposalDetail } from '@/features/stock-disposal/hooks/useStockDisposal';
import { StockDisposalDetail } from '@/features/stock-disposal/components/StockDisposalDetail';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Ticket not found or an error occurred.';
}

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

export function StockDisposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = Number(id);

  const { data: stockDisposal, isLoading, isError, error } = useStockDisposalDetail(numericId);

  if (isLoading) return <SkeletonDetail />;

  if (isError || !stockDisposal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <span className="material-symbols-outlined text-[56px] text-rose-300">error</span>
        <div>
          <p className="text-base font-semibold text-slate-700">Failed to load disposal ticket</p>
          <p className="mt-1 text-sm text-slate-400">
            {getErrorMessage(error)}
          </p>
        </div>
        <button
          onClick={() => navigate('/stock-disposal')}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Back to Disposal List
        </button>
      </motion.div>
    );
  }

  return <StockDisposalDetail stockDisposal={stockDisposal} />;
}
