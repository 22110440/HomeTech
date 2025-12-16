import { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { authAPI } from '../../services/api';
import Dashboard from './Dashboard';
import OrdersManagement from './OrdersManagement';
import CategoriesManagement from './CategoriesManagement';
import ReviewsManagement from './ReviewsManagement';
import UsersManagement from './UsersManagement';
import ProductsManagement from './ProductsManagement';
import VouchersManagement from './VouchersManagement';
import RevenueStatistics from './RevenueStatistics';
import BannerSliderManagement from './BannerSliderManagement';
import ChatManagement from './ChatManagement';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatInitialUserId, setChatInitialUserId] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('accessToken');

      if (!token || role !== 'ADMIN') {
        navigate('/AdminLogin');
        return;
      }

      setAdminInfo({
        username: localStorage.getItem('username'),
        email: localStorage.getItem('email'),
      });
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleOpenChatForUser = (userId) => {
    setChatInitialUserId(userId);
    setActiveTab('chat');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.clear();
      navigate('/AdminLogin');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrdersManagement />;
      case 'categories':
        return <CategoriesManagement />;
      case 'reviews':
        return <ReviewsManagement />;
      case 'users':
        return <UsersManagement onOpenChat={handleOpenChatForUser} />;
      case 'products':
        return <ProductsManagement />;
      case 'vouchers':
        return <VouchersManagement />;
      case 'revenue':
        return <RevenueStatistics />;
      case 'marketing':
        return <BannerSliderManagement />;
      case 'chat':
        return <ChatManagement initialUserId={chatInitialUserId} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>HomeTech</h1>
          <p className={styles.subtitle}>Admin Panel</p>
        </div>

        <nav className={styles.nav}>
          <button
            className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'orders' ? styles.active : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Đơn hàng</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'products' ? styles.active : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Sản phẩm</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'vouchers' ? styles.active : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Voucher</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Người dùng</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'categories' ? styles.active : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Danh mục</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'revenue' ? styles.active : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Doanh thu</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'chat' ? styles.active : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.338-3.123C3.486 15.732 3 13.938 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Chat khách hàng</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'marketing' ? styles.active : ''}`}
            onClick={() => setActiveTab('marketing')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            <span>Banner & Slider</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'reviews' ? styles.active : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Đánh giá</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {adminInfo?.username?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{adminInfo?.username}</p>
              <p className={styles.userEmail}>{adminInfo?.email}</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg className={styles.logoutIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;


