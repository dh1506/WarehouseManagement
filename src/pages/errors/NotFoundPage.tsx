import { Link, useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col items-center justify-center p-6">
      {/* Main Content Container */}
      <main className="max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-12 md:gap-24">
        {/* Illustration Section (Asymmetric Layout) */}
        <div className="relative w-full md:w-1/2 flex justify-center order-1 md:order-2">
          {/* Decorative Background Elements (Layering Principle) */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-primary-container/10 rounded-full blur-2xl"></div>

          <div className="relative z-10 w-full aspect-square max-w-[400px]">
            <img
              alt="Lost in the Warehouse"
              className="w-full h-full object-cover rounded-xl shadow-[0_12px_32px_-4px_rgba(25,28,30,0.06)] grayscale hover:grayscale-0 transition-all duration-700 ease-in-out"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBE1XlSgimsU_Vgh3MLul_Gvkr2X1oTzByKYiCy7x6w6uyiLx10CtC2KaMlu7h6ok8Bb7fDMvSmSec0ByDMk1zjcDgVeadLQ8E2BknIzVMRDN3xAZm3cozfHxlndmKyrRVnSFN0HOAi3ki_GpuN1zl9vDQ3-qt8dCfRO4V57smPlr-hjwCdOnYQDlVM7BaEqZjkAT2R43uIk0w0Ov_oe7Yzq65CISc1ovXRBe2T01QGvkdk3L8pieyh619DqmCw4rpgHyb1Oi4CGLI"
            />
            {/* Floating Glassmorphic Badge (AI Element) */}
            <div className="absolute -bottom-4 -right-4 bg-surface-container-lowest/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined" data-icon="search_off">search_off</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">System Status</p>
                <p className="text-sm font-semibold text-on-surface">Route Not Found</p>
              </div>
            </div>
          </div>
        </div>

        {/* Textual Content Section */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
          <div className="mb-2">
            <span className="inline-block py-1 px-3 rounded-full bg-primary-container/10 text-primary text-xs font-bold tracking-widest uppercase mb-4">
              Error Code: 404
            </span>
          </div>

          <h1 className="text-7xl md:text-9xl font-extrabold text-primary mb-2 tracking-tighter flex items-baseline font-headline">
            404
            <span className="w-3 h-3 bg-secondary rounded-full ml-2"></span>
          </h1>

          <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-6 leading-tight font-headline">
            Oops! The page you are looking for could not be found.
          </h2>

          <p className="text-on-surface-variant text-lg mb-10 max-w-md leading-relaxed">
            The resource might have been moved, deleted, or is temporarily unavailable in our predictive logistics network.
          </p>

          {/* Navigation Actions */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
              <span className="material-symbols-outlined mr-2" data-icon="dashboard">dashboard</span>
              Back to Dashboard
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center px-8 py-4 bg-surface-container-low text-on-surface font-semibold rounded-xl hover:bg-surface-container-high transition-all duration-200"
            >
              <span className="material-symbols-outlined mr-2" data-icon="support_agent">support_agent</span>
              Contact Support
            </button>
          </div>

          {/* Contextual Search (Integrated into 404) */}
          <div className="mt-16 w-full max-w-sm">
            <p className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Try searching instead</p>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl" data-icon="search">search</span>
              </div>
              <input
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-container transition-all text-on-surface placeholder:text-outline-variant outline-none"
                placeholder="Search inventory or tools..."
                type="text"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-8 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
        <span
          className="material-symbols-outlined text-primary"
          data-icon="warehouse"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          warehouse
        </span>
        <span className="font-headline font-extrabold text-on-surface tracking-tight uppercase text-xs">WMS Enterprise — Predictive Architect</span>
      </footer>
    </div>
  );
}
