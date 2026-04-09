import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/auth/LoginPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';
import { UserProfilePage } from './pages/profile/UserProfilePage';
import { MainLayout } from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
import { hasPageAccessFromPermissionNames } from './lib/pageAccess';
import { CategoryManagementPage } from './pages/admin/CategoryManagementPage';
import { RolePermissionsPage } from './pages/admin/RolePermissionsPage';
import { ApprovalConfigurationPage } from './pages/admin/ApprovalConfigurationPage';
import { ProductReferenceManagementPage } from './pages/admin/ProductReferenceManagementPage';
import { ProductManagementPage } from './pages/admin/ProductManagementPage';
import { ProductDetailPage } from './pages/admin/ProductDetailPage';
import { WarehouseManagementPage } from './pages/admin/WarehouseManagementPage';
import { WarehouseHubPage } from './pages/admin/WarehouseHubPage';
import { ZoneDetailPage } from './pages/admin/ZoneDetailPage';
import { ImportExportPage } from './pages/operations/ImportExportPage';
import { InventoryPage } from './pages/operations/InventoryPage';
import { AiForecastPage } from './pages/operations/AiForecastPage';
import { InboundManagementPage } from './pages/operations/InboundManagementPage';
import { InboundDetailPage } from './pages/operations/InboundDetailPage';
import { TransactionHistoryPage } from './pages/operations/TransactionHistoryPage';

import { OutboundListPage } from './pages/operations/OutboundListPage';
import { OutboundDetailPage } from './pages/operations/OutboundDetailPage';
import { OutboundCreatePage } from './pages/operations/OutboundCreatePage';
import { OutboundPickingPage } from './pages/operations/OutboundPickingPage';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes — prevents refetch on every navigation
    },
  },
});

// Guard component: chỉ render children nếu đã đăng nhập
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PageAccessRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const canAccess = hasPageAccessFromPermissionNames(path, user?.permissions ?? [], user?.role);

  return canAccess ? <>{children}</> : <Navigate to="/403" replace />;
}

function DefaultLandingRoute() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const role = user?.role;

  const candidates = [
    '/admin/product-settings',
    '/admin/categories',
    '/admin/products',
    '/admin/warehouses',
    '/admin/users',
    '/admin/role-permissions',
    '/admin/approval-configuration',
  ];

  const firstAccessible = candidates.find((path) =>
    hasPageAccessFromPermissionNames(path, permissions, role),
  );

  return <Navigate to={firstAccessible ?? '/profile'} replace />;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Routes công khai */}
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Routes được bảo vệ, dùng MainLayout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DefaultLandingRoute />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/admin/users" element={<PageAccessRoute path="/admin/users"><UserManagementPage /></PageAccessRoute>} />
            <Route path="/admin/role-permissions" element={<PageAccessRoute path="/admin/role-permissions"><RolePermissionsPage /></PageAccessRoute>} />
            <Route path="/admin/approval-configuration" element={<PageAccessRoute path="/admin/approval-configuration"><ApprovalConfigurationPage /></PageAccessRoute>} />
            <Route path="/admin/categories" element={<PageAccessRoute path="/admin/categories"><CategoryManagementPage /></PageAccessRoute>} />
            <Route path="/admin/product-settings" element={<PageAccessRoute path="/admin/product-settings"><ProductReferenceManagementPage /></PageAccessRoute>} />
            <Route path="/admin/product" element={<Navigate to="/admin/products" replace />} />
            <Route path="/admin/product/:id" element={<ProductDetailPage />} />
            <Route path="/admin/product/:id/edit" element={<PageAccessRoute path="/admin/products"><ProductManagementPage /></PageAccessRoute>} />
            <Route path="/admin/products/:id/edit" element={<PageAccessRoute path="/admin/products"><ProductManagementPage /></PageAccessRoute>} />
            <Route path="/admin/products/:id" element={<PageAccessRoute path="/admin/products"><ProductDetailPage /></PageAccessRoute>} />
            <Route path="/admin/products" element={<PageAccessRoute path="/admin/products"><ProductManagementPage /></PageAccessRoute>} />
            <Route path="/admin/warehouses/:id/zones/:zoneId" element={<PageAccessRoute path="/admin/warehouses"><ZoneDetailPage /></PageAccessRoute>} />
            <Route path="/admin/warehouses" element={<PageAccessRoute path="/admin/warehouses"><WarehouseHubPage /></PageAccessRoute>} />
            <Route path="/warehouse" element={<PageAccessRoute path="/admin/warehouses"><WarehouseHubPage /></PageAccessRoute>} />
            <Route path="/warehouse/master" element={<PageAccessRoute path="/admin/warehouses"><WarehouseManagementPage /></PageAccessRoute>} />

            <Route path="/import-export" element={<PageAccessRoute path="/import-export"><ImportExportPage /></PageAccessRoute>} />
            <Route path="/inventory" element={<PageAccessRoute path="/inventory"><InventoryPage /></PageAccessRoute>} />
            <Route path="/inventory/transactions" element={<PageAccessRoute path="/inventory/transactions"><TransactionHistoryPage /></PageAccessRoute>} />
            <Route path="/ai-forecast" element={<PageAccessRoute path="/ai-forecast"><AiForecastPage /></PageAccessRoute>} />
            <Route path="/inbound" element={<PageAccessRoute path="/inbound"><InboundManagementPage /></PageAccessRoute>} />
            <Route path="/inbound/:id" element={<PageAccessRoute path="/inbound"><InboundDetailPage /></PageAccessRoute>} />
            <Route path="/outbound" element={<PageAccessRoute path="/outbound"><OutboundListPage /></PageAccessRoute>} />
            <Route path="/outbound/create" element={<PageAccessRoute path="/outbound"><OutboundCreatePage /></PageAccessRoute>} />
            <Route path="/outbound/:id" element={<PageAccessRoute path="/outbound"><OutboundDetailPage /></PageAccessRoute>} />
            <Route path="/outbound/:id/picking" element={<PageAccessRoute path="/outbound"><OutboundPickingPage /></PageAccessRoute>} />
          </Route>

          {/* 404 — mọi route không khớp */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
