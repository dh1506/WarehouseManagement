import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/auth/LoginPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';
import { UserProfilePage } from './pages/profile/UserProfilePage';
import { MainLayout } from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
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
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/role-permissions" element={<RolePermissionsPage />} />
            <Route path="/admin/advanced-permission" element={<AdvancedPermissionsPage />} />
            <Route path="/admin/approval-configuration" element={<ApprovalConfigurationPage />} />
            <Route path="/admin/categories" element={<CategoryManagementPage />} />
            <Route path="/admin/product-settings" element={<ProductReferenceManagementPage />} />
            <Route path="/admin/product" element={<Navigate to="/admin/products" replace />} />
            <Route path="/admin/product/:id" element={<ProductDetailPage />} />
            <Route path="/admin/product/:id/edit" element={<ProductManagementPage />} />
            <Route path="/admin/products/:id/edit" element={<ProductManagementPage />} />
            <Route path="/admin/products/:id" element={<ProductDetailPage />} />
            <Route path="/admin/products" element={<ProductManagementPage />} />
            <Route path="/admin/warehouses/:id/zones/:zoneId" element={<ZoneDetailPage />} />
            <Route path="/admin/warehouses" element={<WarehouseHubPage />} />
            <Route path="/warehouse" element={<WarehouseHubPage />} />
            <Route path="/warehouse/master" element={<WarehouseManagementPage />} />

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
