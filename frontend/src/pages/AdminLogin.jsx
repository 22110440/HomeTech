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
      <div className={styles.shell}>
        <aside className={styles.infoPane}>
          <div className={styles.brandRow}>
            <Link to="/" className={styles.brandMark}>HomeTech</Link>
            <span className={styles.brandTag}>Admin</span>
          </div>

          <div className={styles.infoContent}>
            <p className={styles.eyebrow}>Bảng điều khiển vận hành</p>
            <h1>Quản trị bán hàng và sửa chữa điện thoại</h1>
            <p className={styles.lead}>
              Theo dõi đơn hàng, lịch sửa chữa, khách hàng, sản phẩm và báo cáo từ một khu vực quản trị riêng.
            </p>

            <div className={styles.featureGrid}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>01</span>
                <div>
                  <strong>Quản lý bán hàng</strong>
                  <p>Sản phẩm, đơn hàng, voucher và phản hồi khách hàng.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>02</span>
                <div>
                  <strong>Điều phối sửa chữa</strong>
                  <p>Lịch hẹn, gói dịch vụ, tiến độ xử lý và kỹ thuật viên.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>03</span>
                <div>
                  <strong>Báo cáo vận hành</strong>
                  <p>Doanh thu, chi tiêu, trạng thái đơn và dữ liệu chăm sóc khách hàng.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className={styles.formPane}>
          <section className={styles.card}>
            <div className={styles.header}>
              <div className={styles.icon} aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className={styles.title}>Đăng nhập quản trị</h2>
              <p className={styles.subtitle}>
                Chỉ dành cho admin và thợ sửa chữa được cấp quyền.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
              {error && (
                <div className={`${styles.alert} ${styles.alertError}`}>
                  <div className={styles.alertContent}>
                    <div className={styles.alertIcon} aria-hidden="true">
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
                <label htmlFor="usernameOrEmail" className={styles.label}>
                  Tên đăng nhập hoặc Email
                </label>
                <input
                  id="usernameOrEmail"
                  name="usernameOrEmail"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  className={styles.input}
                  placeholder="Nhập tài khoản quản trị"
                  value={formData.usernameOrEmail}
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
                  autoComplete="new-password"
                  required
                  className={styles.input}
                  placeholder="Nhập mật khẩu"
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
                    <span className={styles.spinner}></span>
                    <span>Đang đăng nhập...</span>
                  </span>
                ) : (
                  'Vào trang quản trị'
                )}
              </button>

              <div className={styles.footerLinks}>
                <Link to="/login" className={styles.backLink}>
                  Quay lại đăng nhập khách hàng
                </Link>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminLogin;
