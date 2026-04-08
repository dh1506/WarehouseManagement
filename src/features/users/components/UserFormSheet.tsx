import { useEffect, useState } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '../schemas/userSchema';
import { useCreateUser, useUpdateUser } from '../hooks/useUserMutations';
import { useUserRoleOptions } from '../hooks/useUsers';
import { getApiErrorMessage, type UserItem } from '@/services/userService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface UserFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** Nếu có editUser → chế độ Update, không có → chế độ Create */
  editUser?: UserItem | null;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Utility: generate password thoả schema (min 6, có số, có ký tự đặc biệt)
// ---------------------------------------------------------------------------
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%&*';

  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];

  // Đảm bảo đủ yêu cầu rồi shuffle
  const chars = [
    rand(upper),
    rand(lower),
    rand(lower),
    rand(lower),
    rand(numbers),
    rand(numbers),
    rand(specials),
  ];
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ---------------------------------------------------------------------------
// Helper: Field wrapper
// ---------------------------------------------------------------------------
function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 text-[11px]">*</span>}
        {!required && <span className="text-gray-400 text-[11px] font-normal">(tuỳ chọn)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]" data-icon="info">info</span>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="material-symbols-outlined text-[13px]" data-icon="error">error</span>
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input styles
// ---------------------------------------------------------------------------
const inputCls = (hasError?: boolean) =>
  [
    'w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-xl transition-all duration-150 outline-none',
    'focus:ring-2 focus:bg-white placeholder:text-gray-400',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-200 focus:ring-primary/20 focus:border-primary/60',
  ].join(' ');

const selectCls = (hasError?: boolean) =>
  [
    'w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-xl transition-all duration-150 outline-none',
    'focus:ring-2 focus:bg-white cursor-pointer appearance-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-200 focus:ring-primary/20 focus:border-primary/60',
  ].join(' ');

