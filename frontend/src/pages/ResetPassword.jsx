import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import styles from './ResetPassword.module.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token không hợp lệ hoặc đã hết hạn');
    }
  }, [token]);

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

    if (!token) {
      setError('Token không hợp lệ');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, formData.newPassword);

      if (response.success) {
        setSuccess(response.message || 'Đặt lại mật khẩu thành công! Bạn sẽ được chuyển đến trang đăng nhập...');
        // Redirect về trang đăng nhập sau 2 giây
        setTimeout(() => {
          navigate('/login?reset=success');
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Đặt lại mật khẩu thất bại. Token có thể đã hết hạn.'
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className={styles.title}>Đặt lại mật khẩu</h2>
          <p className={styles.subtitle}>
            Nhập mật khẩu mới của bạn
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="newPassword" className={styles.label}>
              Mật khẩu mới
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={6}
              className={styles.input}
              placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
              value={formData.newPassword}
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

          <button
            type="submit"
            disabled={loading || !token}
            className={styles.button}
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>

          <div className={styles.backLink}>
            <Link to="/login">Quay lại đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;

