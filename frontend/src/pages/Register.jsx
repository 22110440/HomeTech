import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import styles from './Register.module.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(
        formData.username,
        formData.email,
        formData.password
      );

      if (response.success) {
        setSuccess(response.message);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Đăng ký tài khoản</h2>
          <p className={styles.subtitle}>
            Đã có tài khoản?{' '}
            <Link to="/login" className={styles.link}>
              Đăng nhập ngay
            </Link>
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <div>{success}</div>
            </div>
          )}

          <div>
            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.label}>
                Tên đăng nhập
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={50}
                className={styles.input}
                placeholder="Tên đăng nhập (3-50 ký tự)"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.input}
                placeholder="Email của bạn"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="Mật khẩu (ít nhất 6 ký tự)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
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
            Đăng ký với Google
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;

