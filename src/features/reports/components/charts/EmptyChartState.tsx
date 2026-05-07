interface EmptyChartStateProps {
  message?: string;
  hint?: string;
}

export function EmptyChartState({
  message = 'Chưa có dữ liệu ghi nhận',
  hint = 'Dữ liệu sẽ hiển thị khi có giao dịch mới',
}: EmptyChartStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center select-none">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="72" height="72" rx="18" fill="#f8fafc" />
        {/* Bar chart silhouette */}
        <rect x="13" y="44" width="9" height="16" rx="2.5" fill="#e2e8f0" />
        <rect x="26" y="34" width="9" height="26" rx="2.5" fill="#e2e8f0" />
        <rect x="39" y="38" width="9" height="22" rx="2.5" fill="#e2e8f0" />
        <rect x="52" y="26" width="9" height="34" rx="2.5" fill="#e2e8f0" />
        {/* Trend line dashed */}
        <path
          d="M17 38 Q31 26 44 30 T63 20"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 3"
          fill="none"
        />
        {/* Bottom axis */}
        <line x1="9" y1="62" x2="63" y2="62" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-sm font-semibold text-slate-400">{message}</p>
        <p className="text-xs text-slate-300 mt-1">{hint}</p>
      </div>
    </div>
  );
}
