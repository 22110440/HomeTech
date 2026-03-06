import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './VouchersManagement.module.css';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayLabel = {
  MONDAY: 'Thứ 2',
  TUESDAY: 'Thứ 3',
  WEDNESDAY: 'Thứ 4',
  THURSDAY: 'Thứ 5',
  FRIDAY: 'Thứ 6',
  SATURDAY: 'Thứ 7',
  SUNDAY: 'Chủ nhật'
};
const sessions = ['Sáng', 'Chiều', 'Tối'];

const emptyForm = {
  customerId: '',
  repairPackageId: '',
  customerName: '',
  phone: '',
  deviceModel: '',
  appointmentDate: '',
  appointmentTime: '',
  note: '',
  paymentMethod: 'COD',
  status: 'PENDING'
};

function getSession(timeValue) {
  const hour = Number((timeValue || '00:00').split(':')[0]);
  if (hour < 12) return 'Sáng';
  if (hour < 18) return 'Chiều';
  return 'Tối';
}

export default function RepairSchedulesManagement() {
  const [bookings, setBookings] = useState([]);
  const [repairPackages, setRepairPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadData = async () => {
    const [bookingsRes, packagesRes] = await Promise.all([
      adminAPI.getAllRepairBookingsAdmin(),
      adminAPI.getAllRepairPackagesAdmin()
    ]);
    setBookings(bookingsRes?.data || []);
    setRepairPackages(packagesRes?.data || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const calendarMap = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.appointmentDate);
      if (Number.isNaN(date.getTime())) return;
      const jsDay = date.getDay();
      const dayEnum = days[jsDay === 0 ? 6 : jsDay - 1];
      const session = getSession(booking.appointmentTime);
      const key = `${dayEnum}_${session}`;
      if (!map[key]) map[key] = [];
      map[key].push(booking);
    });
    return map;
  }, [bookings]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (booking) => {
    setEditingId(booking.id);
    setForm({
      customerId: booking.customerId || '',
      repairPackageId: booking.repairPackage?.id || '',
      customerName: booking.customerName || '',
      phone: booking.phone || '',
      deviceModel: booking.deviceModel || '',
      appointmentDate: booking.appointmentDate || '',
      appointmentTime: booking.appointmentTime || '',
      note: booking.note || '',
      paymentMethod: booking.paymentMethod || 'COD',
      status: booking.status || 'PENDING'
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      customerId: Number(form.customerId),
      repairPackageId: Number(form.repairPackageId),
      customerName: form.customerName,
      phone: form.phone,
      deviceModel: form.deviceModel,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      note: form.note,
      paymentMethod: form.paymentMethod,
      status: form.status
    };

    if (editingId) {
      await adminAPI.updateRepairBookingAdmin(editingId, payload);
    } else {
      await adminAPI.createRepairBookingAdmin(payload);
    }
    setShowModal(false);
    await loadData();
  };

  const remove = async (bookingId) => {
    if (!window.confirm('Xóa lịch sửa chữa này?')) return;
    await adminAPI.deleteRepairBookingAdmin(bookingId);
    await loadData();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sửa chữa khách hàng</h1>
          <p className={styles.subtitle}>Lịch cập nhật tự động khi khách hàng đặt lịch, admin có thể thêm/sửa/xóa.</p>
        </div>
        <button className={styles.createButton} onClick={openCreate}>+ Thêm lịch</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              {sessions.map((s) => <th key={s}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d}>
                <td className={styles.codeCol}>{dayLabel[d]}</td>
                {sessions.map((session) => {
                  const key = `${d}_${session}`;
                  const list = calendarMap[key] || [];
                  return (
                    <td key={key}>
                      {list.map((booking) => (
                        <div key={booking.id} style={{ background: '#dcefff', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                          <div><strong>{booking.repairPackage?.serviceName}</strong></div>
                          <div>KH: {booking.customerName} - {booking.phone}</div>
                          <div>Máy: {booking.deviceModel}</div>
                          <div>Danh mục: {booking.repairPackage?.phoneType} / {booking.repairPackage?.serviceCategory}</div>
                          <div>Giờ: {booking.appointmentTime}</div>
                          <div>Trạng thái: {booking.status}</div>
                          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                            <button className={styles.actionButton} onClick={() => openEdit(booking)}>Sửa</button>
                            <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => remove(booking.id)}>Xóa</button>
                          </div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h2>{editingId ? 'Sửa lịch sửa chữa' : 'Thêm lịch sửa chữa'}</h2></div>
            <form className={styles.form} onSubmit={submit}>
              <input type="number" placeholder="Customer ID" value={form.customerId} onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))} required />
              <select value={form.repairPackageId} onChange={(e) => setForm((p) => ({ ...p, repairPackageId: e.target.value }))} required>
                <option value="">-- Chọn gói sửa chữa --</option>
                {repairPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{pkg.serviceName} ({pkg.phoneType} / {pkg.serviceCategory})</option>
                ))}
              </select>
              <input placeholder="Tên khách hàng" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} required />
              <input placeholder="SĐT" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
              <input placeholder="Dòng máy" value={form.deviceModel} onChange={(e) => setForm((p) => ({ ...p, deviceModel: e.target.value }))} required />
              <input type="date" value={form.appointmentDate} onChange={(e) => setForm((p) => ({ ...p, appointmentDate: e.target.value }))} required />
              <input type="time" value={form.appointmentTime} onChange={(e) => setForm((p) => ({ ...p, appointmentTime: e.target.value }))} required />
              <select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                <option value="COD">COD</option>
                <option value="VNPAY">VNPAY</option>
                <option value="PAYOS">PAYOS</option>
              </select>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="PENDING">PENDING</option>
                <option value="WAITING_PAYMENT">WAITING_PAYMENT</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <textarea rows={3} placeholder="Ghi chú" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
              <button type="submit" className={styles.submitButton}>Lưu lịch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
