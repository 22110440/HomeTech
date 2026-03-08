import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  SUNDAY: 'Chủ nhật'
};
const sessions = ['Sáng', 'Chiều', 'Tối'];

function getSession(timeValue) {
  const hour = Number((timeValue || '00:00').split(':')[0]);
  if (hour < 12) return 'Sáng';
  if (hour < 18) return 'Chiều';
  return 'Tối';
}

export default function RepairSchedules() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const userRes = await api.get('/auth/user-info');
        if (!userRes?.data?.success) {
          setMessage('Vui lòng đăng nhập để xem lịch sửa chữa.');
          return;
        }
        const userId = userRes.data.data.id;
        const historyRes = await userAPI.getRepairHistory(userId);
        setBookings(historyRes?.data || []);
      } catch (error) {
        console.error(error);
        setMessage('Không thể tải lịch sửa chữa.');
      } finally {
        setLoading(false);
      }
    };
    load();
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Lịch sửa chữa của tôi</h1>
        <Link to="/repair-packages">← Đặt lịch mới</Link>
      </header>

      {loading ? <p>Đang tải lịch sửa chữa...</p> : null}
      {!loading && message ? <p>{message}</p> : null}
      {!loading && !message && bookings.length === 0 ? <p>Bạn chưa có lịch sửa chữa nào.</p> : null}

      {!loading && bookings.length > 0 && (
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
                            <div><strong>{booking.repairPackage?.serviceName}</strong></div>
                            <div>Máy: {booking.deviceModel}</div>
                            <div>Danh mục: {booking.repairPackage?.phoneType} / {booking.repairPackage?.serviceCategory}</div>
                            <div>Giờ: {booking.appointmentTime}</div>
                            <div>Trạng thái: {booking.status}</div>
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
