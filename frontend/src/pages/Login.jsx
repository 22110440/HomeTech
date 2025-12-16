import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import styles from './Login.module.css';

function Login() {
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Kiểm tra query parameters từ email verification và reset password
  useEffect(() => {
    const verified = searchParams.get('verified');
    const message = searchParams.get('message');
    const errorParam = searchParams.get('error');
    const reset = searchParams.get('reset');

    if (verified === 'true' && message) {
      setSuccessMessage(decodeURIComponent(message));
      // Xóa query parameters khỏi URL
      navigate('/login', { replace: true });
    } else if (verified === 'false' && errorParam) {
      setError(decodeURIComponent(errorParam));
      // Xóa query parameters khỏi URL
      navigate('/login', { replace: true });
    } else if (reset === 'success') {
      setSuccessMessage('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
      // Xóa query parameters khỏi URL
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(
        formData.usernameOrEmail,
        formData.password
      );

      if (response.success) {
        // Lưu token vào localStorage
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('username', response.data.username);
        localStorage.setItem('email', response.data.email);
        localStorage.setItem('role', response.data.role);

        // Redirect dựa trên role
        if (response.data.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect đến backend OAuth2 endpoint
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Đăng nhập</h2>
          <p className={styles.subtitle}>
            Hoặc{' '}
            <Link to="/register" className={styles.link}>
              tạo tài khoản mới
            </Link>
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {successMessage && (
            <div className={`${styles.alert} ${styles.alertSuccess || styles.alert}`} style={{ backgroundColor: '#d4edda', color: '#155724', borderColor: '#c3e6cb' }}>
              <div>{successMessage}</div>
            </div>
          )}
          {error && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              <div>{error}</div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <input
              id="usernameOrEmail"
              name="usernameOrEmail"
              type="text"
              required
              className={styles.input}
              placeholder="Tên đăng nhập hoặc Email"
              value={formData.usernameOrEmail}
              onChange={handleChange}
            />
            <input
              id="password"
              name="password"
              type="password"
              required
              className={styles.input}
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className={styles.forgotLink}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className={styles.divider}>
            <span>Hoặc</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className={styles.googleButton}
          >
            <svg
              className={styles.googleIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Đăng nhập với Google
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

