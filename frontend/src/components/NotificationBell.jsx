import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';
import styles from './NotificationBell.module.css';

const TYPE_META = {
  ORDER_CREATED: { label: 'Đơn hàng', icon: '📦' },
  ORDER_STATUS: { label: 'Đơn hàng', icon: '🚚' },
  ORDER_STATUS_ADMIN: { label: 'Đơn hàng', icon: '🚚' },
  ORDER_CANCELLED: { label: 'Đơn hàng', icon: '⚠️' },
  ORDER_CANCELLED_ADMIN: { label: 'Đơn hàng', icon: '⚠️' },
  CART_ADD: { label: 'Giỏ hàng', icon: '🛒' },
  PROFILE_UPDATE: { label: 'Tài khoản', icon: '👤' },
  PRODUCT_CREATED: { label: 'Sản phẩm', icon: '✨' },
  PRODUCT_UPDATED: { label: 'Sản phẩm', icon: '🛠️' },
  PRODUCT_TOGGLE: { label: 'Sản phẩm', icon: '👁️' },
  PRODUCT_DELETED: { label: 'Sản phẩm', icon: '🗑️' },
  CATEGORY_CREATED: { label: 'Danh mục', icon: '🗂️' },
  CATEGORY_UPDATED: { label: 'Danh mục', icon: '🗂️' },
  CATEGORY_DELETED: { label: 'Danh mục', icon: '🗂️' },
};

const normalizeNotification = (notification) => ({
  ...notification,
  isRead: notification?.isRead ?? notification?.read ?? false,
});

const NotificationBell = ({ inline = false }) => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('accessToken'));
  });

  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    const handleStorage = () => {
      if (typeof window === 'undefined') return;
      setIsAuthenticated(Boolean(localStorage.getItem('accessToken')));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response && typeof response.count === 'number') {
        setUnreadCount(response.count);
      } else if (response?.data && typeof response.data.count === 'number') {
        setUnreadCount(response.data.count);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Không thể lấy số lượng thông báo chưa đọc:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const response = await notificationAPI.getAll();
      const rawList = Array.isArray(response) ? response : response?.data || [];
      setNotifications(rawList.map(normalizeNotification));
    } catch (err) {
      console.error('Không thể tải thông báo:', err);
      setError('Không thể tải thông báo. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setOpen((prev) => !prev);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Không thể đánh dấu đã đọc:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    const targetPath = getTargetPath(notification);
    if (targetPath) {
      navigate(targetPath);
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Không thể đánh dấu tất cả đã đọc:', err);
    }
  };

  const getTargetPath = (notification) => {
    const type = notification?.type || '';
    if (type.startsWith('ORDER')) return '/orders';
    if (type.startsWith('CART')) return '/cart';
    if (type.startsWith('PROFILE')) return '/profile';
    if (type.startsWith('PRODUCT') || type.startsWith('CATEGORY')) return '/admin';
    return null;
  };

  const renderTimestamp = (dateString) => {
    if (!dateString) return 'Vừa xong';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Vừa xong';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const renderNotificationMeta = (notification) => {
    if (!notification?.type) return { icon: '🔔', label: 'Thông báo' };
    return TYPE_META[notification.type] || { icon: '🔔', label: 'Thông báo' };
  };

  if (!isAuthenticated) {
    return null;
  }

  const wrapperClass = inline
    ? `${styles.wrapper} ${styles.inline}`
    : `${styles.wrapper} ${styles.floating}`;

  return (
    <div className={wrapperClass} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.bellButton} ${open ? styles.bellButtonActive : ''}`}
        onClick={handleToggle}
        aria-label="Thông báo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div>
              <p className={styles.dropdownTitle}>Thông báo</p>
              <p className={styles.dropdownSubtitle}>
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Bạn đã đọc hết thông báo'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markAllButton}
                onClick={handleMarkAllRead}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className={styles.dropdownBody}>
            {loading && <p className={styles.placeholder}>Đang tải...</p>}
            {!loading && error && (
              <p className={styles.errorText}>{error}</p>
            )}
            {!loading && !error && !hasNotifications && (
              <p className={styles.placeholder}>Chưa có thông báo</p>
            )}
            {!loading && !error && hasNotifications && (
              <ul className={styles.notificationList}>
                {notifications.map((notification) => {
                  const meta = renderNotificationMeta(notification);
                  const itemClasses = [
                    styles.notificationItem,
                    notification.isRead ? '' : styles.notificationUnread,
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        className={itemClasses}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={styles.notificationIcon}>
                          {meta.icon}
                        </div>
                        <div className={styles.notificationContent}>
                          <div className={styles.notificationMeta}>
                            <span className={styles.notificationType}>
                              {meta.label}
                            </span>
                            <span className={styles.notificationTime}>
                              {renderTimestamp(notification.createdAt)}
                            </span>
                          </div>
                          <p className={styles.notificationMessage}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className={styles.unreadDot} aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

