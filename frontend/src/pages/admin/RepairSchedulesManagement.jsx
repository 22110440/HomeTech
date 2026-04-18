import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './RepairSchedulesManagement.module.css';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayLabels = {
  MONDAY: 'Thứ 2',
  TUESDAY: 'Thứ 3',
  WEDNESDAY: 'Thứ 4',
  THURSDAY: 'Thứ 5',
  FRIDAY: 'Thứ 6',
  SATURDAY: 'Thứ 7',
  SUNDAY: 'Chủ nhật',
};
const sessions = ['Sáng', 'Chiều', 'Tối'];
const statusLabels = {
  PENDING: 'Chờ tiếp nhận',
  WAITING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  IN_PROGRESS: 'Đang xử lý',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thất bại',
  COMPLETED: 'Hoàn thành',
};
const visualLabels = {
  Cracked: 'Nứt vỡ',
  Scratch: 'Trầy xước',
  Stain: 'Ố bẩn',
  'Oil-1': 'Loang màu mức 1',
  'Oil-2': 'Loang màu mức 2',
};
const emptyEditorForm = {
  bookingType: 'REPAIR', customerId: '', repairPackageId: '', customerName: '', phone: '', deviceModel: '',
  appointmentDate: '', appointmentTime: '', note: '', paymentMethod: 'COD', status: 'PENDING',
  estimatedTradeInAmount: '', tradeInConditionName: '', tradeInBatteryHealth: '',
};
const emptyProgressForm = {
  status: 'IN_PROGRESS', progressNote: '', estimatedTradeInAmount: '', finalTradeInAmount: '',
  tradeInConditionName: '', tradeInBatteryHealth: '', tradeInFunctionalStatus: '', tradeInVisualStatus: '',
  tradeInInspectionImages: [],
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
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}
function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatHealthScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Chưa có';
  return `${Math.round((numeric <= 1 ? numeric * 100 : numeric))}%`;
}
function normalizeLegacyText(value) {
  if (!value) return value;
  const normalized = String(value).trim();
  switch (normalized) {
    case 'Th? ?? nh?n s?a ch?a': return 'Thợ đã nhận sửa chữa';
    case 'Th? ?? nh?n m?y ?? ki?m tra v? b?o gi? c? th?': return 'Thợ đã nhận máy để kiểm tra và báo giá cụ thể';
    case '?? nh?n ti?n m?t t? kh?ch h?ng': return 'Đã nhận tiền mặt từ khách hàng';
    case '?a s?a xong - ch? x?c nh?n ?? nh?n ti?n m?t': return 'Đã sửa xong - chờ xác nhận đã nhận tiền mặt';
    default: return value;
  }
}
function bookingTitle(booking) { return booking.bookingType === 'TRADE_IN' ? 'Thu cũ đổi mới' : (booking.repairPackage?.serviceName || 'Lịch sửa chữa'); }
function isTerminalStatus(status) { return status === 'COMPLETED' || status === 'CANCELLED' || status === 'FAILED'; }
function getDefaultClaimNote(bookingType) { return bookingType === 'TRADE_IN' ? 'Thợ đã nhận máy để kiểm tra và báo giá cụ thể' : 'Thợ đã nhận sửa chữa'; }
function getRangeLabel(booking) {
  if (booking.tradeInOfferRangeMin || booking.tradeInOfferRangeMax) {
    return `${formatCurrency(booking.tradeInOfferRangeMin)} - ${formatCurrency(booking.tradeInOfferRangeMax)}`;
  }
  return formatCurrency(booking.estimatedTradeInAmount || booking.totalAmount);
}
function getPreviewSrc(value) { return !value ? '' : (String(value).startsWith('data:') ? value : `data:image/jpeg;base64,${value}`); }
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function createEditorForm(booking) {
  if (!booking) return { ...emptyEditorForm };
  return {
    bookingType: booking.bookingType || 'REPAIR', customerId: booking.customerId ? String(booking.customerId) : '',
    repairPackageId: booking.repairPackage?.id ? String(booking.repairPackage.id) : '', customerName: booking.customerName || '',
    phone: booking.phone || '', deviceModel: booking.deviceModel || '', appointmentDate: booking.appointmentDate || '',
    appointmentTime: booking.appointmentTime || '', note: booking.note || '', paymentMethod: booking.paymentMethod || 'COD',
    status: booking.status || 'PENDING', estimatedTradeInAmount: booking.estimatedTradeInAmount != null ? String(booking.estimatedTradeInAmount) : '',
    tradeInConditionName: booking.tradeInConditionName || '', tradeInBatteryHealth: booking.tradeInBatteryHealth != null ? String(booking.tradeInBatteryHealth) : '',
  };
}
function createProgressForm(booking) {
  if (!booking) return { ...emptyProgressForm };
  const status = booking.status === 'PENDING' || booking.status === 'WAITING_PAYMENT' || booking.status === 'PAID' ? 'IN_PROGRESS' : (booking.status || 'IN_PROGRESS');
  return {
    status, progressNote: normalizeLegacyText(booking.progressNote) || '', estimatedTradeInAmount: booking.estimatedTradeInAmount != null ? String(booking.estimatedTradeInAmount) : '',
    finalTradeInAmount: booking.finalTradeInAmount != null ? String(booking.finalTradeInAmount) : '', tradeInConditionName: booking.tradeInConditionName || '',
    tradeInBatteryHealth: booking.tradeInBatteryHealth != null ? String(booking.tradeInBatteryHealth) : '', tradeInFunctionalStatus: booking.tradeInFunctionalStatus || '',
    tradeInVisualStatus: booking.tradeInVisualStatus || '', tradeInInspectionImages: [...(booking.tradeInInspectionImages || [])],
  };
}

