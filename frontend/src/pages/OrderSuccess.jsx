import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './VnPayResult.module.css';

const paymentLabels = {
  COD: 'Thanh toán khi nhận hàng',
  VNPAY: 'VNPAY',
  PAYOS: 'PayOS',
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);

  const orderId = query.get('orderId');
  const amount = query.get('amount');
  const method = query.get('method') || 'COD';
  const paymentLabel = paymentLabels[method] || method;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.statusHeader}>
          <div className={styles.iconSuccess} aria-hidden="true">✓</div>
          <p className={styles.eyebrow}>HomeTech</p>
          <h1 className={styles.title}>Đơn hàng đã được đặt thành công</h1>
          <p className={styles.message}>
            HomeTech đã ghi nhận đơn hàng của bạn. Nhân viên sẽ kiểm tra, xác nhận và cập nhật trạng thái trong mục đơn hàng.
          </p>
        </div>

        <div className={styles.details}>
          <div>
            <span>Trạng thái</span>
            <strong className={styles.successText}>Đã đặt hàng</strong>
          </div>
          {orderId && (
            <div>
              <span>Mã đơn hàng</span>
              <strong>#{orderId}</strong>
            </div>
          )}
          <div>
            <span>Phương thức</span>
            <strong>{paymentLabel}</strong>
          </div>
          {amount && (
            <div>
              <span>Tổng thanh toán</span>
              <strong>{formatCurrency(amount)}</strong>
            </div>
          )}
        </div>

        <div className={styles.nextSteps}>
          <h2>Bước tiếp theo</h2>
          <ul>
            <li>Theo dõi trạng thái xử lý trong trang đơn hàng của tôi.</li>
            <li>Giữ điện thoại liên hệ để HomeTech xác nhận giao hàng khi cần.</li>
            <li>Kiểm tra sản phẩm và thanh toán cho nhân viên giao hàng nếu chọn COD.</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={() => navigate('/orders')} className={styles.primaryButton}>
            Xem đơn hàng
          </button>
          <Link to="/" className={styles.secondaryButton}>
            Tiếp tục mua hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
