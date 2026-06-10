import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { userAPI } from '../services/api';
import styles from './RepairPackages.module.css';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayLabel = {
  MONDAY: 'Thứ 2',
  TUESDAY: 'Thứ 3',
  WEDNESDAY: 'Thứ 4',
  THURSDAY: 'Thứ 5',
  FRIDAY: 'Thứ 6',
  SATURDAY: 'Thứ 7',
  SUNDAY: 'Chủ nhật',
};

const sessions = ['Sáng', 'Chiều', 'Tối'];

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
    end: sunday.toISOString().slice(0, 10),
  };
}

function isValidWeekValue(weekValue) {
  return /^\d{4}-W\d{2}$/.test(String(weekValue || '')) && Boolean(getWeekDateRange(weekValue));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeLegacyText(value) {
  if (!value) return value;
  const normalized = String(value).trim();
  switch (normalized) {
    case 'Th? ?? nh?n s?a ch?a':
      return 'Thợ đã nhận sửa chữa';
    case 'Th? ?? nh?n m?y ?? ki?m tra v? b?o gi? c? th?':
      return 'Thợ đã nhận máy để kiểm tra và báo giá cụ thể';
    case '?? nh?n ti?n m?t t? kh?ch h?ng':
      return 'Đã nhận tiền mặt từ khách hàng';
    case '?a s?a xong - ch? x?c nh?n ?? nh?n ti?n m?t':
      return 'Đã sửa xong - chờ xác nhận đã nhận tiền mặt';
    default:
      return value;
  }
}

function formatBookingTitle(booking) {
  return booking.bookingType === 'TRADE_IN'
    ? 'Lịch thu cũ đổi mới'
    : booking.repairPackage?.serviceName || 'Lịch sửa chữa';
}

export default function RepairSchedules() {
  const [searchParams, setSearchParams] = useSearchParams();
  const weekParam = searchParams.get('week');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(() =>
    isValidWeekValue(weekParam) ? weekParam : getCurrentWeekValue()
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const userRes = await api.get('/auth/user-info');
        if (!userRes?.data?.success) {
          setMessage('Vui lòng đăng nhập để xem lịch hẹn.');
          return;
        }
        const userId = userRes.data.data.id;
        const historyRes = await userAPI.getRepairHistory(userId);
        setBookings(historyRes?.data || []);
      } catch (error) {
        console.error(error);
        setMessage('Không thể tải lịch hẹn.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isValidWeekValue(weekParam) && weekParam !== selectedWeek) {
      setSelectedWeek(weekParam);
    }
  }, [selectedWeek, weekParam]);

  function handleWeekChange(event) {
    const nextWeek = event.target.value;
    setSelectedWeek(nextWeek);

    const nextParams = new URLSearchParams(searchParams);
    if (nextWeek) {
      nextParams.set('week', nextWeek);
    } else {
      nextParams.delete('week');
    }
    setSearchParams(nextParams, { replace: true });
  }

  const weekRange = useMemo(() => getWeekDateRange(selectedWeek), [selectedWeek]);

  const weekBookings = useMemo(() => {
    if (!weekRange) return bookings;
    return bookings.filter((booking) => booking.appointmentDate >= weekRange.start && booking.appointmentDate <= weekRange.end);
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Lịch hẹn của tôi</h1>
        <Link to="/repair-packages">+ Đặt lịch mới</Link>
      </header>

      <div className={styles.search} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{ fontWeight: 700 }}>Tuần:</label>
        <input type="week" value={selectedWeek} onChange={handleWeekChange} />
        {weekRange && <span>{weekRange.start} - {weekRange.end}</span>}
      </div>

      {loading ? <p>Đang tải lịch hẹn...</p> : null}
      {!loading && message ? <p>{message}</p> : null}
      {!loading && !message && weekBookings.length === 0 ? <p>Không có lịch hẹn trong tuần đã chọn.</p> : null}

      {!loading && weekBookings.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.tableCalendar}>
            <thead>
              <tr>
                <th></th>
                {sessions.map((s) => <th key={s}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d}>
                  <td><strong>{dayLabel[d]}</strong></td>
                  {sessions.map((session) => {
                    const key = `${d}_${session}`;
                    const list = calendarMap[key] || [];
                    return (
                      <td key={key}>
                        {list.map((booking) => (
                          <div key={booking.id} className={styles.scheduleCard}>
                            <div><strong>{formatBookingTitle(booking)}</strong></div>
                            <div>Máy: {booking.deviceModel}</div>
                            {booking.bookingType === 'TRADE_IN' ? (
                              <>
                                <div>Giá ước lượng: {formatCurrency(booking.estimatedTradeInAmount)}</div>
                                <div>Tình trạng: {booking.tradeInConditionName || '-'}</div>
                              </>
                            ) : (
                              <div>Danh mục: {booking.repairPackage?.phoneType} / {booking.repairPackage?.serviceCategory}</div>
                            )}
                            <div>Giờ: {booking.appointmentTime}</div>
                            <div>Trạng thái: {booking.status}</div>
                            <div>KTV: {booking.technicianName || 'Chưa nhận'}</div>
                            {booking.progressNote && <div>Tiến trình: {normalizeLegacyText(booking.progressNote)}</div>}
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
      )}
    </div>
  );
}
