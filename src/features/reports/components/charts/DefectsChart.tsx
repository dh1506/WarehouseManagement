import { useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import type { DefectsData, DefectCategory } from './types';
import { ChartCard } from './ChartCard';
import { EmptyChartState } from './EmptyChartState';
import { exportChartAsPNG, exportAsCSV } from './chartUtils';

// ── Tooltip ──────────────────────────────────────────────────────────────────

function DefectTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const cat = payload[0].payload as DefectCategory & { _total: number };
  const pct = cat._total > 0 ? ((cat.value / cat._total) * 100).toFixed(1) : '0';
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3.5 py-2.5 text-xs min-w-[160px]">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cat.color }} />
        <span className="font-semibold text-slate-700 leading-snug">{cat.name}</span>
      </div>
      <div className="flex justify-between gap-4 text-slate-500">
        <span>Số lượng</span>
        <span className="font-bold text-slate-700">{cat.value.toLocaleString('vi-VN')}</span>
      </div>
      <div className="flex justify-between gap-4 text-slate-500">
        <span>Tỷ lệ</span>
        <span className="font-bold text-slate-700">{pct}%</span>
      </div>
    </div>
  );
}

// ── Legend List ──────────────────────────────────────────────────────────────

function CategoryLegend({
  categories,
  total,
}: {
  categories: DefectCategory[];
  total: number;
}) {
  return (
    <ul className="space-y-2.5">
      {categories.map((cat) => {
        const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : '0';
        const barW = total > 0 ? (cat.value / total) * 100 : 0;
        return (
          <li key={cat.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cat.color }} />
              <span className="text-[11px] text-slate-600 flex-1 leading-tight truncate">{cat.name}</span>
              <span className="text-[11px] font-semibold text-slate-700 shrink-0 tabular-nums">{pct}%</span>
            </div>
            {/* Mini progress bar */}
            <div className="ml-[18px] h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${barW}%`, background: cat.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Top 3 Defective Products ─────────────────────────────────────────────────

function TopDefectProducts({ products }: { products: DefectsData['topProducts'] }) {
  const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
  const rankIcons  = ['workspace_premium', 'military_tech', 'social_leaderboard'];

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        Top sản phẩm lỗi tuần này
      </p>
      <ul className="space-y-1.5">
        {products.slice(0, 3).map((p, i) => {
          const rate = p.totalCount > 0
            ? ((p.defectCount / p.totalCount) * 100).toFixed(1)
            : '0';
          return (
            <li
              key={p.id}
              className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2"
            >
              <span className={`material-symbols-outlined text-[16px] shrink-0 ${rankColors[i]}`}>
                {rankIcons[i]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-bold text-rose-600">{rate}%</p>
                <p className="text-[10px] text-slate-400">{p.defectCount}/{p.totalCount}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface DefectsChartProps {
  data:       DefectsData;
  isLoading?: boolean;
  isError?:   boolean;
}

export function DefectsChart({ data, isLoading, isError }: DefectsChartProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  const total   = data.categories.reduce((s, c) => s + c.value, 0);
  const isEmpty = !isLoading && !isError && total === 0;

  // Inject total so tooltip can compute % without closure issues
  const pieData = data.categories.map((c) => ({ ...c, _total: total }));

  const handleExportPNG = () => exportChartAsPNG(captureRef, 'defects-analysis');
  const handleExportCSV = () =>
    exportAsCSV(
      data.categories.map((c) => ({
        'Danh mục':  c.name,
        'Số lượng':  c.value,
        'Tỷ lệ (%)': total > 0 ? +((c.value / total) * 100).toFixed(2) : 0,
      })),
      'defects-analysis',
    );

  return (
    <ChartCard
      title="Phân tích Lỗi & Ngoại lệ"
      subtitle="Phân loại theo nguyên nhân — tuần hiện tại"
      icon="bug_report"
      iconColor="text-rose-600"
      iconBg="bg-rose-50"
      isLoading={isLoading}
      isError={isError}
      captureRef={captureRef}
      onExportPNG={handleExportPNG}
      onExportCSV={handleExportCSV}
      minHeight={340}
    >
      {isEmpty ? (
        <EmptyChartState
          message="Không có sản phẩm lỗi"
          hint="Kho đang hoạt động không có sai sót ghi nhận"
        />
      ) : (
        <div className="px-4 pt-3 pb-4">
          <div className="flex flex-col md:flex-row gap-6 items-stretch">

            {/* ── Left: Donut with centre overlay ── */}
            <div className="shrink-0 self-center w-full md:w-[200px]">
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      dataKey="value"
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DefectTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Centre label — absolutely positioned over the SVG */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[22px] font-bold leading-none text-slate-800">
                      {total.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">sản phẩm lỗi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Legend + Top 3 ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-4 py-1">
              <CategoryLegend categories={data.categories} total={total} />
              <div className="border-t border-slate-100 pt-3">
                <TopDefectProducts products={data.topProducts} />
              </div>
            </div>

          </div>
        </div>
      )}
    </ChartCard>
  );
}
