import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { authAPI, userAPI } from '../services/api';
import AnnouncementBar from './AnnouncementBar';
import styles from './CustomerHeader.module.css';

export default function CustomerHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  const loadCartCount = async (userId) => {
    try {
      const response = await userAPI.getCart(userId);
      const items = response?.data || [];
      setCartItemCount(items.reduce((sum, item) => sum + (item.quantity || 0), 0));
    } catch {
      setCartItemCount(0);
    }
  };

  const loadSession = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUserInfo(null);
      setCartItemCount(0);
      return;
    }

    try {
      const response = await api.get('/auth/user-info');
      if (response.data?.success) {
        const currentUser = response.data.data;
        setUserInfo(currentUser);
        await loadCartCount(currentUser.id);
      } else {
        setUserInfo(null);
        setCartItemCount(0);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUserInfo(null);
      setCartItemCount(0);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await userAPI.getAllCategories();
        setCategories(res?.data || []);
      } catch {
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const syncCart = () => {
      if (userInfo?.id) {
        loadCartCount(userInfo.id);
      }
    };
    window.addEventListener('hometech:cart-updated', syncCart);
    return () => window.removeEventListener('hometech:cart-updated', syncCart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  const submit = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/?keyword=${encodeURIComponent(q)}` : '/');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } finally {
      localStorage.clear();
      setUserInfo(null);
      setCartItemCount(0);
      navigate('/login');
    }
  };

  const isHome = location.pathname === '/';

  return (
    <header className={styles.header}>
      <AnnouncementBar />
      <div className={styles.inner}>
        <div className={styles.leftGroup}>
          {!isHome && (
            <button className={styles.backButton} onClick={() => navigate(-1)} type="button">
              ← Quay lại
            </button>
          )}
          <Link to="/" className={styles.brand}>HomeTech</Link>
        </div>

        <form className={styles.searchForm} onSubmit={submit}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm sản phẩm / dịch vụ sửa chữa..."
          />
          <button type="submit">Tìm</button>
        </form>

        <nav className={styles.nav}>
          <Link to="/">Mua hàng</Link>
          <Link to="/repair-packages">Sửa chữa</Link>
          <Link to="/trade-in">Thu cũ đổi mới</Link>
        </nav>

        <div className={styles.accountActions}>
          <Link to="/cart" className={styles.cartLink} aria-label="Giỏ hàng">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 2h12M9 19a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
            {cartItemCount > 0 && <span className={styles.cartBadge}>{cartItemCount}</span>}
          </Link>

          {userInfo ? (
            <div className={styles.userGroup}>
              <Link to="/profile" className={styles.userLink}>
                {userInfo.username || 'Tài khoản'}
              </Link>
              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/login" className={styles.loginButton}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className={styles.categoriesBar}>
          <div className={styles.categoriesInner}>
            {categories.map((category) => (
              <Link key={category.id} to={`/?category=${category.id}`} className={styles.categoryItem}>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
