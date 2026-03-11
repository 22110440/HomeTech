import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { userAPI } from '../services/api';
import styles from './RepairBooking.module.css';

const INITIAL_FORM = {
  customerName: '',
  phone: '',
  deviceModel: '',
  appointmentDate: '',
  appointmentTime: '',
  servicePackage: '',
  note: ''
};

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(Number(value || 0));

function RepairBooking() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setMessage('Vui lòng đăng nhập để đặt lịch sửa chữa.');
          return;
        }

        const userRes = await api.get('/auth/user-info');
        if (!userRes.data?.success) {
          setMessage('Không thể lấy thông tin người dùng.');
          return;
        }

        const currentUser = userRes.data.data;
        setUserInfo(currentUser);

        const [packagesRes, historyRes] = await Promise.all([
          userAPI.getRepairPackages(),
          userAPI.getRepairHistory(currentUser.id)
        ]);

        const packageData = packagesRes?.data || [];
        setPackages(packageData);
        setFormData((prev) => ({
          ...prev,
          customerName: currentUser?.fullName || currentUser?.username || '',
          phone: currentUser?.phone || '',
          servicePackage: packageData[0]?.id ? String(packageData[0].id) : ''
        }));

        setBookings(historyRes?.data || []);
      } catch (error) {
        console.error(error);
        setMessage('Không thể tải dữ liệu sửa chữa.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selectedPackage = useMemo(
    () => packages.find((item) => String(item.id) === String(formData.servicePackage)),
    [packages, formData.servicePackage]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const reloadHistory = async (customerId) => {
    const historyRes = await userAPI.getRepairHistory(customerId);
    setBookings(historyRes?.data || []);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userInfo) return;

    try {
      setSubmitting(true);
      setMessage('');

      const payload = {
        customerId: userInfo.id,
        repairPackageId: Number(formData.servicePackage),
        customerName: formData.customerName,
        phone: formData.phone,
        deviceModel: formData.deviceModel,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        note: formData.note,
        paymentMethod: 'COD'
      };

      const response = await userAPI.createRepairBooking(payload);
      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Đặt lịch thất bại');
      }

      const created = response.data;
      setMessage('Đặt lịch thành công.');
      setFormData((prev) => ({ ...INITIAL_FORM, customerName: prev.customerName, phone: prev.phone, servicePackage: prev.servicePackage }));
      await reloadHistory(userInfo.id);

      navigate(`/repair-payment/${created.id}`);
    } catch (error) {
      console.error(error);
      setMessage(error?.response?.data?.error || error.message || 'Đặt lịch thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Đặt lịch sửa chữa điện thoại</h1>
          <p>Khách hàng sẽ chuyển sang trang thanh toán sau khi đặt lịch để chọn VNPAY/PayOS/COD.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/my-repair-schedules" className={styles.backLink}>Lịch của tôi</Link>
          <Link to="/" className={styles.backLink}>← Về trang chủ</Link>
        </div>
      </header>

      <section className={styles.packagesSection}>
        <h2>Gói dịch vụ sửa chữa từ hệ thống</h2>
        <div className={styles.packageGrid}>
          {packages.map((pkg) => (
            <article key={pkg.id} className={styles.packageCard}>
              <h3>{pkg.serviceName}</h3>
              <p><strong>Loại máy:</strong> {pkg.phoneType}</p>
              <p>{pkg.description}</p>
              <div className={styles.packageMeta}>
                <span>{formatCurrency(pkg.price)}</span>
                <span>{pkg.estimatedDurationMinutes} phút</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.bookingSection}>
        <h2>Thông tin đặt lịch</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Họ và tên
            <input name="customerName" value={formData.customerName} onChange={handleChange} required />
          </label>
          <label>
            Số điện thoại
            <input name="phone" value={formData.phone} onChange={handleChange} required pattern="[0-9]{9,11}" />
          </label>
          <label>
            Dòng máy
            <input name="deviceModel" value={formData.deviceModel} onChange={handleChange} required />
          </label>
          <label>
            Ngày sửa chữa
            <input name="appointmentDate" type="date" value={formData.appointmentDate} onChange={handleChange} required />
          </label>
          <label>
            Giờ dự kiến
            <input name="appointmentTime" type="time" value={formData.appointmentTime} onChange={handleChange} required />
          </label>
          <label>
            Gói dịch vụ
            <select name="servicePackage" value={formData.servicePackage} onChange={handleChange} required>
              <option value="">-- Chọn gói --</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>{pkg.serviceName} ({pkg.phoneType} / {pkg.serviceCategory}) - {formatCurrency(pkg.price)}</option>
              ))}
            </select>
          </label>
          <label className={styles.fullWidth}>
            Mô tả lỗi / Ghi chú
            <textarea name="note" value={formData.note} onChange={handleChange} rows={4} />
          </label>
          <button type="submit" className={styles.submitButton} disabled={submitting || loading || !packages.length}>
            {submitting ? 'Đang xử lý...' : 'Đặt lịch ngay'}
          </button>
        </form>
        {selectedPackage && (
          <p className={styles.success}>Tổng tạm tính: {formatCurrency(selectedPackage.price)}</p>
        )}
        {message && <p className={styles.empty}>{message}</p>}
      </section>

      <section className={styles.historySection}>
        <h2>Lịch sử sửa chữa</h2>
        {loading ? (
          <p className={styles.empty}>Đang tải...</p>
        ) : bookings.length === 0 ? (
          <p className={styles.empty}>Bạn chưa có lịch sửa chữa nào.</p>
        ) : (
          <div className={styles.historyList}>
            {bookings.map((booking) => (
              <article key={booking.id} className={styles.historyItem}>
                <div>
                  <h3>{booking.customerName} - {booking.deviceModel}</h3>
                  <p>{booking.repairPackage?.serviceName} ({booking.repairPackage?.phoneType} / {booking.repairPackage?.serviceCategory})</p>
                  <p>Thanh toán: {booking.paymentMethod}</p>
                </div>
                <div className={styles.historyMeta}>
                  <span>{booking.appointmentDate} {booking.appointmentTime}</span>
                  <strong>{formatCurrency(booking.totalAmount)}</strong>
                  <span>Trạng thái: {booking.status}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default RepairBooking;
