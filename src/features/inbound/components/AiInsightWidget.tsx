import { Sparkles } from 'lucide-react';
import type { InboundAiInsight } from '../types/inboundDetailType';

interface AiInsightWidgetProps {
  insight: InboundAiInsight;
}

export function AiInsightWidget({ insight }: AiInsightWidgetProps) {
  return (
    <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/20 rounded-full -mr-12 -mt-12 blur-2xl" />
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-300" />
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
          AI Insight
        </h4>
      </div>
      <p className="text-sm font-medium leading-relaxed opacity-90">
        {insight.message}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-700"
            style={{ width: `${insight.matchPercentage}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-blue-200">
          {insight.matchPercentage}% Rec. Match
        </span>
      </div>
    </div>
  );
}
