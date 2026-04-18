import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import Dashboard from './Dashboard';
import OrdersManagement from './OrdersManagement';
import CategoriesManagement from './CategoriesManagement';
import ReviewsManagement from './ReviewsManagement';
import UsersManagement from './UsersManagement';
import ProductsManagement from './ProductsManagement';
import VouchersManagement from './VouchersManagement';
import RepairSchedulesManagement from './RepairSchedulesManagement';
import RepairManagementHub from './RepairManagementHub';
import RevenueStatistics from './RevenueStatistics';
import BannerSliderManagement from './BannerSliderManagement';
import ChatManagement from './ChatManagement';
import TradeIn from '../TradeIn';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('repairPackages');
  const [chatInitialUserId, setChatInitialUserId] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isTechnician = role === 'THO';

  useEffect(() => {
    const checkAuth = () => {
      const currentRole = localStorage.getItem('role');
      const token = localStorage.getItem('accessToken');

      if (!token || (currentRole !== 'ADMIN' && currentRole !== 'THO')) {
        navigate('/AdminLogin');
        return;
      }

      setRole(currentRole);
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
        return isTechnician ? <RepairSchedulesManagement /> : <Dashboard />;
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
      case 'repairPackages':
        return isTechnician ? <RepairSchedulesManagement /> : <RepairManagementHub />;
      case 'revenue':
        return <RevenueStatistics />;
      case 'marketing':
        return <BannerSliderManagement />;
      case 'chat':
        return <ChatManagement initialUserId={chatInitialUserId} />;
      case 'tradein':
        return <TradeIn adminOnly />;
      default:
        return isTechnician ? <RepairSchedulesManagement /> : <Dashboard />;
    }
  };

  const MenuBtn = ({ tab, label, icon }) => (
    <button className={`${styles.navItem} ${activeTab === tab ? styles.active : ''}`} onClick={() => setActiveTab(tab)}>
      <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      <span>{label}</span>
    </button>
  );

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>HomeTech</h1>
          <p className={styles.subtitle}>{isTechnician ? 'Technician Panel' : 'Admin Panel'}</p>
        </div>

        <nav className={styles.nav}>
          {!isTechnician && <MenuBtn tab="dashboard" label="Dashboard" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
          {!isTechnician && <MenuBtn tab="orders" label="Đơn hàng" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />}
          {!isTechnician && <MenuBtn tab="products" label="Sản phẩm" icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />}
          {!isTechnician && <MenuBtn tab="vouchers" label="Voucher" icon="M9 14l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />}

          <MenuBtn tab="repairPackages" label="Gói sửa chữa" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

          {!isTechnician && <MenuBtn tab="users" label="Người dùng" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />}
          {!isTechnician && <MenuBtn tab="categories" label="Danh mục" icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />}
          {!isTechnician && <MenuBtn tab="revenue" label="Doanh thu" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14" />}
          {!isTechnician && <MenuBtn tab="chat" label="Chat khách hàng" icon="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.338-3.123C3.486 15.732 3 13.938 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
          {!isTechnician && <MenuBtn tab="marketing" label="Banner & Slider" icon="M11 17l-5-5m0 0l5-5m-5 5h12" />}
          {!isTechnician && <MenuBtn tab="tradein" label="Thu cũ đổi mới" icon="M12 8c-2.21 0-4 1.79-4 4 0 2.21 1.79 4 4 4m0-8c2.21 0 4 1.79 4 4 0 2.21-1.79 4-4 4m0-8v8m-8 0h16" />}
          {!isTechnician && <MenuBtn tab="reviews" label="Đánh giá" icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{adminInfo?.username?.charAt(0).toUpperCase()}</div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{adminInfo?.username}</p>
              <p className={styles.userEmail}>{adminInfo?.email}</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>{renderContent()}</div>
      </main>
    </div>
  );
}

export default AdminDashboard;
