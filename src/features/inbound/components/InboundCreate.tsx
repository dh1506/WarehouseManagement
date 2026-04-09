import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inboundFormSchema, type InboundFormSchemaValues } from '../schemas/inboundSchema';
import { useCreateInboundOrder } from '../hooks/useInbound';
import { InboundLineItemEditor } from './InboundLineItemEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MOCK_WAREHOUSES = [
  { id: 'wh-001', name: 'Main Distribution Center' },
  { id: 'wh-002', name: 'East Coast Hub' },
];

const MOCK_SUPPLIERS = [
  { id: 'sup-001', name: 'Nike Vietnam' },
  { id: 'sup-002', name: 'Adidas Supply' },
  { id: 'sup-003', name: 'Generic Supplier Inc' },
];

export function InboundCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateInboundOrder();

  const methods = useForm<InboundFormSchemaValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inboundFormSchema) as any,
    defaultValues: {
      warehouseId: '',
      supplierId: '',
      supplierRef: '',
      expectedDate: '',
      note: '',
      lineItems: [],
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods;

  const onSubmit = (data: InboundFormSchemaValues) => {
    createMutation.mutate(data, {
      onSuccess: () => navigate('/inbound'),
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
            General Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label className="mb-1 block">
                Warehouse <span className="text-red-500">*</span>
              </Label>
              <select
                {...register('warehouseId')}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Select Warehouse --</option>
                {MOCK_WAREHOUSES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.warehouseId && <p className="text-xs text-red-500 mt-1">{errors.warehouseId.message}</p>}
            </div>

            <div>
              <Label className="mb-1 block">Supplier (Optional)</Label>
              <select
                {...register('supplierId')}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- No Supplier --</option>
                {MOCK_SUPPLIERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-1 block">Supplier Reference</Label>
              <Input {...register('supplierRef')} placeholder="E.g. PO-12345" />
            </div>

            <div>
              <Label className="mb-1 block">Expected Date</Label>
              <Input type="date" {...register('expectedDate')} />
            </div>

            <div className="lg:col-span-2">
              <Label className="mb-1 block">Note</Label>
              <Input {...register('note')} placeholder="Add order note..." />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <InboundLineItemEditor />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/inbound')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Receipt'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
