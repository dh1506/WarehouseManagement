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
import { AdvancedPermissionsPage } from './pages/admin/AdvancedPermissionsPage';
import { ApprovalConfigurationPage } from './pages/admin/ApprovalConfigurationPage';
import { ProductReferenceManagementPage } from './pages/admin/ProductReferenceManagementPage';
import { ProductManagementPage } from './pages/admin/ProductManagementPage';
import { ProductDetailPage } from './pages/admin/ProductDetailPage';
import { WarehouseManagementPage } from './pages/admin/WarehouseManagementPage';
import { WarehouseHubPage } from './pages/admin/WarehouseHubPage';
import { ZoneDetailPage } from './pages/admin/ZoneDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
            <Route path="/" element={<Navigate to="/admin/users" replace />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/admin/users" element={<PageAccessRoute path="/admin/users"><UserManagementPage /></PageAccessRoute>} />
            <Route path="/admin/role-permissions" element={<PageAccessRoute path="/admin/role-permissions"><RolePermissionsPage /></PageAccessRoute>} />
            <Route path="/admin/advanced-permission" element={<PageAccessRoute path="/admin/advanced-permission"><AdvancedPermissionsPage /></PageAccessRoute>} />
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

            {/* Placeholder routes — sẽ implement trong Sprint 1 tiếp theo */}
            <Route path="/import-export" element={<Navigate to="/admin/users" replace />} />
            <Route path="/inventory" element={<Navigate to="/admin/users" replace />} />
            <Route path="/ai-forecast" element={<Navigate to="/admin/users" replace />} />
          </Route>

          {/* 404 — mọi route không khớp */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
