import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { triggerForecastSchema } from '../schemas/aiForecastSchemas';
import { useAiForecastEvents, useTriggerForecast } from '../hooks/useAiForecast';

// 63 provinces / municipalities — values are English city names for weather API compatibility
const VIETNAM_PROVINCES: { label: string; value: string }[] = [
  { label: 'Hà Nội', value: 'Hanoi' },
  { label: 'TP. Hồ Chí Minh', value: 'Ho Chi Minh City' },
  { label: 'Đà Nẵng', value: 'Da Nang' },
  { label: 'Hải Phòng', value: 'Hai Phong' },
  { label: 'Cần Thơ', value: 'Can Tho' },
  { label: 'An Giang', value: 'An Giang' },
  { label: 'Bà Rịa – Vũng Tàu', value: 'Vung Tau' },
  { label: 'Bắc Giang', value: 'Bac Giang' },
  { label: 'Bắc Kạn', value: 'Bac Kan' },
  { label: 'Bạc Liêu', value: 'Bac Lieu' },
  { label: 'Bắc Ninh', value: 'Bac Ninh' },
  { label: 'Bến Tre', value: 'Ben Tre' },
  { label: 'Bình Định', value: 'Quy Nhon' },
  { label: 'Bình Dương', value: 'Thu Dau Mot' },
  { label: 'Bình Phước', value: 'Dong Xoai' },
  { label: 'Bình Thuận', value: 'Phan Thiet' },
  { label: 'Cà Mau', value: 'Ca Mau' },
  { label: 'Cao Bằng', value: 'Cao Bang' },
  { label: 'Đắk Lắk', value: 'Buon Ma Thuot' },
  { label: 'Đắk Nông', value: 'Gia Nghia' },
  { label: 'Điện Biên', value: 'Dien Bien Phu' },
  { label: 'Đồng Nai', value: 'Bien Hoa' },
  { label: 'Đồng Tháp', value: 'Cao Lanh' },
  { label: 'Gia Lai', value: 'Pleiku' },
  { label: 'Hà Giang', value: 'Ha Giang' },
  { label: 'Hà Nam', value: 'Phu Ly' },
  { label: 'Hà Tĩnh', value: 'Ha Tinh' },
  { label: 'Hải Dương', value: 'Hai Duong' },
  { label: 'Hậu Giang', value: 'Vi Thanh' },
  { label: 'Hòa Bình', value: 'Hoa Binh' },
  { label: 'Hưng Yên', value: 'Hung Yen' },
  { label: 'Khánh Hòa', value: 'Nha Trang' },
  { label: 'Kiên Giang', value: 'Rach Gia' },
  { label: 'Kon Tum', value: 'Kon Tum' },
  { label: 'Lai Châu', value: 'Lai Chau' },
  { label: 'Lâm Đồng', value: 'Da Lat' },
  { label: 'Lạng Sơn', value: 'Lang Son' },
  { label: 'Lào Cai', value: 'Lao Cai' },
  { label: 'Long An', value: 'Tan An' },
  { label: 'Nam Định', value: 'Nam Dinh' },
  { label: 'Nghệ An', value: 'Vinh' },
  { label: 'Ninh Bình', value: 'Ninh Binh' },
  { label: 'Ninh Thuận', value: 'Phan Rang' },
  { label: 'Phú Thọ', value: 'Viet Tri' },
  { label: 'Phú Yên', value: 'Tuy Hoa' },
  { label: 'Quảng Bình', value: 'Dong Hoi' },
  { label: 'Quảng Nam', value: 'Tam Ky' },
  { label: 'Quảng Ngãi', value: 'Quang Ngai' },
  { label: 'Quảng Ninh', value: 'Ha Long' },
  { label: 'Quảng Trị', value: 'Dong Ha' },
  { label: 'Sóc Trăng', value: 'Soc Trang' },
  { label: 'Sơn La', value: 'Son La' },
  { label: 'Tây Ninh', value: 'Tay Ninh' },
  { label: 'Thái Bình', value: 'Thai Binh' },
  { label: 'Thái Nguyên', value: 'Thai Nguyen' },
  { label: 'Thanh Hóa', value: 'Thanh Hoa' },
  { label: 'Thừa Thiên Huế', value: 'Hue' },
  { label: 'Tiền Giang', value: 'My Tho' },
  { label: 'Trà Vinh', value: 'Tra Vinh' },
  { label: 'Tuyên Quang', value: 'Tuyen Quang' },
  { label: 'Vĩnh Long', value: 'Vinh Long' },
  { label: 'Vĩnh Phúc', value: 'Vinh Yen' },
  { label: 'Yên Bái', value: 'Yen Bai' },
];

