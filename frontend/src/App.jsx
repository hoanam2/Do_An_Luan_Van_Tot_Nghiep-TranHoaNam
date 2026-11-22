import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AiChatWidget from './components/AiChatWidget';
import HomePage from './pages/HomePage';
import HotelDetailPage from './pages/HotelDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PartnerRegisterPage from './pages/PartnerRegisterPage';
import FlashSalePage from './pages/FlashSalePage';
import PromotionsPage from './pages/PromotionsPage';
import DestinationsPage from './pages/DestinationsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import CheckoutPage from './pages/CheckoutPage';
import MyVouchersPage from './pages/MyVouchersPage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminVendorsPage from './pages/AdminVendorsPage';

function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container section">Đang kiểm tra phiên đăng nhập...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length > 0 && !roles.includes(user.vai_tro)) {
    if (user.vai_tro === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.vai_tro === 'VENDOR') return <Navigate to="/vendor" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/hotels/:id" element={<HotelDetailPage />} />
              <Route path="/flash-sale" element={<FlashSalePage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/destinations" element={<DestinationsPage />} />
              <Route path="/partner" element={<PartnerRegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute roles={['USER']}>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute roles={['USER']}>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-vouchers"
                element={
                  <ProtectedRoute roles={['USER']}>
                    <MyVouchersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor"
                element={
                  <ProtectedRoute roles={['VENDOR']}>
                    <VendorDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/vendors"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminVendorsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <AiChatWidget />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
