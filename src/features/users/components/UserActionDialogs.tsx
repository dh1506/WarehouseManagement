import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLockUser, useResetUserPassword } from '../hooks/useUserMutations';
import { getApiErrorMessage, type UserItem } from '@/services/userService';

// ---------------------------------------------------------------------------
// Utility: generate password (same logic as UserFormSheet)
// ---------------------------------------------------------------------------
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%&*';
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [rand(upper), rand(lower), rand(lower), rand(lower), rand(numbers), rand(numbers), rand(specials)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ---------------------------------------------------------------------------
// Zod schema cho reset password
// ---------------------------------------------------------------------------
const resetPwdSchema = z.object({
  newPassword: z
    .string()
    .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    .refine((v) => /[0-9]/.test(v), { message: 'Phải chứa ít nhất 1 chữ số' })
    .refine((v) => /[!@#$%^&*(),.?":{}|<>]/.test(v), { message: 'Phải chứa ít nhất 1 ký tự đặc biệt' }),
});
type ResetPwdForm = z.infer<typeof resetPwdSchema>;

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------
const inputCls = (err?: boolean) =>
  `w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-xl transition-all outline-none
   focus:ring-2 focus:bg-white placeholder:text-gray-400
   ${err ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/20 focus:border-primary/60'}`;

// ============================================================================
// 1. LOCK / UNLOCK DIALOG
// ============================================================================
interface LockUserDialogProps {
  user: UserItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LockUserDialog({ user, onClose, onSuccess }: LockUserDialogProps) {
  const isLocking = user?.status === 'Active'; // true = đang khoá, false = đang mở khoá
  const { mutateAsync, isPending } = useLockUser();
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!user) return;
    try {
      await mutateAsync({
        id: user.id,
        payload: { status: isLocking ? 'Suspended' : 'Active' },
      });
      toast({
        title: isLocking ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
        description: isLocking ? 'Tài khoản đã chuyển sang trạng thái Suspended.' : 'Tài khoản đã chuyển về trạng thái Active.',
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Không thể cập nhật trạng thái tài khoản',
        description: getApiErrorMessage(error, 'Vui lòng kiểm tra quyền thao tác hoặc thử lại sau.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isLocking ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <span className={`material-symbols-outlined text-[22px] ${isLocking ? 'text-yellow-600' : 'text-green-600'}`} data-icon={isLocking ? 'lock' : 'lock_open'}>
                {isLocking ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div>
              <DialogTitle className="text-xs font-bold text-gray-900">
                {isLocking ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {isLocking ? 'Người dùng sẽ không thể đăng nhập' : 'Người dùng có thể đăng nhập trở lại'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Thông tin user */}
        <div className={`rounded-xl p-3.5 border text-sm ${isLocking ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'}`}>
          <p className="font-semibold text-gray-800">{user?.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{user?.email}</p>
          <p className="text-xs mt-1.5 text-gray-600">
            {isLocking
              ? '⚠️ Khoá tài khoản sẽ ngắt phiên đăng nhập hiện tại.'
              : '✅ Tài khoản sẽ khôi phục trạng thái Active.'}
          </p>
        </div>

        <DialogFooter className="-mx-0 -mb-0 border-0 bg-transparent p-0 flex-row justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-all
              ${isPending ? 'bg-gray-400 cursor-not-allowed' : isLocking ? 'bg-yellow-600 hover:bg-yellow-700 hover:shadow-md' : 'bg-green-600 hover:bg-green-700 hover:shadow-md'}`}
          >
            {isPending ? (
              <><span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Đang xử lý...</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]" data-icon={isLocking ? 'lock' : 'lock_open'}>{isLocking ? 'lock' : 'lock_open'}</span>
                {isLocking ? 'Khoá tài khoản' : 'Mở khoá'}</>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. RESET PASSWORD DIALOG
// ============================================================================
interface ResetPasswordDialogProps {
  user: UserItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResetPasswordDialog({ user, onClose, onSuccess }: ResetPasswordDialogProps) {
  const { mutateAsync, isPending } = useResetUserPassword();
  const { toast } = useToast();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ResetPwdForm>({
    resolver: zodResolver(resetPwdSchema),
    mode: 'onTouched',
    defaultValues: { newPassword: '' },
  });

  const pwdValue = watch('newPassword');

  const handleGenerate = () => {
    const pwd = generatePassword();
    setValue('newPassword', pwd, { shouldValidate: true });
    setShowPwd(true);
  };

  const onSubmit = async (data: ResetPwdForm) => {
    if (!user) return;
    try {
      await mutateAsync({ id: user.id, payload: { newPassword: data.newPassword } });
      toast({
        title: 'Đặt lại mật khẩu thành công',
        description: `Mật khẩu của ${user.name} đã được cập nhật.`,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast({
        title: 'Không thể đặt lại mật khẩu',
        description: getApiErrorMessage(error, 'Vui lòng thử lại sau.'),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (isPending) return;
    reset();
    setShowPwd(false);
    onClose();
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
              <span className="material-symbols-outlined text-[22px] text-red-600" data-icon="key">key</span>
            </div>
            <div>
              <DialogTitle className="text-xs font-bold text-gray-900">Đặt lại mật khẩu</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Cập nhật mật khẩu mới cho <span className="font-semibold text-gray-700">{user?.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Mật khẩu mới */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Mật khẩu mới <span className="text-red-500 text-[11px]">*</span>
            </label>
            <div className="relative">
              <input
                {...register('newPassword')}
                type={showPwd ? 'text' : 'password'}
                value={pwdValue}
                placeholder="Tối thiểu 6 ký tự, có số và ký tự đặc biệt"
                disabled={isPending}
                className={inputCls(!!errors.newPassword) + ' pr-20'}
                onChange={(e) => setValue('newPassword', e.target.value, { shouldValidate: true })}
              />
              {/* Toggle hiển thị */}
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                disabled={isPending}
                tabIndex={-1}
                className="absolute inset-y-0 right-9 flex items-center text-gray-400 hover:text-gray-600 transition-colors px-1"
                title={showPwd ? 'Ẩn' : 'Hiện'}
              >
                <span className="material-symbols-outlined text-[18px]" data-icon={showPwd ? 'visibility_off' : 'visibility'}>
                  {showPwd ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              {/* Generate */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors"
                title="Tự động tạo mật khẩu"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="auto_fix_high">auto_fix_high</span>
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]" data-icon="error">error</span>
                {errors.newPassword.message}
              </p>
            )}
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]" data-icon="info">info</span>
              Nhấn ✨ để tự động tạo mật khẩu đủ yêu cầu
            </p>
          </div>
        </form>

        <DialogFooter className="-mx-0 -mb-0 border-0 bg-transparent p-0 flex-row justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit(onSubmit)()}
            disabled={isPending}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-all
              ${isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isPending ? (
              <><span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Đang đặt lại...</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]" data-icon="key">key</span>Đặt lại mật khẩu</>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
