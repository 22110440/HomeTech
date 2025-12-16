import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import styles from './ForgotPassword.module.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);

      if (response.success) {
        setSuccess(response.message);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Có lỗi xảy ra. Vui lòng thử lại sau.'
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className={styles.title}>Quên mật khẩu</h2>
          <p className={styles.subtitle}>
            Nhập email của bạn để nhận link đặt lại mật khẩu
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

          <input
            id="email"
            name="email"
            type="email"
            required
            className={styles.input}
            placeholder="Email của bạn"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
              setSuccess('');
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>

          <div className={styles.backLink}>
            <Link to="/login">Quay lại đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;

