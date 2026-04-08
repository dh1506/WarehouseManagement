import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, updateProfileSchema } from '../schemas/profileSchema';
import type { ChangePasswordFormValues, UpdateProfileFormValues } from '../schemas/profileSchema';

export function UserProfile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser); // to update local state

  // States for password change feedback
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // States for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States for Profile update feedback
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // States for Avatar Upload
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Info Form Setup
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '+84 (0) 90 123 4567',
      address: 'Tầng 15, Keangnam Landmark Tower, Hà Nội',
    },
  });

  const onSubmitProfile = async (data: UpdateProfileFormValues) => {
    setProfileSuccess(null);
    setIsUpdatingProfile(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateUser({ name: data.name, email: data.email });
      setProfileSuccess('Cập nhật thông tin thành công!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password Form Setup
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Handle Avatar Click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Handle File Change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh dung lượng dưới 5MB.');
      return;
    }

    setIsUploadingAvatar(true);

    // Đọc URL base64 tạm thời (MOCK UPLOAD B2 BACKBLAZE)
    // Thực tế: Lấy Presigned URL -> PUT qua Axios -> Lấy URL ảnh gán về state.
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;

        // Cập nhật Auth Store (mock)
        if (user) {
          updateUser({ avatar: base64Url });
        }
        setIsUploadingAvatar(false);
      };
      // Giả lập delay mạng tải ảnh
      setTimeout(() => {
        reader.readAsDataURL(file);
      }, 1000);

    } catch (err) {
      console.error(err);
      setIsUploadingAvatar(false);
      alert('Tải ảnh thất bại, vui lòng thử lại.');
    }
  };

  // Mock API Call for Password Change
  const onSubmitPassword = async (data: ChangePasswordFormValues) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    setIsChangingPassword(true);

    try {
      // Giả lập thời gian call API
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Mock validation: Giả dụ mật khẩu hiện tại CỦA MỌI USER LÀ "admin123" để test
          if (data.currentPassword !== 'admin123') {
            reject(new Error('INVALID_PASSWORD'));
          } else {
            resolve(true);
          }
        }, 800);
      });

      setPasswordSuccess('Đổi mật khẩu thành công! Hãy lưu lại mật khẩu mới.');
      reset(); // Xoá form
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'INVALID_PASSWORD') {
          setError('currentPassword', {
            type: 'manual',
            message: 'Mật khẩu hiện tại không chính xác.',
          });
        } else {
          setPasswordError(err.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
        }
      } else {
        setPasswordError('Có lỗi xảy ra khi đổi mật khẩu.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfe]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* ── Page Header ── */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              aria-label="Quay lại"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="text-sm md:text-xs font-bold text-gray-900 tracking-tight">Quản lý tài khoản</h1>
          </div>
          <p className="text-gray-500 ml-1 sm:ml-[52px]">Cập nhật thông tin cá nhân và thiết lập bảo mật của bạn.</p>
        </div>

        {/* ── Grid Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── Left Column: User Profile Card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow duration-300 group">

              {/* Profile Image & Badge */}
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-primary/5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 relative">
                  {isUploadingAvatar ? (
                    <span className="material-symbols-outlined text-lg sm:text-xl text-primary animate-spin">progress_activity</span>
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-lg sm:text-xl text-primary/30" style={{ fontVariationSettings: "'FILL' 1" }}>
                      person
                    </span>
                  )}
                </div>

                {/* Nút Upload Avatar */}
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  aria-label="Đổi hình đại diện"
                  title="Tải ảnh lên hoặc chụp ảnh mới"
                  className={`absolute bottom-1 right-1 bg-primary text-white rounded-full p-2.5 border-2 border-white hover:bg-[#00307a] transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                </button>

                {/* Hidden Input File - hỗ trợ capture camera trên mobile */}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* User Name & Title */}
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 truncate">
                {user?.name || 'Chưa cung cấp tên'}
              </h2>
              <span className="inline-block bg-primary/10 text-primary text-xs sm:text-sm px-4 py-1.5 rounded-full font-semibold mb-6 tracking-wide">
                {user?.role || 'Vị trí chưa xác định'}
              </span>

              <hr className="border-gray-100 mb-6" />

              {/* User Details */}
              <div className="text-left space-y-5">
                <div className="group/item">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover/item:text-primary transition-colors">
                    ID Hệ Thống
                  </p>
                  <p className="font-medium text-gray-900 truncate">{user?.id || '—'}</p>
                </div>
                <div className="group/item">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover/item:text-primary transition-colors">
                    Quyền Hạn (Permissions)
                  </p>
                  <p className="font-medium text-gray-900 truncate">
                    {user?.permissions?.length ? user.permissions.join(', ') : 'Cơ bản'}
                  </p>
                </div>
                <div className="group/item">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover/item:text-primary transition-colors">
                    Trạng thái
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <p className="font-medium text-gray-900">Đang hoạt động</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Forms ── */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-4">

            {/* ── Personal Info Form ── */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
                <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">person_outline</span>
                </div>
                <h3 className="text-sm sm:text-xs font-bold text-gray-900 tracking-tight">Thông tin cá nhân</h3>
              </div>

              <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="space-y-2 sm:space-y-3">
                {profileSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl font-medium flex items-center gap-2 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                    {profileSuccess}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Họ và tên
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...registerProfile('name')}
                    className={`w-full bg-gray-50 hover:bg-gray-100 border rounded-xl px-4 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:ring-2 outline-none transition-all duration-200 ${profileErrors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'
                      }`}
                  />
                  {profileErrors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{profileErrors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Địa chỉ email
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...registerProfile('email')}
                      className={`w-full bg-gray-50 hover:bg-gray-100 border rounded-xl px-4 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:ring-2 outline-none transition-all duration-200 ${profileErrors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'
                        }`}
                    />
                    {profileErrors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{profileErrors.email.message}</p>}
                  </div>
                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Số điện thoại
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      {...registerProfile('phone')}
                      className="w-full bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl px-4 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Work Address */}
                <div>
                  <label htmlFor="address" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Địa chỉ làm việc
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...registerProfile('address')}
                    className="w-full bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl px-4 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile || isUpdatingProfile}
                    className={`w-full sm:w-auto bg-primary text-white font-bold py-3 sm:py-2.5 px-6 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center justify-center gap-2 ${isSubmittingProfile || isUpdatingProfile
                      ? 'opacity-80 cursor-not-allowed'
                      : 'hover:bg-[#00307a] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                  >
                    {(isSubmittingProfile || isUpdatingProfile) ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Security & Password Form ── */}
            <div className="bg-white rounded-2xl p-2 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 mb-6 lg:mb-0">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-2">
                <div className="bg-red-50 text-red-500 p-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">security</span>
                </div>
                <h3 className="text-sm sm:text-xs font-bold text-gray-900 tracking-tight">Bảo mật & Đổi mật khẩu</h3>
              </div>

              <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5 sm:space-y-6">

                {/* Thông báo trạng thái */}
                {passwordSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl font-medium flex items-center gap-2 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl font-medium flex items-center gap-2 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
                    {passwordError}
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu hiện tại..."
                      {...register('currentPassword')}
                      className={`w-full bg-gray-50 hover:bg-gray-100 border rounded-xl pl-4 pr-12 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:ring-2 outline-none transition-all duration-200 ${errors.currentPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showCurrentPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {errors.currentPassword && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.currentPassword.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Mật khẩu mới..."
                        {...register('newPassword')}
                        className={`w-full bg-gray-50 hover:bg-gray-100 border rounded-xl pl-4 pr-12 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:ring-2 outline-none transition-all duration-200 ${errors.newPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showNewPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {errors.newPassword && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.newPassword.message}</p>}
                  </div>
                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu mới..."
                        {...register('confirmPassword')}
                        className={`w-full bg-gray-50 hover:bg-gray-100 border rounded-xl pl-4 pr-12 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:ring-2 outline-none transition-all duration-200 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || isChangingPassword}
                    className={`w-full sm:w-auto bg-gray-900 text-white font-bold py-3 sm:py-2.5 px-6 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center justify-center gap-2 ${isSubmitting || isChangingPassword
                      ? 'opacity-80 cursor-not-allowed'
                      : 'hover:bg-black hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                  >
                    {(isSubmitting || isChangingPassword) ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật mật khẩu'
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

