import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './OAuthCallback.module.css';

function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Lấy token từ URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const refreshToken = urlParams.get('refreshToken');

        if (token && refreshToken) {
          // Lưu token vào localStorage
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', refreshToken);

          // Lấy thông tin user từ API
          try {
            const response = await api.get('/auth/user-info');
            if (response.data.success) {
              const userData = response.data.data;
              localStorage.setItem('username', userData.username || '');
              localStorage.setItem('role', userData.authorities?.[0]?.authority?.replace('ROLE_', '') || 'USER');
            }
          } catch (err) {
            console.warn('Không thể lấy thông tin user:', err);
          }

          // Redirect về trang chủ
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          // Nếu không có token trong URL, thử lấy từ OAuth2 session (fallback)
          const response = await api.get('/auth/oauth2/user');
          
          if (response.data.success) {
            const userData = response.data.data;
            localStorage.setItem('email', userData.email || '');
            localStorage.setItem('username', userData.name || userData.email || '');
            localStorage.setItem('role', 'USER');
            
            setTimeout(() => {
              navigate('/');
            }, 1000);
          } else {
            setError('Không thể lấy thông tin người dùng từ OAuth2');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        }
      } catch (err) {
        console.error('OAuth2 callback error:', err);
        setError('Đã xảy ra lỗi khi xử lý đăng nhập');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.content}>
            <div className={styles.spinner}></div>
            <p className={styles.message}>Đang xử lý đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.content}>
            <div className={styles.errorIcon}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className={styles.errorTitle}>Lỗi</h3>
            <p className={styles.errorMessage}>{error}</p>
            <button
              onClick={() => navigate('/login')}
              className={styles.button}
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default OAuthCallback;

