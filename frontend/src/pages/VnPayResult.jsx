import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './VnPayResult.module.css';

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function VnPayResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);

  const isSuccess = query.get('success') === 'true';
  const message = query.get('message') || (isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại');
  const amount = query.get('amount');
  const orderId = query.get('orderId');
  const responseCode = query.get('responseCode');
  const txnRef = query.get('txnRef');
  const redirect = query.get('redirect');

  useEffect(() => {
    if (isSuccess && redirect === 'orders') {
      navigate('/orders', { replace: true });
    }
  }, [isSuccess, redirect, navigate]);

  const handleViewOrders = () => {
    navigate('/orders');
  };

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={isSuccess ? styles.iconSuccess : styles.iconFail}>
          {isSuccess ? '✓' : '✕'}
        </div>
        <h1>{isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}</h1>
        <p className={styles.message}>{message}</p>

        <div className={styles.details}>
          {orderId && (
            <div>
              <span>Mã đơn hàng</span>
              <strong>#{orderId}</strong>
            </div>
          )}
          {amount && (
            <div>
              <span>Số tiền</span>
              <strong>{formatCurrency(amount)}</strong>
            </div>
          )}
          {txnRef && (
            <div>
              <span>Mã giao dịch</span>
              <strong>{txnRef}</strong>
            </div>
          )}
          {responseCode && (
            <div>
              <span>Mã phản hồi</span>
              <strong>{responseCode}</strong>
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

