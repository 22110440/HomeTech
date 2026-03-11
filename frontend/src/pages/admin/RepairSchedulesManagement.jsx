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
  status: 'PENDING',
  progressNote: ''
};

function getSession(timeValue) {
  const hour = Number((timeValue || '00:00').split(':')[0]);
  if (hour < 12) return 'Sáng';
  if (hour < 18) return 'Chiều';
  return 'Tối';
}

function getCurrentWeekValue() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekDateRange(weekValue) {
  if (!weekValue || !weekValue.includes('-W')) return null;
  const [yearStr, weekStr] = weekValue.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  if (!year || !week) return null;

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dow + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  };
}


function shiftWeek(weekValue, offset) {
  const range = getWeekDateRange(weekValue);
  if (!range) return getCurrentWeekValue();
  const monday = new Date(`${range.start}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + (offset * 7));
  const dayNum = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((monday - yearStart) / 86400000) + 1) / 7);
  return `${monday.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
export default function RepairSchedulesManagement() {
  const [bookings, setBookings] = useState([]);
  const [repairPackages, setRepairPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekValue());
  const [loading, setLoading] = useState(true);

  const role = (localStorage.getItem('role') || '').toUpperCase();
  const isTechnician = role === 'THO';

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, packagesRes] = await Promise.all([
        adminAPI.getAllRepairBookingsAdmin(),
        adminAPI.getAllRepairPackagesAdmin()
      ]);
      setBookings(bookingsRes?.data || []);
      setRepairPackages(packagesRes?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const weekRange = useMemo(() => getWeekDateRange(selectedWeek), [selectedWeek]);

  const weekBookings = useMemo(() => {
    if (!weekRange) return bookings;
    return bookings.filter((booking) => {
      const date = booking.appointmentDate;
      return date && date >= weekRange.start && date <= weekRange.end;
    });
  }, [bookings, weekRange]);

  const calendarMap = useMemo(() => {
    const map = {};
    weekBookings.forEach((booking) => {
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
  }, [weekBookings]);

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
      status: booking.status || 'PENDING',
      progressNote: booking.progressNote || ''
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
      status: form.status,
      progressNote: form.progressNote
    };

    if (editingId) {
      await adminAPI.updateRepairBookingAdmin(editingId, payload);
      await adminAPI.updateRepairBookingProgressAdmin(editingId, { status: form.status, progressNote: form.progressNote });
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


  const confirmCashReceived = async (bookingId) => {
    try {
      await adminAPI.updateRepairBookingProgressAdmin(bookingId, {
        status: 'PAID',
        progressNote: 'Đã nhận tiền mặt từ khách hàng'
      });
      await loadData();
    } catch (error) {
      alert(error?.response?.data?.error || 'Không thể xác nhận đã nhận tiền mặt');
    }
  };

  const claimBooking = async (bookingId) => {
    try {
      await adminAPI.updateRepairBookingProgressAdmin(bookingId, {
        status: 'IN_PROGRESS',
        progressNote: 'Thợ đã nhận sửa chữa'
      });
      await loadData();
    } catch (error) {
      alert(error?.response?.data?.error || 'Không thể nhận sửa chữa');
    }
  };

  if (loading) return <div className={styles.loadingContainer}><p>Đang tải...</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sửa chữa khách hàng</h1>
          <p className={styles.subtitle}>Mặc định hiển thị tuần hiện tại, có thể lọc theo tuần để theo dõi.</p>
        </div>
        {!isTechnician && <button className={styles.createButton} onClick={openCreate}>+ Thêm lịch</button>}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 700 }}>Tuần:</label>
          <button type="button" className={styles.actionButton} onClick={() => setSelectedWeek((prev) => shiftWeek(prev, -1))}>← Tuần trước</button>
          <input type="week" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} />
          <button type="button" className={styles.actionButton} onClick={() => setSelectedWeek((prev) => shiftWeek(prev, 1))}>Tuần sau →</button>
          <button type="button" className={styles.actionButton} onClick={() => setSelectedWeek(getCurrentWeekValue())}>Tuần hiện tại</button>
          {weekRange && <span>{weekRange.start} → {weekRange.end}</span>}
        </div>
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
                        <div key={booking.id} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                          <div><strong>{booking.repairPackage?.serviceName}</strong></div>
                          <div>KH: {booking.customerName} - {booking.phone}</div>
                          <div>Máy: {booking.deviceModel}</div>
                          <div>Danh mục: {booking.repairPackage?.phoneType} / {booking.repairPackage?.serviceCategory}</div>
                          <div>Giờ: {booking.appointmentTime}</div>
                          <div>Trạng thái: <strong>{booking.status}</strong></div>
                          <div>KTV: {booking.technicianName || 'Chưa gán'}</div>
                          {booking.progressNote && <div>Tiến trình: {booking.progressNote}</div>}
                          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className={styles.actionButton} onClick={() => openEdit(booking)}>Cập nhật</button>
                            {(booking.status === 'PENDING' || booking.status === 'PAID' || booking.status === 'WAITING_PAYMENT') && (
                              <button className={styles.actionButton} onClick={() => claimBooking(booking.id)}>Nhận sửa chữa</button>
                            )}
                            {booking.paymentMethod === 'COD' && booking.status === 'WAITING_PAYMENT' && (
                              <button className={styles.actionButton} onClick={() => confirmCashReceived(booking.id)}>Xác nhận đã nhận tiền mặt</button>
                            )}
                            {!isTechnician && (
                              <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => remove(booking.id)}>Xóa</button>
                            )}
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
            <div className={styles.modalHeader}><h2>{editingId ? 'Cập nhật lịch sửa chữa' : 'Thêm lịch sửa chữa'}</h2></div>
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
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <textarea rows={3} placeholder="Ghi chú" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
              <textarea rows={3} placeholder="Ghi chú tiến trình" value={form.progressNote} onChange={(e) => setForm((p) => ({ ...p, progressNote: e.target.value }))} />
              <button type="submit" className={styles.submitButton}>Lưu lịch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
