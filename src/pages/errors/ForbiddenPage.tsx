import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden relative">
      {/* Subtle Background Element */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-container rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-fixed rounded-full blur-[120px]"></div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 lg:gap-24">
        {/* Illustration Side */}
        <div className="w-full md:w-1/2 flex justify-center order-1 md:order-2">
          <div className="relative w-full max-w-md aspect-square bg-surface-container-lowest rounded-xl shadow-xl shadow-gray-200/50 p-8 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>

            {/* Professional Error Visual */}
            <div className="relative flex flex-col items-center">
              <div className="w-48 h-48 mb-8 relative">
                {/* Simulated Enterprise Shield/Lock Graphic */}
                <div className="absolute inset-0 border-4 border-outline-variant/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                <div className="absolute inset-4 border-4 border-primary/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[100px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    lock_person
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-8 bg-primary rounded-full"></div>
                <div className="h-2 w-16 bg-outline-variant/30 rounded-full"></div>
                <div className="h-2 w-8 bg-outline-variant/30 rounded-full"></div>
              </div>
            </div>

            {/* Abstract Data Elements */}
            <div className="absolute top-8 right-8 bg-secondary-container/20 p-3 rounded-lg backdrop-blur-sm">
              <span className="material-symbols-outlined text-secondary">admin_panel_settings</span>
            </div>
            <div className="absolute bottom-12 left-8 bg-tertiary-fixed/30 p-3 rounded-lg backdrop-blur-sm">
              <span className="material-symbols-outlined text-tertiary">vpn_key</span>
            </div>
          </div>
        </div>

        {/* Text Content Side */}
        <div className="w-full md:w-1/2 text-center md:text-left order-2 md:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error-container/50 text-on-error-container text-xs font-bold tracking-widest uppercase mb-6">
            <span className="material-symbols-outlined text-sm">warning</span>
            Lỗi Hệ Thống 403
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-on-surface tracking-tight mb-6 font-headline">
            Truy cập bị <span className="text-primary">từ chối</span>
          </h1>

          <p className="text-lg lg:text-xl text-on-surface-variant leading-relaxed mb-10 max-w-xl">
            Rất tiếc, tài khoản của bạn hiện không có đủ thẩm quyền để truy cập vào phân hệ{' '}
            <span className="font-semibold text-on-surface">Predictive Analytics</span>.
            Vui lòng kiểm tra lại quyền hạn hoặc liên hệ quản trị viên hệ thống để được hỗ trợ.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            {/* Primary Action: Request Permission */}
            <button className="px-8 py-4 bg-primary text-on-primary rounded-lg font-bold text-base shadow-lg shadow-primary/20 hover:bg-on-primary-fixed-variant transition-all transform active:scale-95 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">verified_user</span>
              Yêu cầu quyền truy cập
            </button>
            {/* Secondary Action: Back Home */}
            <Link
              to="/"
              className="px-8 py-4 bg-surface-container-high text-on-surface rounded-lg font-bold text-base hover:bg-surface-dim transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">home</span>
              Quay lại trang chủ
            </Link>
          </div>

          {/* Contextual Help */}
          <div className="mt-12 pt-8 border-t border-outline-variant/30 flex items-center justify-center md:justify-start gap-4 text-sm text-on-surface-variant">
            <div className="flex -space-x-2">
              <img
                alt="Technical Support Avatar"
                className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdy66CaSp_dG2JCVRdEBMNTuwwU43wD-pI7LFB3W-nrU4DUrnCH3cyR3-q1Qo6CUtJY6SUhVloRp8A4Jg10rQ2Y0cB8v61RwLO10lsrDPZO-3rYfQN82MD2mbHGt1y-sY1439DrK9c1GNGV8qwAg-RB6Ekcg6nfNkZnnQxiDemyuIaEwG2k-ekj4mTe_lGiRiDqxXgawXT56KNFyCl9wL6jwyh73tHDZE_XBCDXBNjLdo2MSGITIssI7sb9yejkh3oIYhPhoia6-k"
              />
              <img
                alt="Admin Avatar"
                className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6otJPnyMn3K_6bwEXrOogSo0EL3GtaNEaXocboWpoeUPyhfZU-OWg9rSgmVT8oEC0UN60Q6li8mqc4J7jYL578-XNudKSv1ORWpoFYK-pi1tDqJtfkJi45_lpnW-K0YjGlG-NcKdD7e-Ncz8-8svbRhvczzREnuUhV82h2cdq2eaoJe-1-TWceg8pX_cfBGa8a_lV95S9NHt1S0Wmjm3kKdUACa2R4H6wqTOmgQLbFvoN7a6yzW3cMET0p5KvwtvVReWEi665coY"
              />
            </div>
            <p>
              Bạn cần giúp đỡ? <button className="text-primary font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">Liên hệ Đội ngũ Hỗ trợ Kỹ thuật</button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Identity */}
      <footer className="absolute bottom-8 left-0 w-full px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center text-xs text-outline font-medium tracking-wide gap-2 text-center">
        <div className="flex items-center gap-2">
          <span className="font-black text-primary uppercase">Global Ops</span>
          <span className="opacity-30">|</span>
          <span>DIRECT ACCESS v2.4</span>
        </div>
        <div>
          © 2024 Intelligent Logistics Systems. All rights reserved.
        </div>
      </footer>

      {/* Decorative Corner Element */}
      <div className="absolute top-0 right-0 p-8 pointer-events-none">
        <div className="w-32 h-32 opacity-10">
          <svg className="fill-current text-primary" viewBox="0 0 100 100">
            <path d="M0,0 L100,0 L100,10 L10,10 L10,100 L0,100 Z"></path>
          </svg>
        </div>
      </div>
    </div>
  );
}
