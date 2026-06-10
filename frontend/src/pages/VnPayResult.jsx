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
  const source = query.get('source');
  const isRepairPayment = source === 'repair';

  const handleViewOrders = () => {
    navigate(isRepairPayment ? '/my-repair-schedules' : '/orders');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.statusHeader}>
          <div className={isSuccess ? styles.iconSuccess : styles.iconFail} aria-hidden="true">
            {isSuccess ? '✓' : '✕'}
          </div>
          <p className={styles.eyebrow}>VNPAY</p>
          <h1 className={styles.title}>
            {isSuccess
              ? isRepairPayment
                ? 'Lịch hẹn đã được thanh toán thành công'
                : 'Đơn hàng đã được thanh toán thành công'
              : 'Thanh toán VNPAY chưa thành công'}
          </h1>
          <p className={styles.message}>
            {message || (isSuccess
              ? 'HomeTech đã ghi nhận thanh toán. Bạn có thể theo dõi trạng thái xử lý trong tài khoản.'
              : 'Giao dịch chưa hoàn tất. Bạn có thể thử lại hoặc chọn phương thức thanh toán khác.')}
          </p>
        </div>

        <div className={styles.details}>
          <div>
            <span>Trạng thái</span>
            <strong className={isSuccess ? styles.successText : styles.failText}>
              {isSuccess ? 'Thành công' : 'Chưa hoàn tất'}
            </strong>
          </div>
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
            {isRepairPayment ? 'Xem lịch hẹn' : 'Xem đơn hàng'}
          </button>
          <Link to="/" className={styles.secondaryButton}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