interface TriggerForecastSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (forecastId: number) => void;
}

interface FormFields {
  forecast_month: string;
  event_id: string;
  city: string;
}

interface FieldErrors {
  forecast_month?: string;
  city?: string;
}

// Muc dich: Label dong bo style cho field.
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

// Muc dich: Hien thi loi validate cua field.
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-rose-500">{msg}</p>;
}

// Muc dich: Sheet kich hoat du bao AI.
export function TriggerForecastSheet({ open, onClose, onSuccess }: TriggerForecastSheetProps) {
  const eventsQuery = useAiForecastEvents();
  const triggerMutation = useTriggerForecast();

  const [fields, setFields] = useState<FormFields>({ forecast_month: '', event_id: '', city: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) {
      setFields({ forecast_month: '', event_id: '', city: '' });
      setErrors({});
    }
  }, [open]);

  const handleSubmit = () => {
    const parsed = triggerForecastSchema.safeParse({
      forecast_month: fields.forecast_month,
      event_id: fields.event_id ? Number(fields.event_id) : undefined,
      city: fields.city.trim() || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      parsed.error.issues.forEach((err) => {
        const key = err.path[0] as keyof FieldErrors;
        if (key) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    triggerMutation.mutate(parsed.data, {
      onSuccess: (data) => {
        onSuccess?.(data.summary.forecast_id);
        onClose();
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="flex flex-col overflow-hidden sm:max-w-md">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>Trigger AI Forecast</SheetTitle>
          <SheetDescription>
            Run Gemini AI demand forecasting for a specific month. This may take up to 60 seconds.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          {/* Forecast Month */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>Forecast Month</FieldLabel>
            <input
              type="month"
              value={fields.forecast_month}
              onChange={(e) => setFields((prev) => ({ ...prev, forecast_month: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <FieldError msg={errors.forecast_month} />
          </div>

          {/* Promotion Event */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Promotion Event</FieldLabel>
            <Select
              value={fields.event_id === '' ? '__NONE__' : fields.event_id}
              onValueChange={(v) => setFields((prev) => ({ ...prev, event_id: v === '__NONE__' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No event (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">No event</SelectItem>
                {eventsQuery.data?.map((ev) => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {ev.program_name}
                    {' · '}
                    {new Date(ev.event_month).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Attach a promotion event to adjust demand projections.
            </p>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Tỉnh / Thành phố</FieldLabel>
            <Select
              value={fields.city === '' ? '__NONE__' : fields.city}
              onValueChange={(v) => setFields((prev) => ({ ...prev, city: v === '__NONE__' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn vị trí bạn cần dự báo" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__NONE__">— Chọn thành phố bạn cần dự báo —</SelectItem>
                {VIETNAM_PROVINCES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={errors.city} />
            <p className="text-xs text-slate-500">
              Dùng để lấy dữ liệu thời tiết thực. Để trống sẽ dùng thành phố mặc định của máy chủ.
            </p>
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-800">How it works</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              Gemini AI analyzes previous-month sales, current inventory levels, weather, and any
              promotion events to generate per-product demand forecasts. A fallback average is used
              if the AI is unavailable.
            </p>
          </div>
        </div>

        <SheetFooter className="border-t pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={triggerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={triggerMutation.isPending}
            className="min-w-30"
          >
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running AI…
              </>
            ) : (
              'Run Forecast'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
