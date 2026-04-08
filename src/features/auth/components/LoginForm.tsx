import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '../schema/loginSchema';
import { useLogin } from '../hooks/useLogin';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  const { mutateAsync: loginMutation } = useLogin();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setGlobalError(null);
      await loginMutation(data);
      navigate('/');
    } catch (error) {
      setGlobalError('Tài khoản hoặc mật khẩu không đúng hoặc chưa tồn tại.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col h-full flex-1">
      <div className="flex-none">
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight mb-2">Welcome Back</h2>
          <p className="text-on-surface-variant font-medium">
            Please enter your credentials to access the Predictive Architect dashboard.
          </p>
        </div>

        {globalError && (
          <div className="w-full bg-error-container text-on-error-container text-sm font-semibold p-3 rounded-lg border border-error/20 flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="material-symbols-outlined text-[20px]" data-icon="error">error</span>
            <span>{globalError}</span>
          </div>
        )}
      </div>

      {/* Khối đệm lò xo đẩy cụm form xuống dưới */}
      <div className="flex-1"></div>

      {/* Form Fields & Submit */}
      <div className="space-y-4 flex-none pb-4">
        {/* Username Field */}
        <div className="space-y-2 relative pb-5">
          <label className="text-sm font-bold text-on-surface-variant block" htmlFor="username">
            Username
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span
                className={`material-symbols-outlined transition-colors ${errors.username ? 'text-error' : 'text-outline group-focus-within:text-primary'}`}
                data-icon="person"
              >
                person
              </span>
            </div>
            <input
              {...register('username')}
              className={`block w-full pl-11 pr-4 py-3.5 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline-variant font-medium ${errors.username ? '!border-error !focus:ring-error/20' : ''}`}
              id="username"
              name="username"
              placeholder="director_smith"
              type="text"
              disabled={isSubmitting}
            />
          </div>
          {/* Absolute Error để không bị xê dịch layout */}
          {errors.username?.message && (
            <p className="text-error text-xs font-semibold absolute bottom-0 left-0">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2 relative pb-5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-on-surface-variant block" htmlFor="password">
              Password
            </label>
            <a className="text-xs font-bold text-primary hover:text-primary-container transition-colors" href="#">
              Forgot Password?
            </a>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span
                className={`material-symbols-outlined transition-colors ${errors.password ? 'text-error' : 'text-outline group-focus-within:text-primary'}`}
                data-icon="lock"
              >
                lock
              </span>
            </div>
            <input
              {...register('password')}
              className={`block w-full pl-11 pr-12 py-3.5 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline-variant font-medium ${errors.password ? '!border-error !focus:ring-error/20' : ''}`}
              id="password"
              name="password"
              placeholder="••••••••••••"
              type={showPassword ? "text" : "password"}
              disabled={isSubmitting}
            />
            <button
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface transition-colors"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined" data-icon={showPassword ? "visibility_off" : "visibility"}>
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {/* Absolute Error */}
          {errors.password?.message && (
            <p className="text-error text-xs font-semibold absolute bottom-0 left-0">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center pb-2">
          <input
            className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary/20 bg-surface-container-low cursor-pointer disabled:opacity-50"
            id="remember-me"
            name="remember-me"
            type="checkbox"
            disabled={isSubmitting}
          />
          <label className="ml-3 block text-sm font-semibold text-on-surface-variant cursor-pointer" htmlFor="remember-me">
            Keep me signed in for 30 days
          </label>
        </div>

      </div>

      {/* Login Button */}
      <button
        className={`w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-xs font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isSubmitting ? 'bg-outline opacity-70 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-container hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]'
          }`}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
        ) : (
          <>
            Sign In to Dashboard
            <span className="material-symbols-outlined ml-2 text-xs" data-icon="arrow_forward">
              arrow_forward
            </span>
          </>
        )}
      </button>
    </form>
  );
}
