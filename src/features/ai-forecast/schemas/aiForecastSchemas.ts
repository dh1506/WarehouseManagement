import { z } from 'zod';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const triggerForecastSchema = z.object({
  forecast_month: z
    .string()
    .min(1, 'Forecast month is required')
    .regex(MONTH_REGEX, 'Must be in YYYY-MM format (e.g. 2025-06)'),
  event_id: z.number().int().positive().optional(),
  city: z.string().trim().max(100).optional(),
});

export const createEventSchema = z.object({
  event_month: z
    .string()
    .min(1, 'Event month is required')
    .regex(MONTH_REGEX, 'Must be in YYYY-MM format'),
  program_name: z.string().min(1, 'Program name is required').max(255),
  promotion_types: z
    .array(z.enum(['DISCOUNT', 'BOGO', 'COMBO', 'GIFT']))
    .min(1, 'Select at least one promotion type'),
  applicable_products: z.string().trim().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  channels: z
    .array(z.enum(['STORE', 'SHOPEE', 'GRABFOOD', 'FACEBOOK', 'ZALO', 'OTHER']))
    .min(1, 'Select at least one channel'),
  expected_target: z.string().trim().optional(),
  estimated_budget: z.preprocess(
    (v) => (!v || v === '' ? undefined : Number(v)),
    z.number().positive('Budget must be a positive number').optional(),
  ),
  notes: z.string().trim().optional(),
});

export const reviewResultSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT'], { message: 'Select an action' }),
    reject_reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'REJECT' && (!data.reject_reason || data.reject_reason.trim().length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason must be at least 10 characters',
        path: ['reject_reason'],
      });
    }
  });

export const updateActualSchema = z.object({
  actual_qty: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Cannot be negative'),
});

export const listFilterSchema = z.object({
  forecast_month: z.string().refine((v) => v === '' || MONTH_REGEX.test(v), {
    message: 'Must be blank or in YYYY-MM format',
  }),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', '']),
});

export type TriggerForecastInput = z.infer<typeof triggerForecastSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type ReviewResultInput = z.infer<typeof reviewResultSchema>;
export type UpdateActualInput = z.infer<typeof updateActualSchema>;
export type ListFilterInput = z.infer<typeof listFilterSchema>;
