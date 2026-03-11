import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import OAuthCallback from './pages/OAuthCallback';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Favorites from './pages/Favorites';
import ExpenseManagement from './pages/ExpenseManagement';
import NotificationBell from './components/NotificationBell';
import ChatWidget from './components/ChatWidget';
import VnPayResult from './pages/VnPayResult';
import PayOsResult from './pages/PayOsResult';
import CustomerHeader from './components/CustomerHeader';
import RepairBooking from './pages/RepairBooking';
import RepairPackages from './pages/RepairPackages';
import RepairPackageDetail from './pages/RepairPackageDetail';
import RepairSchedules from './pages/RepairSchedules';
import RepairPayment from './pages/RepairPayment';
import TradeIn from './pages/TradeIn';
import './App.css';

function AppRoutes() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  const isAdminRoute = path.startsWith('/admin');
  const hideCustomerHeader = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/admin/login', '/adminlogin'].includes(path);

  return (
    <>
      {!isAdminRoute && !hideCustomerHeader && <CustomerHeader />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin login - separate URL */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/AdminLogin" element={<AdminLogin />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* OAuth2 callback */}
        <Route path="/oauth2/callback" element={<OAuthCallback />} />

        {/* Public product routes */}
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/expenses" element={<ExpenseManagement />} />
        <Route path="/payment/vnpay/result" element={<VnPayResult />} />
        <Route path="/payment/payos/result" element={<PayOsResult />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/repair-booking" element={<RepairBooking />} />
        <Route path="/repair-packages" element={<RepairPackages />} />
        <Route path="/repair-packages/:id" element={<RepairPackageDetail />} />
        <Route path="/my-repair-schedules" element={<RepairSchedules />} />
        <Route path="/repair-payment/:bookingId" element={<RepairPayment />} />
        <Route path="/trade-in" element={<TradeIn />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationBell />
      {!isAdminRoute && <ChatWidget />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
// export default function App() {
//   return (
//     <h1 className="text-4xl font-bold text-red-500">
//       Tailwind đang hoạt động!
//     </h1>
//   );
// }