export default function RepairSchedulesManagement() {
  const [bookings, setBookings] = useState([]);
  const [repairPackages, setRepairPackages] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editorBooking, setEditorBooking] = useState(null);
  const [editorForm, setEditorForm] = useState({ ...emptyEditorForm });
  const [detailBooking, setDetailBooking] = useState(null);
  const [progressForm, setProgressForm] = useState({ ...emptyProgressForm });
  const role = (localStorage.getItem('role') || '').toUpperCase();
  const isTechnician = role === 'THO';

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, packagesRes] = await Promise.all([adminAPI.getAllRepairBookingsAdmin(), adminAPI.getAllRepairPackagesAdmin()]);
      setBookings(bookingsRes?.data || []);
      setRepairPackages(packagesRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Không thể tải lịch sửa chữa và thu cũ đổi mới.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const weekRange = useMemo(() => getWeekDateRange(selectedWeek), [selectedWeek]);
  const weekBookings = useMemo(() => !weekRange ? bookings : bookings.filter((booking) => booking.appointmentDate >= weekRange.start && booking.appointmentDate <= weekRange.end), [bookings, weekRange]);
  const calendarMap = useMemo(() => {
    const map = {};
    weekBookings.forEach((booking) => {
      const date = new Date(booking.appointmentDate);
      if (Number.isNaN(date.getTime())) return;
      const jsDay = date.getDay();
      const dayKey = days[jsDay === 0 ? 6 : jsDay - 1];
      const key = `${dayKey}_${getSession(booking.appointmentTime)}`;
      if (!map[key]) map[key] = [];
      map[key].push(booking);
    });
    return map;
  }, [weekBookings]);

  function openCreate() {
    setEditorBooking(null);
    setEditorForm({ ...emptyEditorForm });
    setShowEditor(true);
    setError('');
  }
  function openEdit(booking) {
    if (isTerminalStatus(booking.status)) {
      setError('Lịch đã kết thúc nên không thể chỉnh lại thông tin hẹn.');
      return;
    }
    setEditorBooking(booking);
    setEditorForm(createEditorForm(booking));
    setShowEditor(true);
    setError('');
  }
  function closeEditor() {
    setShowEditor(false);
    setEditorBooking(null);
    setEditorForm({ ...emptyEditorForm });
  }
  function openDetails(booking) {
    setDetailBooking(booking);
    setProgressForm(createProgressForm(booking));
    setError('');
  }
  function closeDetails() {
    setDetailBooking(null);
    setProgressForm({ ...emptyProgressForm });
  }
  function updateEditorField(key, value) { setEditorForm((current) => ({ ...current, [key]: value })); }
  function updateProgressField(key, value) { setProgressForm((current) => ({ ...current, [key]: value })); }

  async function handleEditorSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const payload = {
        bookingType: editorForm.bookingType,
        customerId: Number(editorForm.customerId),
        repairPackageId: editorForm.bookingType === 'REPAIR' ? Number(editorForm.repairPackageId) : null,
        customerName: editorForm.customerName,
        phone: editorForm.phone,
        deviceModel: editorForm.deviceModel,
        appointmentDate: editorForm.appointmentDate,
        appointmentTime: editorForm.appointmentTime,
        note: editorForm.note,
        paymentMethod: editorForm.bookingType === 'REPAIR' ? editorForm.paymentMethod : 'COD',
        status: editorBooking?.status || editorForm.status,
        estimatedTradeInAmount: editorForm.bookingType === 'TRADE_IN' ? Number(editorForm.estimatedTradeInAmount || 0) : null,
        tradeInConditionName: editorForm.bookingType === 'TRADE_IN' ? editorForm.tradeInConditionName : '',
        tradeInBatteryHealth: editorForm.bookingType === 'TRADE_IN' && editorForm.tradeInBatteryHealth !== '' ? Number(editorForm.tradeInBatteryHealth) : null,
      };
      if (editorBooking) {
        await adminAPI.updateRepairBookingAdmin(editorBooking.id, payload);
        setSuccessMessage('Đã cập nhật lịch hẹn.');
      } else {
        await adminAPI.createRepairBookingAdmin(payload);
        setSuccessMessage('Đã tạo lịch hẹn mới.');
      }
      closeEditor();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || 'Không thể lưu lịch hẹn.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bookingId) {
    if (!window.confirm('Bạn có chắc muốn xóa lịch hẹn này không?')) return;
    try {
      setError('');
      setSuccessMessage('');
      await adminAPI.deleteRepairBookingAdmin(bookingId);
      setSuccessMessage('Đã xóa lịch hẹn.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || 'Không thể xóa lịch hẹn.');
    }
  }

  async function handleClaimBooking(booking) {
    try {
      setError('');
      setSuccessMessage('');
      const response = await adminAPI.updateRepairBookingProgressAdmin(booking.id, {
        status: 'IN_PROGRESS',
        progressNote: getDefaultClaimNote(booking.bookingType),
        estimatedTradeInAmount: booking.bookingType === 'TRADE_IN' ? Number(booking.estimatedTradeInAmount || 0) : null,
        tradeInConditionName: booking.tradeInConditionName || '',
        tradeInBatteryHealth: booking.tradeInBatteryHealth,
        tradeInFunctionalStatus: booking.tradeInFunctionalStatus || '',
        tradeInVisualStatus: booking.tradeInVisualStatus || '',
        tradeInInspectionImages: booking.tradeInInspectionImages || [],
      });
      const updated = response?.data;
      setSuccessMessage(booking.bookingType === 'TRADE_IN' ? 'Thợ đã nhận máy để kiểm tra.' : 'Thợ đã nhận sửa chữa.');
      if (detailBooking?.id === booking.id) {
        setDetailBooking(updated || booking);
        setProgressForm(createProgressForm(updated || booking));
      }
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || 'Không thể nhận lịch hẹn này.');
    }
  }

  async function handleInspectionFilesChange(event) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    const images = await Promise.all(files.map(fileToDataUrl));
    setProgressForm((current) => ({ ...current, tradeInInspectionImages: [...(current.tradeInInspectionImages || []), ...images].slice(0, 6) }));
    event.target.value = '';
  }

  async function handleProgressSubmit(event) {
    event.preventDefault();
    if (!detailBooking) return;
    if (detailBooking.bookingType === 'TRADE_IN' && progressForm.status === 'COMPLETED' && progressForm.finalTradeInAmount === '') {
      setError('Cần nhập giá thu cũ cụ thể trước khi hoàn thành giao dịch.');
      return;
    }
    setSubmittingProgress(true);
    setError('');
    setSuccessMessage('');
    try {
      const payload = {
        status: progressForm.status,
        progressNote: progressForm.progressNote,
        estimatedTradeInAmount: detailBooking.bookingType === 'TRADE_IN' && progressForm.estimatedTradeInAmount !== '' ? Number(progressForm.estimatedTradeInAmount) : null,
        finalTradeInAmount: detailBooking.bookingType === 'TRADE_IN' && progressForm.finalTradeInAmount !== '' ? Number(progressForm.finalTradeInAmount) : null,
        tradeInConditionName: detailBooking.bookingType === 'TRADE_IN' ? progressForm.tradeInConditionName : '',
        tradeInBatteryHealth: detailBooking.bookingType === 'TRADE_IN' && progressForm.tradeInBatteryHealth !== '' ? Number(progressForm.tradeInBatteryHealth) : null,
        tradeInFunctionalStatus: detailBooking.bookingType === 'TRADE_IN' ? progressForm.tradeInFunctionalStatus : '',
        tradeInVisualStatus: detailBooking.bookingType === 'TRADE_IN' ? progressForm.tradeInVisualStatus : '',
        tradeInInspectionImages: detailBooking.bookingType === 'TRADE_IN' ? progressForm.tradeInInspectionImages : [],
      };
      const response = await adminAPI.updateRepairBookingProgressAdmin(detailBooking.id, payload);
      const updated = response?.data;
      setDetailBooking(updated || detailBooking);
      setProgressForm(createProgressForm(updated || detailBooking));
      setSuccessMessage('Đã cập nhật tiến trình cho lịch hẹn.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || 'Không thể cập nhật tiến trình.');
    } finally {
      setSubmittingProgress(false);
    }
  }

  function getProgressOptions(bookingType) {
    if (bookingType === 'TRADE_IN') {
      return isTechnician ? ['IN_PROGRESS', 'COMPLETED', 'FAILED'] : ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'];
    }
    return ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'];
  }

  if (loading) {
    return <div className={styles.loadingState}><p>Đang tải lịch hẹn...</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sửa chữa và thu cũ đổi mới</h1>
          <p className={styles.subtitle}>Thợ có thể nhận việc, cập nhật trạng thái và xử lý báo giá thu cũ ngay trên cùng một màn hình.</p>
        </div>
        {!isTechnician && <button type="button" className={styles.primaryButton} onClick={openCreate}>Thêm lịch hẹn</button>}
      </div>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
      <div className={styles.toolbar}>
        <label className={styles.weekPicker}>
          <span>Tuần hiển thị</span>
          <input type="week" value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)} />
        </label>
        {weekRange && <span className={styles.rangeText}>{weekRange.start} - {weekRange.end}</span>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.calendar}>
          <thead>
            <tr>
              <th className={styles.dayColumn}>Ngày</th>
              {sessions.map((session) => <th key={session}>{session}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className={styles.dayLabel}>{dayLabels[day]}</td>
                {sessions.map((session) => {
                  const key = `${day}_${session}`;
                  const list = calendarMap[key] || [];
                  return (
                    <td key={key} className={styles.cell}>
                      {list.length === 0 ? (
                        <div className={styles.emptyCell}>Không có lịch</div>
                      ) : (
                        list.map((booking) => {
                          const terminal = isTerminalStatus(booking.status);
                          const canClaim = !terminal && (booking.status === 'PENDING' || booking.status === 'WAITING_PAYMENT' || booking.status === 'PAID');
                          return (
                            <article key={booking.id} className={styles.bookingCard}>
                              <div className={styles.cardHeader}>
                                <strong>{bookingTitle(booking)}</strong>
                                <span className={styles.statusBadge}>{statusLabels[booking.status] || booking.status}</span>
                              </div>
                              <div className={styles.infoLine}><span>Khách:</span><strong>{booking.customerName}</strong></div>
                              <div className={styles.infoLine}><span>Kiểu máy:</span><strong>{booking.deviceModel}</strong></div>
                              <div className={styles.infoLine}><span>Giờ hẹn:</span><strong>{booking.appointmentTime}</strong></div>
                              {booking.bookingType === 'TRADE_IN' ? (
                                <>
                                  <div className={styles.infoLine}><span>Tình trạng:</span><strong>{booking.tradeInConditionName || 'Chưa có'}</strong></div>
                                  <div className={styles.infoLine}><span>Sức khỏe:</span><strong>{formatHealthScore(booking.tradeInHealthScore)}</strong></div>
                                  <div className={styles.infoLine}><span>Pin:</span><strong>{booking.tradeInBatteryHealth != null ? `${booking.tradeInBatteryHealth}%` : 'Chưa có'}</strong></div>
                                  <div className={styles.infoLine}><span>Khoảng giá:</span><strong>{getRangeLabel(booking)}</strong></div>
                                </>
                              ) : (
                                <>
                                  <div className={styles.infoLine}><span>Dịch vụ:</span><strong>{booking.repairPackage?.serviceCategory || 'Chưa chọn'}</strong></div>
                                  <div className={styles.infoLine}><span>Giá dịch vụ:</span><strong>{formatCurrency(booking.totalAmount)}</strong></div>
                                </>
                              )}
                              <div className={styles.infoLine}><span>Thợ phụ trách:</span><strong>{booking.technicianName || 'Chưa có'}</strong></div>
                              {booking.progressNote && <p className={styles.noteText}>Tiến trình: {normalizeLegacyText(booking.progressNote)}</p>}
                              <div className={styles.actionRow}>
                                <button type="button" className={styles.secondaryButton} onClick={() => openDetails(booking)}>Chi tiết</button>
                                {canClaim && <button type="button" className={styles.primaryButton} onClick={() => handleClaimBooking(booking)}>{booking.bookingType === 'TRADE_IN' ? 'Nhận kiểm tra' : 'Nhận sửa chữa'}</button>}
                                {!isTechnician && !terminal && <button type="button" className={styles.secondaryButton} onClick={() => openEdit(booking)}>Sửa lịch</button>}
                                {!isTechnician && <button type="button" className={styles.dangerButton} onClick={() => handleDelete(booking.id)}>Xóa</button>}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditor && (
        <div className={styles.modalBackdrop} onClick={closeEditor}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editorBooking ? 'Cập nhật lịch hẹn' : 'Tạo lịch hẹn mới'}</h2>
                <p className={styles.muted}>Form này dùng để chỉnh thông tin hẹn cơ bản. Phần kỹ thuật được xử lý ở màn chi tiết.</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeEditor}>Đóng</button>
            </div>
            <form className={styles.formGrid} onSubmit={handleEditorSubmit}>
              <label>
                Loại lịch
                <select value={editorForm.bookingType} onChange={(event) => updateEditorField('bookingType', event.target.value)} disabled={Boolean(editorBooking)}>
                  <option value="REPAIR">Sửa chữa</option>
                  <option value="TRADE_IN">Thu cũ đổi mới</option>
                </select>
              </label>
              <label>
                ID khách hàng
                <input type="number" value={editorForm.customerId} onChange={(event) => updateEditorField('customerId', event.target.value)} required />
              </label>
              {editorForm.bookingType === 'REPAIR' && (
                <label>
                  Gói sửa chữa
                  <select value={editorForm.repairPackageId} onChange={(event) => updateEditorField('repairPackageId', event.target.value)} required>
                    <option value="">Chọn gói sửa chữa</option>
                    {repairPackages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.serviceName} - {pkg.phoneType} / {pkg.serviceCategory}</option>)}
                  </select>
                </label>
              )}
              <label>
                Họ và tên
                <input value={editorForm.customerName} onChange={(event) => updateEditorField('customerName', event.target.value)} required />
              </label>
              <label>
                Số điện thoại
                <input value={editorForm.phone} onChange={(event) => updateEditorField('phone', event.target.value)} required />
              </label>
              <label>
                Kiểu máy
                <input value={editorForm.deviceModel} onChange={(event) => updateEditorField('deviceModel', event.target.value)} required />
              </label>
              <label>
                Ngày hẹn
                <input type="date" value={editorForm.appointmentDate} onChange={(event) => updateEditorField('appointmentDate', event.target.value)} required />
              </label>
              <label>
                Giờ hẹn
                <input type="time" value={editorForm.appointmentTime} onChange={(event) => updateEditorField('appointmentTime', event.target.value)} required />
              </label>
              {editorForm.bookingType === 'REPAIR' ? (
                <label>
                  Phương thức thanh toán
                  <select value={editorForm.paymentMethod} onChange={(event) => updateEditorField('paymentMethod', event.target.value)}>
                    <option value="COD">COD</option>
                    <option value="VNPAY">VNPAY</option>
                    <option value="PAYOS">PAYOS</option>
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    Giá AI ước lượng
                    <input type="number" value={editorForm.estimatedTradeInAmount} onChange={(event) => updateEditorField('estimatedTradeInAmount', event.target.value)} required />
                  </label>
                  <label>
                    Tình trạng máy
                    <input value={editorForm.tradeInConditionName} onChange={(event) => updateEditorField('tradeInConditionName', event.target.value)} />
                  </label>
                  <label>
                    % pin
                    <input type="number" min="0" max="100" value={editorForm.tradeInBatteryHealth} onChange={(event) => updateEditorField('tradeInBatteryHealth', event.target.value)} />
                  </label>
                </>
              )}
              <label className={styles.fullWidth}>
                Ghi chú lịch hẹn
                <textarea rows={3} value={editorForm.note} onChange={(event) => updateEditorField('note', event.target.value)} />
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeEditor}>Hủy</button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu lịch hẹn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {detailBooking && (
        <div className={styles.modalBackdrop} onClick={closeDetails}>
          <div className={styles.detailModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{detailBooking.bookingType === 'TRADE_IN' ? 'Chi tiết lịch thu cũ đổi mới' : 'Chi tiết lịch sửa chữa'}</h2>
                <p className={styles.muted}>Theo dõi thông tin lịch hẹn, dữ liệu AI và thao tác kỹ thuật của thợ.</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeDetails}>Đóng</button>
            </div>
            <div className={styles.detailGrid}>
              <section className={styles.sectionCard}>
                <h3>Thông tin chung</h3>
                <div className={styles.summaryGrid}>
                  <div><span>Khách hàng</span><strong>{detailBooking.customerName}</strong></div>
                  <div><span>Số điện thoại</span><strong>{detailBooking.phone}</strong></div>
                  <div><span>Kiểu máy</span><strong>{detailBooking.deviceModel}</strong></div>
                  <div><span>Ngày hẹn</span><strong>{detailBooking.appointmentDate} - {detailBooking.appointmentTime}</strong></div>
                  <div><span>Trạng thái</span><strong>{statusLabels[detailBooking.status] || detailBooking.status}</strong></div>
                  <div><span>Thợ phụ trách</span><strong>{detailBooking.technicianName || 'Chưa có'}</strong></div>
                </div>
                {detailBooking.note && <p className={styles.sectionNote}>{detailBooking.note}</p>}
                {detailBooking.progressNote && <p className={styles.sectionNote}>Tiến trình hiện tại: {normalizeLegacyText(detailBooking.progressNote)}</p>}
              </section>

              {detailBooking.bookingType === 'REPAIR' ? (
                <section className={styles.sectionCard}>
                  <h3>Thông tin sửa chữa</h3>
                  <div className={styles.summaryGrid}>
                    <div><span>Dịch vụ</span><strong>{detailBooking.repairPackage?.serviceName || 'Chưa có'}</strong></div>
                    <div><span>Danh mục</span><strong>{detailBooking.repairPackage?.serviceCategory || 'Chưa có'}</strong></div>
                    <div><span>Dòng hỗ trợ</span><strong>{detailBooking.repairPackage?.phoneType || 'Chưa có'}</strong></div>
                    <div><span>Thanh toán</span><strong>{detailBooking.paymentMethod || 'Chưa có'}</strong></div>
                    <div><span>Giá dịch vụ</span><strong>{formatCurrency(detailBooking.totalAmount)}</strong></div>
                    <div><span>Bắt đầu lúc</span><strong>{detailBooking.startedAt || 'Chưa bắt đầu'}</strong></div>
                  </div>
                </section>
              ) : (
                <>
                  <section className={styles.sectionCard}>
                    <h3>Tóm tắt thu cũ</h3>
                    <div className={styles.summaryGrid}>
                      <div><span>Tình trạng AI</span><strong>{detailBooking.tradeInConditionName || 'Chưa có'}</strong></div>
                      <div><span>Sức khỏe máy</span><strong>{formatHealthScore(detailBooking.tradeInHealthScore)}</strong></div>
                      <div><span>% pin</span><strong>{detailBooking.tradeInBatteryHealth != null ? `${detailBooking.tradeInBatteryHealth}%` : 'Chưa có'}</strong></div>
                      <div><span>Khoảng giá AI</span><strong>{getRangeLabel(detailBooking)}</strong></div>
                      <div><span>Giá AI đề xuất</span><strong>{formatCurrency(detailBooking.estimatedTradeInAmount)}</strong></div>
                      <div><span>Giá chốt</span><strong>{detailBooking.finalTradeInAmount != null ? formatCurrency(detailBooking.finalTradeInAmount) : 'Chưa chốt'}</strong></div>
                    </div>
                    {detailBooking.tradeInConditionDescription && <p className={styles.sectionNote}>{detailBooking.tradeInConditionDescription}</p>}
                    <div className={styles.summaryGrid}>
                      <div><span>Chức năng</span><strong>{detailBooking.tradeInFunctionalStatus || 'Chưa có mô tả'}</strong></div>
                      <div><span>Ngoại hình</span><strong>{detailBooking.tradeInVisualStatus || 'Chưa có mô tả'}</strong></div>
                    </div>
                  </section>
                  <section className={styles.sectionCard}>
                    <h3>Ảnh ngoại hình đã phân tích</h3>
                    {(detailBooking.tradeInAiImageResults || []).length === 0 ? (
                      <p className={styles.muted}>Khách hàng chưa gửi ảnh AI kèm theo lịch hẹn này.</p>
                    ) : (
                      <div className={styles.imageGrid}>
                        {detailBooking.tradeInAiImageResults.map((item, index) => (
                          <article key={`${item.side || 'image'}-${index}`} className={styles.imageCard}>
                            <div className={styles.cardHeader}><strong>{item.side === 'front' ? 'Mặt trước' : item.side === 'back' ? 'Mặt sau' : `Ảnh ${index + 1}`}</strong></div>
                            {item.annotated_image ? <img className={styles.previewImage} src={getPreviewSrc(item.annotated_image)} alt={item.side || `Ảnh ${index + 1}`} /> : <div className={styles.emptyPreview}>Không có ảnh đánh dấu</div>}
                            <ul className={styles.compactList}>
                              {(item.detections || []).length === 0 ? <li>Không phát hiện lỗi ngoại hình.</li> : item.detections.map((detection, detectionIndex) => (
                                <li key={`${detection.label || 'issue'}-${detectionIndex}`}>{visualLabels[detection.label] || detection.label} ({Math.round((detection.confidence || 0) * 100)}%)</li>
                              ))}
                            </ul>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                  <section className={styles.sectionCard}>
                    <h3>Video và ảnh cắt từ video</h3>
                    {detailBooking.tradeInVideoDataUrl ? <video className={styles.videoPlayer} controls src={detailBooking.tradeInVideoDataUrl} /> : <p className={styles.muted}>Khách hàng chưa gửi video cho lịch hẹn này.</p>}
                    {(detailBooking.tradeInVideoAnalysis?.crops || []).length > 0 && (
                      <>
                        <div className={styles.summaryGrid}>
                          <div><span>Khung hình đã quét</span><strong>{detailBooking.tradeInVideoAnalysis.frames_analyzed || 0}</strong></div>
                          <div><span>Tổng lỗi bắt được</span><strong>{(detailBooking.tradeInVideoAnalysis.findings || []).length}</strong></div>
                          <div><span>Số loại lỗi</span><strong>{Object.keys(detailBooking.tradeInVideoAnalysis.counts || {}).length}</strong></div>
                        </div>
                        <div className={styles.cropGrid}>
                          {detailBooking.tradeInVideoAnalysis.crops.map((crop, index) => (
                            <figure key={`${crop.label || 'crop'}-${index}`} className={styles.cropCard}>
                              <img className={styles.cropImage} src={getPreviewSrc(crop.image)} alt={crop.label || `Crop ${index + 1}`} />
                              <figcaption>{visualLabels[crop.label] || crop.label} - frame {crop.frame_index}</figcaption>
                            </figure>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                  <section className={styles.sectionCard}>
                    <h3>Ảnh kiểm tra thực tế của thợ</h3>
                    {(progressForm.tradeInInspectionImages || []).length === 0 ? <p className={styles.muted}>Chưa có ảnh kiểm tra thực tế.</p> : (
                      <div className={styles.imageGrid}>
                        {progressForm.tradeInInspectionImages.map((image, index) => <img key={`inspection-${index}`} className={styles.previewImage} src={getPreviewSrc(image)} alt={`Ảnh kiểm tra ${index + 1}`} />)}
                      </div>
                    )}
                  </section>
                </>
              )}
              <section className={styles.sectionCard}>
                <h3>{detailBooking.bookingType === 'TRADE_IN' ? 'Thao tác của thợ cho thu cũ' : 'Thao tác của thợ cho sửa chữa'}</h3>
                {isTerminalStatus(detailBooking.status) ? (
                  <div className={styles.lockedBox}>Lịch hẹn này đã ở trạng thái kết thúc nên không thể cập nhật thêm.</div>
                ) : (
                  <form className={styles.formGrid} onSubmit={handleProgressSubmit}>
                    <label>
                      Trạng thái mới
                      <select value={progressForm.status} onChange={(event) => updateProgressField('status', event.target.value)}>
                        {getProgressOptions(detailBooking.bookingType).map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
                      </select>
                    </label>
                    {detailBooking.bookingType === 'TRADE_IN' && (
                      <>
                        <label>
                          Giá AI ước lượng
                          <input type="number" value={progressForm.estimatedTradeInAmount} onChange={(event) => updateProgressField('estimatedTradeInAmount', event.target.value)} />
                        </label>
                        <label>
                          Giá thu cũ cụ thể
                          <input type="number" value={progressForm.finalTradeInAmount} onChange={(event) => updateProgressField('finalTradeInAmount', event.target.value)} placeholder="Nhập khi chốt giao dịch" />
                        </label>
                        <label>
                          Tình trạng máy
                          <input value={progressForm.tradeInConditionName} onChange={(event) => updateProgressField('tradeInConditionName', event.target.value)} />
                        </label>
                        <label>
                          % pin thực tế
                          <input type="number" min="0" max="100" value={progressForm.tradeInBatteryHealth} onChange={(event) => updateProgressField('tradeInBatteryHealth', event.target.value)} />
                        </label>
                        <label className={styles.fullWidth}>
                          Mô tả chức năng
                          <textarea rows={3} value={progressForm.tradeInFunctionalStatus} onChange={(event) => updateProgressField('tradeInFunctionalStatus', event.target.value)} placeholder="Ví dụ: Camera sau lấy nét chậm, loa ngoài bình thường, cổng sạc hơi lỏng." />
                        </label>
                        <label className={styles.fullWidth}>
                          Mô tả ngoại hình
                          <textarea rows={3} value={progressForm.tradeInVisualStatus} onChange={(event) => updateProgressField('tradeInVisualStatus', event.target.value)} placeholder="Ví dụ: Mặt trước có 1 vết nứt góc phải, mặt sau trầy nhẹ quanh camera." />
                        </label>
                        <label className={styles.fullWidth}>
                          Ảnh kiểm tra thực tế
                          <input type="file" accept="image/*" multiple onChange={handleInspectionFilesChange} />
                        </label>
                      </>
                    )}
                    <label className={styles.fullWidth}>
                      Ghi chú tiến trình
                      <textarea
                        rows={3}
                        value={progressForm.progressNote}
                        onChange={(event) => updateProgressField('progressNote', event.target.value)}
                        placeholder={detailBooking.bookingType === 'TRADE_IN' ? 'Ví dụ: Đã kiểm tra xong, máy đúng như mô tả ban đầu, đề xuất chốt giá 5.200.000 đ.' : 'Ví dụ: Đang thay màn hình, dự kiến hoàn tất trong ngày.'}
                      />
                    </label>
                    <div className={styles.modalActions}>
                      {(detailBooking.status === 'PENDING' || detailBooking.status === 'WAITING_PAYMENT' || detailBooking.status === 'PAID') && (
                        <button type="button" className={styles.secondaryButton} onClick={() => handleClaimBooking(detailBooking)}>
                          {detailBooking.bookingType === 'TRADE_IN' ? 'Nhận kiểm tra máy' : 'Nhận sửa chữa'}
                        </button>
                      )}
                      <button type="submit" className={styles.primaryButton} disabled={submittingProgress}>{submittingProgress ? 'Đang cập nhật...' : 'Lưu tiến trình'}</button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