// ---------------------------------------------------------------------------
// Password Input với toggle + generate button
// ---------------------------------------------------------------------------
function PasswordFieldInput({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  hasError,
  onGenerate,
}: {
  value?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  name: string;
  disabled?: boolean;
  hasError?: boolean;
  onGenerate: (pwd: string) => void;
}) {
  const [show, setShow] = useState(false);

  const handleGenerate = () => {
    const pwd = generatePassword();
    onGenerate(pwd);
    setShow(true); // Hiển thị để user thấy mật khẩu được tạo
  };

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        type={show ? 'text' : 'password'}
        disabled={disabled}
        placeholder="Tối thiểu 6 ký tự, có số và ký tự đặc biệt"
        className={inputCls(hasError) + ' pr-20'}
      />
      {/* Toggle hiển thị mật khẩu */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-9 flex items-center text-gray-400 hover:text-gray-600 transition-colors px-1"
        tabIndex={-1}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        <span className="material-symbols-outlined text-[18px]" data-icon={show ? 'visibility_off' : 'visibility'}>
          {show ? 'visibility_off' : 'visibility'}
        </span>
      </button>
      {/* Generate button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleGenerate}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors"
        tabIndex={-1}
        title="Tự động tạo mật khẩu"
      >
        <span className="material-symbols-outlined text-[18px]" data-icon="auto_fix_high">auto_fix_high</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function UserFormSheet({ open, onClose, editUser, onSuccess }: UserFormSheetProps) {
  const isEdit = !!editUser;
  const roleOptionsQuery = useUserRoleOptions();
  const { toast } = useToast();

  const { mutateAsync: createMutate, isPending: isCreating } = useCreateUser();
  const { mutateAsync: updateMutate, isPending: isUpdating } = useUpdateUser();
  const isPending = isCreating || isUpdating;

  // Tách riêng 2 form instance cho từng mode để tránh conflict type schema
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
  });

  const updateForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    mode: 'onTouched',
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, control: createControl, formState: { errors: createErrors } } = createForm;
  const { register: regUpdate, handleSubmit: handleUpdate, reset: resetUpdate, formState: { errors: updateErrors } } = updateForm;

  // useController cho password — tránh conflict controlled/uncontrolled
  const { field: passwordField } = useController({
    name: 'password',
    control: createControl,
    defaultValue: '',
  });

  // Reset form khi đổi mode hoặc mở lại
  useEffect(() => {
    if (!open) return;
    if (editUser) {
      resetUpdate({
        fullName: editUser.fullName,
        email: editUser.email ?? '',
        phone: editUser.phone ?? '',
        role: editUser.roleId,
      });
    } else {
      resetCreate({ fullName: '', username: '', email: '', phone: '', password: '', role: undefined });
    }
  }, [open, editUser, resetCreate, resetUpdate]);

  const [globalError, setGlobalError] = useState<string | null>(null);

  // Submit create
  const onSubmitCreate = async (data: CreateUserFormData) => {
    setGlobalError(null);
    try {
      const result = await createMutate({
        username: data.username,
        fullName: data.fullName,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        roleId: data.role,
        password: data.password,
      });
      toast({
        title: 'Tạo người dùng thành công',
        description: `${result.fullName} đã được thêm vào hệ thống.`,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      setGlobalError(getApiErrorMessage(error, 'Có lỗi xảy ra. Vui lòng thử lại.'));
    }
  };

  // Submit update
  const onSubmitUpdate = async (data: UpdateUserFormData) => {
    if (!editUser) return;
    setGlobalError(null);
    try {
      const result = await updateMutate({
        id: editUser.id,
        payload: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          roleId: data.role,
        },
      });
      toast({
        title: 'Cập nhật thành công',
        description: `Thông tin của ${result.fullName} đã được lưu.`,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      setGlobalError(getApiErrorMessage(error, 'Có lỗi xảy ra. Vui lòng thử lại.'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      <SheetContent
        side="right"
        // Tăng duration và dùng easing spring-like để animation mượt hơn
        className="w-full sm:max-w-[420px] flex flex-col p-0 gap-0 bg-white shadow-2xl
          [&[data-state=open]]:!duration-300 [&[data-state=open]]:[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
          [&[data-state=closed]]:!duration-250 [&[data-state=closed]]:[transition-timing-function:cubic-bezier(0.4,0,1,1)]"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex-none border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isEdit ? 'bg-blue-50' : 'bg-primary/10'}`}>
                <span className={`material-symbols-outlined text-[20px] ${isEdit ? 'text-blue-600' : 'text-primary'}`} data-icon={isEdit ? 'manage_accounts' : 'person_add'}>
                  {isEdit ? 'manage_accounts' : 'person_add'}
                </span>
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-gray-900">
                  {isEdit ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
                </SheetTitle>
                <SheetDescription className="text-xs text-gray-500 mt-0.5">
                  {isEdit ? `Chỉnh sửa thông tin cho ${editUser?.name}` : 'Điền thông tin để tạo tài khoản'}
                </SheetDescription>
              </div>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="close">close</span>
            </button>
          </div>
        </SheetHeader>

        {/* ================================================================
            FORM CREATE
        ================================================================ */}
        {!isEdit && (
          <form
            id="user-form-create"
            onSubmit={handleCreate(onSubmitCreate)}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          >
            {globalError && <GlobalError message={globalError} />}

            {/* Thông tin cá nhân */}
            <SectionLabel>Thông tin cá nhân</SectionLabel>

            <FormField label="Họ và tên" required error={createErrors.fullName?.message}>
              <input {...regCreate('fullName')} placeholder="Nguyễn Văn A" disabled={isPending} className={inputCls(!!createErrors.fullName)} />
            </FormField>

            <div className="grid grid-cols-1 gap-3">
              <FormField label="Vai trò" required error={createErrors.role?.message}>
                <div className="relative">
                  <select {...regCreate('role')} disabled={isPending} className={selectCls(!!createErrors.role)}>
                    <option value="">Chọn...</option>
                    {(roleOptionsQuery.data ?? []).map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </FormField>
            </div>

            <div className="border-t border-gray-100" />

            {/* Thông tin tài khoản */}
            <SectionLabel>Thông tin tài khoản</SectionLabel>

            <FormField label="Tên đăng nhập" required error={createErrors.username?.message}>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]" data-icon="person">person</span>
                <input {...regCreate('username')} placeholder="username_ít_nhất_5_ký_tự" disabled={isPending} className={inputCls(!!createErrors.username) + ' pl-9'} />
              </div>
            </FormField>

            <FormField label="Email" error={createErrors.email?.message}>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]" data-icon="mail">mail</span>
                <input {...regCreate('email')} type="email" placeholder="email@warehouse.dev" disabled={isPending} className={inputCls(!!createErrors.email) + ' pl-9'} />
              </div>
            </FormField>

            <FormField label="Số điện thoại" error={createErrors.phone?.message}>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]" data-icon="call">call</span>
                <input {...regCreate('phone')} type="tel" placeholder="09xxxxxxxx hoặc +849xxxxxxxx" disabled={isPending} className={inputCls(!!createErrors.phone) + ' pl-9'} />
              </div>
            </FormField>

            <FormField
              label="Mật khẩu"
              required
              hint="Nhấn ✨ để tự động tạo mật khẩu"
              error={createErrors.password?.message}
            >
              <PasswordFieldInput
                value={passwordField.value ?? ''}
                onChange={passwordField.onChange}
                onBlur={passwordField.onBlur}
                name={passwordField.name}
                disabled={isPending}
                hasError={!!createErrors.password}
                onGenerate={(pwd) => {
                  passwordField.onChange(pwd);
                  // Trigger validate sau khi set
                  createForm.trigger('password');
                }}
              />
            </FormField>
          </form>
        )}

        {/* ================================================================
            FORM UPDATE
        ================================================================ */}
        {isEdit && (
          <form
            id="user-form-update"
            onSubmit={handleUpdate(onSubmitUpdate)}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          >
            {globalError && <GlobalError message={globalError} />}

            <SectionLabel>Thông tin cá nhân</SectionLabel>

            <FormField label="Họ và tên" required error={updateErrors.fullName?.message}>
              <input {...regUpdate('fullName')} placeholder="Nguyễn Văn A" disabled={isPending} className={inputCls(!!updateErrors.fullName)} />
            </FormField>

            <div className="grid grid-cols-1 gap-3">
              <FormField label="Vai trò" required error={updateErrors.role?.message}>
                <div className="relative">
                  <select {...regUpdate('role')} disabled={isPending} className={selectCls(!!updateErrors.role)}>
                    <option value="">Chọn...</option>
                    {(roleOptionsQuery.data ?? []).map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </FormField>
            </div>

            <div className="border-t border-gray-100" />

            <SectionLabel>Thông tin tài khoản</SectionLabel>

            <FormField label="Email" error={updateErrors.email?.message}>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]" data-icon="mail">mail</span>
                <input {...regUpdate('email')} type="email" placeholder="email@warehouse.dev" disabled={isPending} className={inputCls(!!updateErrors.email) + ' pl-9'} />
              </div>
            </FormField>

            <FormField label="Số điện thoại" error={updateErrors.phone?.message}>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]" data-icon="call">call</span>
                <input {...regUpdate('phone')} type="tel" placeholder="09xxxxxxxx hoặc +849xxxxxxxx" disabled={isPending} className={inputCls(!!updateErrors.phone) + ' pl-9'} />
              </div>
            </FormField>
          </form>
        )}

        {/* Footer */}
        <SheetFooter className="flex-none border-t border-gray-100 px-6 py-3.5 flex flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Huỷ
          </button>
          <button
            type="submit"
            form={isEdit ? 'user-form-update' : 'user-form-create'}
            disabled={isPending}
            className={[
              'px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-all',
              isPending
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-blue-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
            ].join(' ')}
          >
            {isPending ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                {isEdit ? 'Đang lưu...' : 'Đang tạo...'}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]" data-icon={isEdit ? 'save' : 'person_add'}>
                  {isEdit ? 'save' : 'person_add'}
                </span>
                {isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
              </>
            )}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Micro-components nội bộ
// ---------------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{children}</p>;
}

function GlobalError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
      <span className="material-symbols-outlined text-[18px]" data-icon="error">error</span>
      {message}
    </div>
  );
}

function ChevronIcon() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
      <span className="material-symbols-outlined text-[16px]" data-icon="expand_more">expand_more</span>
    </span>
  );
}
