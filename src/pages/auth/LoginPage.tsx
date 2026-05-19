import { LoginForm } from '@/features/auth/components/LoginForm';

// Muc dich: Trang dang nhap he thong.
export function LoginPage() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex items-center justify-center overflow-hidden">
      {/* Khung bố cục đăng nhập */}
      <div className="flex w-full h-screen">
        {/* Bên trái: khối thương hiệu hình ảnh */}
        <div className="hidden lg:flex lg:w-3/5 xl:w-2/3 relative overflow-hidden bg-primary">
          {/* Ảnh nền */}
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
              alt="expansive modern warehouse interior with high shelving units, automated sorting systems, and soft cool blue industrial lighting"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmrHOGhpQISoKui4wOinmO3oBvVYaaulpsuv9xdUF5u_ydst4L23jF6wvF2kjsyp0TIaH5cfLMHC3bkFI9wSrL7DHLzr-NWinqlr7NqP6Q2GOlxivmcDFdYmSutsCQ1YLtZc5ZcS2dBEAE6ducCtpYTBAbzsZ84Em5ci5zN8FVwRDm6Vi1gDlu03PBe2m5j1pF40w7jKb1qgCQ0Rb8K7FD1Y6I8eg0CKhZERqOUo6JxsBynD-TjqyDa6-iSjyfRrSF1BFCdLlfaOs"
            />
          </div>
          {/* Lớp phủ gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/40 to-transparent z-10"></div>

          {/* Nội dung overlay */}
          <div className="relative z-20 flex flex-col justify-between p-16 w-full h-full">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-secondary-container rounded-lg flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-primary" data-icon="auto_awesome">
                    auto_awesome
                  </span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-white">WMS Enterprise</span>
              </div>
              <div className="max-w-xl">
                <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
                  Quản lý <br />
                  <span className="text-secondary-fixed">Kho hàng</span>
                </h1>
                <p className="text-on-primary-container text-lg leading-relaxed opacity-90 font-medium">
                  Hệ thống quản lý kho thông minh, tích hợp dự báo AI theo thời gian thực
                  giúp tối ưu hoá toàn bộ quy trình vận hành.
                </p>
              </div>
            </div>

            {/* Chỉ số nổi bật AI */}
            <div className="flex gap-6">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-xl w-64">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary-container text-sm" data-icon="bolt">
                    bolt
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-on-primary-container">
                    Hiệu suất hoạt động
                  </span>
                </div>
                <div className="text-3xl font-bold text-white">+24.8%</div>
                <div className="text-xs text-secondary-fixed mt-1">Tối ưu hoá bởi AI</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-xl w-64">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary-container text-sm" data-icon="query_stats">
                    query_stats
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-on-primary-container">
                    Độ chính xác dự báo
                  </span>
                </div>
                <div className="text-3xl font-bold text-white">99.2%</div>
                <div className="text-xs text-secondary-fixed mt-1">Phân tích thời gian thực</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bên phải: giao diện đăng nhập */}
        <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col p-8 md:p-12 lg:p-16 bg-surface h-screen">
          <div className="w-full max-w-md mx-auto flex flex-col h-full flex-1">
            {/* Thương hiệu trên mobile (ẩn trên desktop) */}
            <div className="lg:hidden flex items-center gap-2 mb-10 flex-none">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm" data-icon="auto_awesome">
                  auto_awesome
                </span>
              </div>
              <span className="text-xl font-bold text-primary">WMS Enterprise</span>
            </div>

            {/* Form đăng nhập */}
            <LoginForm />

            {/* Liên kết cuối trang */}
            <div className="mt-4 pt-8 border-t border-outline-variant/15 text-center flex-none">
              <p className="text-sm text-on-surface-variant">
                Chỉ dành cho nhân sự được uỷ quyền. <br />
                <span className="text-xs opacity-60 mt-2 block italic">WMS Enterprise AI v4.2.0 • Cổng bảo mật</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
