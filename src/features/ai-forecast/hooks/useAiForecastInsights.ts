import { useQuery } from '@tanstack/react-query';
import { getOperationsInsightPayload } from '@/services/operationsInsightService';
import type { AiForecastFilterValues, AiForecastInsights, DemandForecastItem } from '../types/aiForecastType';

const AI_FORECAST_KEYS = {
  all: ['ai-forecast'] as const,
  insights: (filters: AiForecastFilterValues) => ['ai-forecast', 'insights', filters] as const,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildForecast(item: {
  id: string;
  sku: string;
  name: string;
  status: 'active' | 'inactive' | 'discontinued';
  supplierName: string;
  minStock: number;
  maxStock: number;
  trackedByExpiry: boolean;
}): DemandForecastItem {
  const stockRange = Math.max(item.maxStock - item.minStock, 0);

  let confidence = 62;
  if (item.status === 'inactive') {
    confidence -= 18;
  }
  if (item.status === 'discontinued') {
    confidence -= 28;
  }
  if (item.supplierName.trim().length === 0) {
    confidence -= 15;
  }
  if (item.trackedByExpiry) {
    confidence += 8;
  }
  if (stockRange >= 150) {
    confidence += 6;
  }

  const normalizedConfidence = clamp(confidence, 15, 95);

  const projectedDemand = normalizedConfidence >= 75
    ? 'high'
    : normalizedConfidence >= 45
      ? 'medium'
      : 'low';

  const recommendation = projectedDemand === 'high'
    ? 'Prioritize replenishment planning and reserve picking capacity.'
    : projectedDemand === 'medium'
      ? 'Maintain current replenishment cadence and monitor daily changes.'
      : 'Review policy or supplier readiness before raising replenishment volume.';

  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    status: item.status,
    confidence: normalizedConfidence,
    projectedDemand,
    recommendation,
  };
}

export function useAiForecastInsights(filters: AiForecastFilterValues) {
  return useQuery<AiForecastInsights>({
    queryKey: AI_FORECAST_KEYS.insights(filters),
    queryFn: async () => {
      const payload = await getOperationsInsightPayload({
        search: filters.search,
        productStatus: filters.status,
      });

      const items = payload.productResult.data.map((product) =>
        buildForecast({
          id: product.id,
          sku: product.sku,
          name: product.name,
          status: product.status,
          supplierName: product.supplierName,
          minStock: product.minStock,
          maxStock: product.maxStock,
          trackedByExpiry: product.trackedByExpiry,
        }),
      );

      return {
        generatedAt: payload.generatedAt,
        items,
        highDemandCount: items.filter((item) => item.projectedDemand === 'high').length,
        lowConfidenceCount: items.filter((item) => item.confidence < 45).length,
      };
    },
  });
}
