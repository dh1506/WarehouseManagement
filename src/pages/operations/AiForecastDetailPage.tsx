import { useParams, Navigate } from 'react-router-dom';
import { AiForecastDetail } from '@/features/ai-forecast/components/AiForecastDetail';

export function AiForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? parseInt(id, 10) : NaN;

  if (!id || isNaN(numericId)) {
    return <Navigate to="/ai-forecast" replace />;
  }

  return <AiForecastDetail id={numericId} />;
}
