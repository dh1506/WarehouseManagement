import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  createRoleFormSchema,
  ROLE_NAME_OPTIONS,
} from '../schemas/roleSchemas';
import type { Role } from '../types/roleType';

export interface RoleFormValues {
  name: (typeof ROLE_NAME_OPTIONS)[number];
  description?: string;
  isActive: boolean;
}

interface RoleFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoleNames?: readonly string[];
  initialRole?: Role | null;
  isPending?: boolean;
  onSubmit: (data: RoleFormValues) => Promise<void> | void;
}

export function RoleFormDialog({
  mode,
  open,
  onOpenChange,
  availableRoleNames = ROLE_NAME_OPTIONS,
  initialRole,
  isPending = false,
  onSubmit,
}: RoleFormDialogProps) {
  const isCreate = mode === 'create';
  const defaultValues: RoleFormValues = {
    name: (isCreate ? availableRoleNames[0] : initialRole?.name ?? 'CEO') as RoleFormValues['name'],
    description: initialRole?.description ?? '',
    isActive: initialRole?.isActive ?? true,
  };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(createRoleFormSchema) as Resolver<RoleFormValues>,
    defaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(defaultValues);
  }, [defaultValues, form, open]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const isActive = watch('isActive');
  const selectedRoleName = watch('name');

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!isPending ? onOpenChange(nextOpen) : undefined)}>
      <DialogContent className="max-w-md bg-white p-0" showCloseButton={!isPending}>
        <DialogHeader className="border-b border-gray-100 px-5 py-4">
          <DialogTitle>{isCreate ? 'Tạo vai trò mới' : 'Chỉnh sửa vai trò'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Thêm vai trò còn thiếu trong bộ vai trò chuẩn của hệ thống.'
              : 'Chỉnh sửa mô tả và trạng thái hoạt động của vai trò.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id={`role-form-${mode}`}
          onSubmit={handleSubmit(async (values) => onSubmit(values))}
          className="space-y-4 px-5 py-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`role-name-${mode}`}>Tên vai trò</Label>
            {isCreate ? (
              <select
                id={`role-name-${mode}`}
                {...register('name')}
                disabled={isPending || availableRoleNames.length === 0}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                {availableRoleNames.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`role-name-${mode}`}
                value={selectedRoleName}
                disabled
                className="bg-gray-100 text-gray-500"
                readOnly
              />
            )}
            {errors.name?.message ? <p className="text-xs text-red-500">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`role-description-${mode}`}>Mô tả</Label>
            <Textarea
              id={`role-description-${mode}`}
              {...register('description')}
              disabled={isPending}
              placeholder="Mô tả ngắn về phạm vi quyền của vai trò"
              className="min-h-24"
            />
            {errors.description?.message ? (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Trạng thái vai trò</p>
              <p className="text-xs text-gray-500">
                {isActive ? 'Vai trò đang được phép sử dụng trong hệ thống' : 'Vai trò đã bị tắt và sẽ không được sử dụng'}
              </p>
            </div>
            <Switch
              checked={isActive}
              disabled={isPending}
              onCheckedChange={(checked) => setValue('isActive', checked, { shouldDirty: true })}
            />
          </div>
        </form>

        <DialogFooter className="rounded-b-xl border-t border-gray-100 bg-gray-50 px-5 py-4">
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} type="button">
            Huỷ
          </Button>
          <Button
            type="submit"
            form={`role-form-${mode}`}
            disabled={isPending || (isCreate && availableRoleNames.length === 0)}
          >
            {isPending ? 'Đang xử lý...' : isCreate ? 'Tạo vai trò' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
