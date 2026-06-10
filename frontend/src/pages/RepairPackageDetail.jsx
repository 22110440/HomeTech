import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { userAPI } from '../services/api';
import styles from './RepairPackages.module.css';

export default function RepairPackageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [form, setForm] = useState({
    customerName: '', phone: '', deviceModel: '', appointmentDate: '', appointmentTime: '', note: '', paymentMethod: 'COD'
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [detailRes, userRes] = await Promise.all([
          userAPI.getRepairPackageDetail(id),
          api.get('/auth/user-info').catch(() => ({ data: { success: false } }))
        ]);
        setDetail(detailRes?.data || null);
        if (userRes?.data?.success) {
          const u = userRes.data.data;
          setUserInfo(u);
          setForm((p) => ({ ...p, customerName: u.fullName || u.username || '', phone: u.phone || '', deviceModel: detailRes?.data?.phoneType || '' }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userInfo) return alert('Vui lòng đăng nhập');
    const payload = {
      customerId: userInfo.id,
      repairPackageId: Number(id),
      customerName: form.customerName,
      phone: form.phone,
      deviceModel: form.deviceModel,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      note: form.note,
      paymentMethod: form.paymentMethod
    };
    const createRes = await userAPI.createRepairBooking(payload);
    if (!createRes?.success) return alert(createRes?.error || 'Đặt lịch thất bại');
    const bookingId = createRes.data.id;
    if (form.paymentMethod === 'VNPAY' || form.paymentMethod === 'PAYOS') {
      navigate(`/repair-payment/${bookingId}?autopay=1&method=${form.paymentMethod}`);
      return;
    }
    navigate('/my-repair-schedules');
  };

  if (!detail) return <div className={styles.page}><p>Đang tải chi tiết...</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{detail.serviceName}</h1>
      </div>
      {(detail.imageFileName || detail.imageUrl) && (
        <img
          src={detail.imageFileName ? `/api/repair-packages/${detail.id}/image` : detail.imageUrl}
          alt={detail.serviceName}
          className={styles.packageImage}
        />
      )}
      <p><strong>Loại máy:</strong> {detail.phoneType}</p>
      <p><strong>Danh mục dịch vụ:</strong> {detail.serviceCategory}</p>
      <p><strong>Giá:</strong> {Number(detail.price || 0).toLocaleString('vi-VN')} đ</p>
      <p>{detail.description}</p>

      <h2>Đặt lịch sửa chữa</h2>
      <form className={styles.form} onSubmit={submit}>
        <input placeholder="Họ tên" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} required />
        <input placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        <input placeholder="Dòng máy" value={form.deviceModel} onChange={(e) => setForm((p) => ({ ...p, deviceModel: e.target.value }))} required />
        <input type="date" value={form.appointmentDate} onChange={(e) => setForm((p) => ({ ...p, appointmentDate: e.target.value }))} required />
        <input type="time" value={form.appointmentTime} onChange={(e) => setForm((p) => ({ ...p, appointmentTime: e.target.value }))} required />
        <textarea placeholder="Ghi chú" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={4} />
        <label>
          Phương thức thanh toán
          <select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
            <option value="COD">Tiền mặt</option>
            <option value="VNPAY">VNPAY</option>
            <option value="PAYOS">PayOS</option>
          </select>
        </label>
        <button className={styles.btn} type="submit">Đặt lịch</button>
      </form>
    </div>
  );
}
