import { Badge } from '@/components/ui/badge';
import type { InboundStatus } from '../types/inboundType';

interface InboundStatusBadgeProps {
  status: InboundStatus;
}

export function InboundStatusBadge({ status }: InboundStatusBadgeProps) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
          Draft
        </Badge>
      );
    case 'CONFIRMED':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
          Confirmed
        </Badge>
      );
    case 'RECEIVING':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
          Receiving
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
          Completed
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
