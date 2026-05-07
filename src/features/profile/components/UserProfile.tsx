import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useUiStore, type Locale } from '@/store/uiStore';
import i18n from '@/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, updateProfileSchema } from '../schemas/profileSchema';
import type { ChangePasswordFormValues, UpdateProfileFormValues } from '../schemas/profileSchema';

// ── Language Selector Card ─────────────────────────────────────────────────────

function LanguageCard() {
  const { t } = useTranslation();
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);
  const [saved, setSaved] = useState(false);

  const handleSelect = (lang: Locale) => {
    if (lang === locale) return;
    setLocale(lang);
    i18n.changeLanguage(lang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const options: { lang: Locale; flag: string; label: string }[] = [
    { lang: 'vi', flag: '🇻🇳', label: t('profile.vietnamese') },
    { lang: 'en', flag: '🇬🇧', label: t('profile.english') },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center space-x-3 mb-5 border-b border-gray-100 pb-4">
        <div className="bg-indigo-50 text-indigo-500 p-2.5 rounded-xl">
          <span className="material-symbols-outlined text-[20px]">language</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            {t('profile.language')}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{t('profile.languageSubtitle')}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {options.map(({ lang, flag, label }) => {
          const isActive = locale === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleSelect(lang)}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl leading-none">{flag}</span>
              <span>{label}</span>
              {isActive && (
                <span className="material-symbols-outlined text-[16px] text-indigo-500 ml-auto">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>

      {saved && (
        <p className="mt-3 text-xs font-medium text-indigo-600 flex items-center gap-1.5 animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-[14px]">check</span>
          {t('profile.languageSaved')}
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function UserProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setProfileSuccess(t('profile.updateSuccess'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t('profile.avatarSizeError'));
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (user) updateUser({ avatar: reader.result as string });
        setIsUploadingAvatar(false);
      };
      setTimeout(() => reader.readAsDataURL(file), 1000);
    } catch (err) {
      console.error(err);
      setIsUploadingAvatar(false);
      alert(t('profile.avatarUploadError'));
    }
  };

  const onSubmitPassword = async (data: ChangePasswordFormValues) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    setIsChangingPassword(true);
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (data.currentPassword !== 'admin123') reject(new Error('INVALID_PASSWORD'));
          else resolve(true);
        }, 800);
      });
      setPasswordSuccess(t('profile.passwordSuccess'));
      reset();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_PASSWORD') {
        setError('currentPassword', { type: 'manual', message: t('profile.passwordWrongCurrent') });
      } else {
        setPasswordError(t('profile.passwordError'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const inputBase =
    'w-full bg-gray-50 hover:bg-gray-100 border rounded-xl px-4 py-3 sm:py-3.5 text-sm text-gray-900 focus:bg-white focus:ring-2 outline-none transition-all duration-200';

  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfe]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              aria-label={t('common.back')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="text-sm md:text-xs font-bold text-gray-900 tracking-tight">
              {t('profile.pageTitle')}
            </h1>
          </div>
          <p className="text-gray-500 ml-1 sm:ml-[52px]">{t('profile.pageSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── Left Column: Profile Card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow duration-300 group">

              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-primary/5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 relative">
                  {isUploadingAvatar ? (
                    <span className="material-symbols-outlined text-lg text-primary animate-spin">progress_activity</span>
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-lg text-primary/30" style={{ fontVariationSettings: "'FILL' 1" }}>
                      person
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  aria-label={t('profile.changeAvatar')}
                  title={t('profile.changeAvatar')}
                  className={`absolute bottom-1 right-1 bg-primary text-white rounded-full p-2.5 border-2 border-white hover:bg-[#00307a] transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                </button>
                <input type="file" accept="image/*" capture="user" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </div>

              <h2 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 truncate">
                {user?.name || t('profile.noName')}
              </h2>
              <span className="inline-block bg-primary/10 text-primary text-xs sm:text-sm px-4 py-1.5 rounded-full font-semibold mb-6 tracking-wide">
                {user?.role || t('profile.noRole')}
              </span>

              <hr className="border-gray-100 mb-6" />

              <div className="text-left space-y-5">
                <div className="group/item">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover/item:text-primary transition-colors">
                    {t('profile.systemId')}
                  </p>
                  <p className="font-medium text-gray-900 truncate">{user?.id || '—'}</p>
                </div>
                <div className="group/item">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover/item:text-primary transition-colors">
                    {t('profile.permissions')}
                  </p>
                  <p className="font-medium text-gray-900 truncate">
                    {user?.permissions?.length ? user.permissions.join(', ') : t('profile.noPermissions')}
                  </p>
                </div>
                <div className="group/item">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover/item:text-primary transition-colors">
                    {t('profile.status')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <p className="font-medium text-gray-900">{t('profile.active')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Forms ── */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-4">

            {/* Personal Info */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
                <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">person_outline</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">{t('profile.personalInfo')}</h3>
              </div>

              <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="space-y-2 sm:space-y-3">
                {profileSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl font-medium flex items-center gap-2 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                    {profileSuccess}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t('profile.fullName')}
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...registerProfile('name')}
                    className={`${inputBase} ${profileErrors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'}`}
                  />
                  {profileErrors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{profileErrors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t('profile.emailAddress')}
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...registerProfile('email')}
                      className={`${inputBase} ${profileErrors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'}`}
                    />
                    {profileErrors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{profileErrors.email.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t('profile.phoneNumber')}
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      {...registerProfile('phone')}
                      className={`${inputBase} border-transparent focus:border-primary focus:ring-primary/20`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t('profile.workAddress')}
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...registerProfile('address')}
                    className={`${inputBase} border-transparent focus:border-primary focus:ring-primary/20`}
                  />
                </div>

                <div className="flex justify-end pt-2 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile || isUpdatingProfile}
                    className={`w-full sm:w-auto bg-primary text-white font-bold py-3 sm:py-2.5 px-6 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center justify-center gap-2 ${isSubmittingProfile || isUpdatingProfile ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#00307a] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}`}
                  >
                    {isSubmittingProfile || isUpdatingProfile ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        {t('profile.saving')}
                      </>
                    ) : (
                      t('profile.saveChanges')
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Language Selector */}
            <LanguageCard />

            {/* Security / Change Password */}
            <div className="bg-white rounded-2xl p-2 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 mb-6 lg:mb-0">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-2">
                <div className="bg-red-50 text-red-500 p-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">security</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">{t('profile.security')}</h3>
              </div>

              <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5 sm:space-y-6">
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

                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t('profile.currentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder={t('profile.currentPasswordPlaceholder')}
                      {...register('currentPassword')}
                      className={`${inputBase} pl-4 pr-12 ${errors.currentPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'}`}
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                      <span className="material-symbols-outlined text-[20px]">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.currentPassword && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.currentPassword.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label htmlFor="newPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t('profile.newPassword')}
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder={t('profile.newPasswordPlaceholder')}
                        {...register('newPassword')}
                        className={`${inputBase} pl-4 pr-12 ${errors.newPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'}`}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[20px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {errors.newPassword && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.newPassword.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t('profile.confirmPassword')}
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('profile.confirmPasswordPlaceholder')}
                        {...register('confirmPassword')}
                        className={`${inputBase} pl-4 pr-12 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-transparent focus:border-primary focus:ring-primary/20'}`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-2 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || isChangingPassword}
                    className={`w-full sm:w-auto bg-gray-900 text-white font-bold py-3 sm:py-2.5 px-6 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center justify-center gap-2 ${isSubmitting || isChangingPassword ? 'opacity-80 cursor-not-allowed' : 'hover:bg-black hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}`}
                  >
                    {isSubmitting || isChangingPassword ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        {t('profile.updatingPassword')}
                      </>
                    ) : (
                      t('profile.updatePassword')
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
