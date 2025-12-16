import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import styles from './AdminLogin.module.css';

function AdminLogin() {
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      const response = await authAPI.loginAdmin(
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
        if (response.data.adminId) {
          localStorage.setItem('adminId', response.data.adminId);
        }

        // Redirect đến trang admin
        navigate('/admin');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.icon}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className={styles.title}>Đăng nhập Admin</h2>
          <p className={styles.subtitle}>
            Trang dành cho quản trị viên
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              <div className={styles.alertContent}>
                <div className={styles.alertIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className={styles.alertMessage}>{error}</div>
              </div>
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

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? (
              <span className={styles.buttonContent}>
                <div className={styles.spinner}></div>
                <span>Đang đăng nhập...</span>
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>

          <div className={styles.footerLinks}>
            
            <a href="/login" className={styles.backLink}>
              ← Quay lại trang đăng nhập thường
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;

