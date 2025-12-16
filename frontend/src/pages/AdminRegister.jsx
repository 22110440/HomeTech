import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import styles from './AdminRegister.module.css';

function AdminRegister() {
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
      const response = await authAPI.registerAdmin(
        formData.username,
        formData.email,
        formData.password
      );

      if (response.success) {
        setSuccess(response.message || 'Đăng ký admin thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
        setTimeout(() => {
          navigate('/AdminLogin');
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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Đăng ký tài khoản Admin</h2>
          <p className={styles.subtitle}>
            Đã có tài khoản?{' '}
            <Link to="/AdminLogin" className={styles.link}>
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
            {loading ? 'Đang đăng ký...' : 'Đăng ký Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminRegister;


