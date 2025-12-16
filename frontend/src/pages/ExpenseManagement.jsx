import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import api from '../services/api';
import styles from './ExpenseManagement.module.css';

const PERIOD_OPTIONS = [
    { value: 'DAY', label: 'Ngày' },
    { value: 'WEEK', label: 'Tuần' },
    { value: 'MONTH', label: 'Tháng' },
    { value: 'YEAR', label: 'Năm' }
];

function ExpenseManagement() {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState([]);
    const [totalExpense, setTotalExpense] = useState(0);

    // Filter states - default to last 1 month
    const getDefaultStartDate = () => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [groupBy, setGroupBy] = useState('DAY');

    useEffect(() => {
        loadUserInfo();
    }, []);

    useEffect(() => {
        if (userInfo?.id && startDate && endDate) {
            loadExpenses();
        }
    }, [userInfo, startDate, endDate, groupBy]);

    const loadUserInfo = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await api.get('/auth/user-info');
            if (response.data.success) {
                setUserInfo(response.data.data);
            } else {
                navigate('/login');
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                navigate('/login');
            }
        }
    };

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const response = await userAPI.getExpenses(userInfo.id, startDate, endDate, groupBy);

            if (response.success) {
                const data = response.data || {};
                setExpenses(data.orders || []);
                setTotalExpense(data.totalExpense || 0);
            } else {
                setExpenses([]);
                setTotalExpense(0);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            setExpenses([]);
            setTotalExpense(0);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getOrderItems = (order) => order?.items || order?.orderItems || [];

    if (loading && !userInfo) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <Link to="/" className={styles.logo}>
                        <span className={styles.logoText}>HomeTech</span>
                    </Link>
                    <Link to="/" className={styles.backButton}>
                        ← Về trang chủ
                    </Link>
                </div>
            </header>

            <div className={styles.content}>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>Quản lý Chi tiêu</h1>
                </div>

                {/* Filters */}
                <div className={styles.filtersContainer}>
                    <div className={styles.filterGroup}>
                        <label>Từ ngày:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Đến ngày:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Nhóm theo:</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            className={styles.select}
                        >
                            {PERIOD_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Summary Card */}
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className={styles.summaryContent}>
                        <p className={styles.summaryLabel}>Tổng chi tiêu</p>
                        <p className={styles.summaryValue}>{formatCurrency(totalExpense)}</p>
                        <p className={styles.summaryMeta}>
                            {expenses.length} đơn hàng từ {new Date(startDate).toLocaleDateString('vi-VN')} đến {new Date(endDate).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                </div>

                {/* Orders List */}
                <div className={styles.ordersSection}>
                    <h2 className={styles.sectionTitle}>Lịch sử đơn hàng</h2>

                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>Không có đơn hàng nào trong khoảng thời gian này</p>
                            <Link to="/" className={styles.shopButton}>
                                Mua sắm ngay
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.ordersList}>
                            {expenses.map((order) => (
                                <div key={order.id} className={styles.orderCard}>
                                    <div className={styles.orderHeader}>
                                        <div>
                                            <div className={styles.orderId}>Đơn hàng #{order.id}</div>
                                            <div className={styles.orderDate}>{formatDate(order.createdAt)}</div>
                                        </div>
                                        <div className={styles.orderTotal}>
                                            {formatCurrency(order.totalAmount)}
                                        </div>
                                    </div>

                                    <div className={styles.orderItems}>
                                        {getOrderItems(order).map((item) => (
                                            <div key={item.id} className={styles.orderItem}>
                                                <div className={styles.itemInfo}>
                                                    <div className={styles.itemName}>{item.product?.name || 'Sản phẩm'}</div>
                                                    <div className={styles.itemDetails}>
                                                        Số lượng: {item.quantity} × {formatCurrency(item.price)}
                                                    </div>
                                                </div>
                                                <div className={styles.itemTotal}>
                                                    {formatCurrency(item.quantity * item.price)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={styles.orderFooter}>
                                        <Link to="/orders" className={styles.viewDetailButton}>
                                            Xem chi tiết
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ExpenseManagement;
