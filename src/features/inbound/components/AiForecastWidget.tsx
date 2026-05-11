import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export function AiForecastWidget() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Dự báo AI
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dựa trên xu hướng nhập kho hiện tại, mức sử dụng cầu cảng dự kiến đạt{' '}
              <span className="font-semibold text-violet-700">85%</span> trong khoảng 14h-16h hôm nay.
              Hãy cân nhắc chuyển 3 phiếu nhập đang chờ sang buổi sáng để tránh tắc nghẽn.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dock-dispatch')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-violet-700 hover:shadow active:bg-violet-800"
        >
          Tối ưu cầu cảng
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
