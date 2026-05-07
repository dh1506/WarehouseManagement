import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportFilterBarProps {
  id: string;
  startDate: string;
  endDate: string;
  onFilter: (from: string, to: string) => void;
  onReset: () => void;
  extra?: React.ReactNode;
}

export function ReportFilterBar({
  id,
  startDate,
  endDate,
  onFilter,
  onReset,
  extra,
}: ReportFilterBarProps) {
  const [localFrom, setLocalFrom] = useState(startDate);
  const [localTo, setLocalTo] = useState(endDate);

  // Keep local inputs in sync when parent resets props to ''
  useEffect(() => { setLocalFrom(startDate); }, [startDate]);
  useEffect(() => { setLocalTo(endDate); }, [endDate]);

  const hasFilter = Boolean(startDate || endDate);

  const handleApply = () => {
    onFilter(localFrom, localTo);
  };

  const handleReset = () => {
    setLocalFrom('');
    setLocalTo('');
    onReset();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="material-symbols-outlined text-[15px]">calendar_today</span>
        <span className="font-medium">Từ ngày</span>
      </div>
      <input
        id={`${id}-filter-from`}
        name={`${id}-filter-from`}
        type="date"
        value={localFrom}
        onChange={(e) => setLocalFrom(e.target.value)}
        className="h-8 px-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300 outline-none bg-white text-slate-700"
      />
      <span className="text-slate-400 text-xs">–</span>
      <input
        id={`${id}-filter-to`}
        name={`${id}-filter-to`}
        type="date"
        value={localTo}
        onChange={(e) => setLocalTo(e.target.value)}
        className="h-8 px-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300 outline-none bg-white text-slate-700"
      />
      <button
        type="button"
        onClick={handleApply}
        className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
      >
        Lọc
      </button>
      <AnimatePresence>
        {hasFilter && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleReset}
            className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            Xoá lọc
          </motion.button>
        )}
      </AnimatePresence>
      {extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
    </div>
  );
}
