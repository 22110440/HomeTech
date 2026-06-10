import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { BACKEND_ORIGIN } from '../config/runtime';
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
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
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
        } else if (response.data.role === 'THO') {
          navigate('/admin/repair-packages');
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
    window.location.href = `${BACKEND_ORIGIN}/oauth2/authorization/google`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <aside className={styles.promoPane}>
          <div className={styles.brandRow}>
            <Link to="/" className={styles.brandMark}>HomeTech</Link>
            <span className={styles.brandTag}>Member</span>
          </div>
          <h1>
            Đăng nhập hội viên <span>HomeTech Care</span>
          </h1>
          <p className={styles.promoLead}>
            Nhận ưu đãi mua điện thoại, sửa chữa và theo dõi đơn hàng nhanh hơn.
          </p>

          <div className={styles.benefitBox}>
            <div className={styles.cornerTop}></div>
            <div className={styles.cornerBottom}></div>
            <ul>
              <li><span className={styles.benefitIcon}>%</span><span className={styles.benefitText}><strong>Ưu đãi đến 8%</strong> cho sản phẩm điện thoại chính hãng.</span></li>
              <li><span className={styles.benefitIcon}>₫</span><span className={styles.benefitText}><strong>Miễn phí giao hàng</strong> cho đơn hàng đủ điều kiện.</span></li>
              <li><span className={styles.benefitIcon}>★</span><span className={styles.benefitText}><strong>Tích điểm thành viên</strong> sau mỗi đơn mua và sửa chữa.</span></li>
              <li><span className={styles.benefitIcon}>↻</span><span className={styles.benefitText}><strong>Theo dõi bảo hành</strong>, lịch sửa chữa và trạng thái đơn hàng.</span></li>
              <li><span className={styles.benefitIcon}>↗</span><span className={styles.benefitText}><strong>Thu cũ đổi mới</strong> với báo giá minh bạch.</span></li>
            </ul>
            <Link to="/" className={styles.policyLink}>Khám phá ưu đãi HomeTech</Link>
          </div>

          <div className={styles.mascotPanel} aria-hidden="true">
            <div className={styles.phoneCard}></div>
            <div className={styles.giftBox}></div>
            <div className={styles.ticketOne}>5%</div>
            <div className={styles.ticketTwo}>300K</div>
          </div>
        </aside>

        <main className={styles.formPane}>
          <div className={styles.card}>
            <div className={styles.header}>
              <h2 className={styles.title}>Đăng nhập HomeTech</h2>
              <p className={styles.subtitle}>
                Chưa có tài khoản?{' '}
                <Link to="/register" className={styles.link}>
                  Đăng ký ngay
                </Link>
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
              {successMessage && (
                <div className={`${styles.alert} ${styles.alertSuccess}`}>
                  <div>{successMessage}</div>
                </div>
              )}
              {error && (
                <div className={`${styles.alert} ${styles.alertError}`}>
                  <div>{error}</div>
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
                  placeholder="Nhập tên đăng nhập hoặc email"
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
                <span>Hoặc đăng nhập bằng</span>
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
                Google
              </button>

              <p className={styles.footerText}>
                Mua sắm, sửa chữa tại <Link to="/">hometech.vn</Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Login;
