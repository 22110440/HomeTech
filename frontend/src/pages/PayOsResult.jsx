import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './VnPayResult.module.css';

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function PayOsResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);

  const isSuccess = query.get('success') === 'true';
  const message = query.get('message') || (isSuccess ? 'Thanh toán PayOS thành công' : 'Thanh toán PayOS thất bại');
  const amount = query.get('amount');
  const orderId = query.get('orderId');
  const orderCode = query.get('orderCode');
  const status = query.get('status');

  const handleViewOrders = () => navigate('/orders');
  const handleBackHome = () => navigate('/');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={isSuccess ? styles.iconSuccess : styles.iconFail}>
          {isSuccess ? '✓' : '✕'}
        </div>
        <h1>{isSuccess ? 'Thanh toán PayOS thành công' : 'Thanh toán PayOS thất bại'}</h1>
        <p className={styles.message}>{message}</p>

        <div className={styles.details}>
          {orderId && (
            <div>
              <span>Mã đơn hàng</span>
              <strong>#{orderId}</strong>
            </div>
          )}
          {orderCode && (
            <div>
              <span>Mã giao dịch PayOS</span>
              <strong>{orderCode}</strong>
            </div>
          )}
          {amount && (
            <div>
              <span>Số tiền</span>
              <strong>{formatCurrency(amount)}</strong>
            </div>
          )}
          {status && (
            <div>
              <span>Trạng thái</span>
              <strong>{status}</strong>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button onClick={handleViewOrders} className={styles.primaryButton}>
            Xem đơn hàng
          </button>
          <Link to="/" className={styles.secondaryButton} onClick={handleBackHome}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}


