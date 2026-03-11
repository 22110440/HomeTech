import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { userAPI } from '../services/api';
import styles from './RepairBooking.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(Number(value || 0));

export default function RepairPayment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [method, setMethod] = useState('COD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await api.get('/auth/user-info');
        if (!userRes?.data?.success) {
          setMessage('Vui lòng đăng nhập để thanh toán.');
          return;
        }
        const historyRes = await userAPI.getRepairHistory(userRes.data.data.id);
        const item = (historyRes?.data || []).find((it) => String(it.id) === String(bookingId));
        if (!item) {
          setMessage('Không tìm thấy lịch sửa chữa cần thanh toán.');
          return;
        }
        setBooking(item);
        const requestedMethod = searchParams.get('method');
        setMethod(requestedMethod || item.paymentMethod || 'COD');
      } catch (error) {
        setMessage(error?.response?.data?.error || 'Không thể tải thông tin thanh toán.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId, searchParams]);

  const canPayOnline = useMemo(() => booking && booking.status !== 'PAID', [booking]);


  useEffect(() => {
    const autoPay = searchParams.get('autopay');
    if (!booking || loading || submitting || autoTriggered) return;
    if (autoPay !== '1') return;
    if (method !== 'VNPAY' && method !== 'PAYOS') return;
    setAutoTriggered(true);
    handleContinue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTriggered, booking, loading, method, searchParams]);

  const handleContinue = async () => {
    if (!booking) return;
    try {
      setSubmitting(true);
      setMessage('');
      await userAPI.updateRepairPaymentMethod(booking.id, method);

      if (method === 'COD') {
        navigate('/my-repair-schedules');
        return;
      }

      if (!canPayOnline) {
        navigate('/my-repair-schedules');
        return;
      }

      if (method === 'VNPAY') {
        const response = await userAPI.createRepairVnPayPayment(booking.id);
        if (response?.success && response.paymentUrl) {
          window.location.href = response.paymentUrl;
          return;
        }
      }

      if (method === 'PAYOS') {
        const response = await userAPI.createRepairPayOsPayment(booking.id);
        if (response?.success && response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
          return;
        }
      }

      setMessage('Không thể tạo link thanh toán.');
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || 'Thanh toán thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.page}><p>Đang tải thông tin thanh toán...</p></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Thanh toán lịch sửa chữa</h1>
          <p>Chọn VNPAY, PayOS hoặc tiền mặt trước khi kỹ thuật viên xử lý đơn.</p>
        </div>
        <Link className={styles.backLink} to="/my-repair-schedules">Lịch của tôi</Link>
      </header>

      {booking && (
        <section className={styles.bookingSection}>
          <h2>Đơn sửa chữa #{booking.id}</h2>
          <p><strong>Dịch vụ:</strong> {booking.repairPackage?.serviceName}</p>
          <p><strong>Thiết bị:</strong> {booking.deviceModel}</p>
          <p><strong>Lịch hẹn:</strong> {booking.appointmentDate} {booking.appointmentTime}</p>
          <p><strong>Tổng tiền:</strong> {formatCurrency(booking.totalAmount)}</p>

          <label>
            Chọn phương thức thanh toán
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="COD">Tiền mặt</option>
              <option value="VNPAY">VNPAY</option>
              <option value="PAYOS">PayOS</option>
            </select>
          </label>

          <button className={styles.submitButton} type="button" onClick={handleContinue} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : method === 'COD' ? 'Xác nhận thanh toán tiền mặt' : 'Tiếp tục đến cổng thanh toán'}
          </button>
        </section>
      )}

      {message && <p className={styles.empty}>{message}</p>}
    </div>
  );
}
