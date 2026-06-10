import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import api from '../services/api';
import styles from './Orders.module.css';

const STATUS_META = {
  WAITING_CONFIRMATION: {
    label: 'Chờ xác nhận',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)'
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)'
  },
  SHIPPED: {
    label: 'Đang vận chuyển',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)'
  },
  COMPLETED: {
    label: 'Đã hoàn tất',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.15)'
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)'
  }
};

const PAYMENT_METHOD_TEXT = {
  COD: 'Thanh toán khi nhận hàng',
  MOMO: 'Thanh toán MoMo',
  CARD: 'Thanh toán thẻ',
  VNPAY: 'Thanh toán VNPAY',
  PAYOS: 'Thanh toán PayOS'
};

const REPAIR_STATUS_META = {
  PENDING: 'Chờ tiếp nhận',
  WAITING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  IN_PROGRESS: 'Đang sửa chữa',
  COMPLETED: 'Hoàn tất sửa chữa',
  CANCELLED: 'Đã hủy'
};

const getRepairStatusText = (status) => REPAIR_STATUS_META[status] || status || '-';

const unwrapData = (payload, fallback = null) => {
  if (!payload || typeof payload !== 'object') return fallback;
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    const value = payload.data;
    return value === undefined ? fallback : value;
  }
  return payload ?? fallback;
};

const formatPrice = (price) => {
  if (price === null || price === undefined) return '0₫';
  return new Intl.NumberFormat('vi-VN').format(Number(price)) + '₫';
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

const formatAddress = (orderInfo) => {
  if (!orderInfo) return 'Chưa có địa chỉ giao hàng';
  if (orderInfo.fullAddress && orderInfo.fullAddress !== '-') return orderInfo.fullAddress;
  const parts = [
    orderInfo.street,
    orderInfo.ward,
    orderInfo.district,
    orderInfo.city
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Chưa có địa chỉ giao hàng';
};

const getStatusText = (status) => STATUS_META[status]?.label || status || '-';
const getStatusColor = (status) => STATUS_META[status]?.color || '#6b7280';
const getStatusBackground = (status) => STATUS_META[status]?.bg || 'rgba(107,114,128,0.15)';
const getOrderItems = (order) => order?.items || order?.orderItems || [];

const isWithinCancelWindow = (order) => {
  if (!order) return false;
  if (order.status !== 'WAITING_CONFIRMATION') return false;
  if (!order.createdAt) return false;
  const created = new Date(order.createdAt).getTime();
  const now = Date.now();
  const diffMinutes = (now - created) / (1000 * 60);
  return diffMinutes <= 30;
};

const sortOrdersDesc = (rawOrders = []) => {
  if (!Array.isArray(rawOrders)) return [];
  const getTimestamp = (order) => {
    const candidate = order?.createdAt || order?.orderDate || order?.updatedAt || null;
    const time = candidate ? new Date(candidate).getTime() : NaN;
    if (!Number.isNaN(time)) {
      return time;
    }
    return typeof order?.id === 'number' ? order.id : Number(order?.id) || 0;
  };
  return [...rawOrders].sort((a, b) => getTimestamp(b) - getTimestamp(a));
};

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statuses, setStatuses] = useState(['ALL', ...Object.keys(STATUS_META)]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [listError, setListError] = useState('');
  const [repairBookings, setRepairBookings] = useState([]);

  useEffect(() => {
    loadUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userInfo?.id) {
      loadOrders(statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo, statusFilter]);

  useEffect(() => {
    fetchStatuses();
  }, []);

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

  const fetchStatuses = async () => {
    try {
      const response = await userAPI.getOrderStatuses();
      const data = unwrapData(response, []);
      if (Array.isArray(data) && data.length) {
        const uniqueStatuses = Array.from(new Set(data));
        setStatuses(['ALL', ...uniqueStatuses]);
      }
    } catch (error) {
      console.warn('Không thể tải danh sách trạng thái đơn hàng:', error);
    }
  };

  const loadOrders = async (status = 'ALL') => {
    if (!userInfo?.id) return;
    setListError('');
    try {
      setLoading(true);
      const [response, repairResponse] = await Promise.all([
        status === 'ALL'
          ? userAPI.getOrders(userInfo.id)
          : userAPI.getOrdersByStatus(userInfo.id, status),
        userAPI.getRepairHistory(userInfo.id)
      ]);
      const orderedList = unwrapData(response, []);
      const repairList = unwrapData(repairResponse, []);
      setOrders(sortOrdersDesc(orderedList));
      setRepairBookings(sortOrdersDesc(Array.isArray(repairList) ? repairList : []));
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
      setRepairBookings([]);
      setListError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (status) => {
    if (status === statusFilter) return;
    setStatusFilter(status);
  };

  const handleRefresh = () => {
    loadOrders(statusFilter);
  };

  const openDetailPanel = () => setIsDetailOpen(true);
  const closeDetailPanel = () => {
    setIsDetailOpen(false);
    setSelectedOrder(null);
    setDetailError('');
  };

  const handleViewDetails = async (orderId) => {
    setDetailError('');
    openDetailPanel();
    setDetailLoading(true);
    try {
      const [detailResponse, cancelResponse] = await Promise.all([
        userAPI.getOrderDetail(orderId),
        userAPI.canCancelOrder(orderId)
      ]);
      const detail = unwrapData(detailResponse, null);
      const canCancel = Boolean(unwrapData(cancelResponse, false));
      if (!detail) {
        setDetailError('Không tìm thấy dữ liệu đơn hàng.');
        setSelectedOrder(null);
      } else {
        setSelectedOrder({ ...detail, canCancel });
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      setDetailError('Không thể tải chi tiết đơn hàng. Vui lòng thử lại.');
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelOrder = async (orderId, { fromDetail = false } = {}) => {
    if (!orderId || !userInfo?.id || isCancelling) return;
    const confirmCancel = window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?');
    if (!confirmCancel) return;
    try {
      setIsCancelling(true);
      const response = await userAPI.cancelOrder(orderId, userInfo.id);
      const updated = unwrapData(response, null);
      if (fromDetail && updated) {
        setSelectedOrder({ ...updated, canCancel: false });
      }
      await loadOrders(statusFilter);
    } catch (error) {
      console.error('Error cancelling order:', error);
      const errorMessage = error?.response?.data?.error || 'Không thể hủy đơn hàng. Vui lòng thử lại.';
      if (fromDetail) {
        setDetailError(errorMessage);
      } else {
        setListError(errorMessage);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleProductClick = (productId) => {
    if (!productId) return;
    navigate(`/product/${productId}`);
    closeDetailPanel();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Đơn hàng của tôi</h1>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>

        <div className={styles.filtersBar}>
          <span className={styles.filtersLabel}>Lọc theo trạng thái:</span>
          <div className={styles.statusFilters}>
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`${styles.filterButton} ${statusFilter === status ? styles.filterButtonActive : ''}`}
                onClick={() => handleFilterChange(status)}
              >
                {status === 'ALL' ? 'Tất cả' : getStatusText(status)}
              </button>
            ))}
          </div>
        </div>

        {listError && <div className={styles.errorBanner}>{listError}</div>}

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Không có đơn hàng nào {statusFilter !== 'ALL' ? 'ở trạng thái này' : 'được tìm thấy'}</p>
            <Link to="/" className={styles.shopButton}>
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order) => {
              const canCancel = isWithinCancelWindow(order);
              return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderId}>Đơn hàng #{order.id}</div>
                    <div className={styles.orderDate}>{formatDate(order.createdAt)}</div>
                  </div>
                  <div
                    className={styles.orderStatus}
                    style={{
                      color: getStatusColor(order.status),
                      backgroundColor: getStatusBackground(order.status)
                    }}
                  >
                    {getStatusText(order.status)}
                  </div>
                </div>

                <div className={styles.orderItems}>
                  {getOrderItems(order).map((item) => (
                    <div key={item.id} className={styles.orderItem}>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>
                          {item.product?.name || 'Sản phẩm'}
                          {item.variant && (
                            <span className={styles.variantName}> - {item.variant.name}</span>
                          )}
                        </div>
                        <div className={styles.itemDetails}>
                          Số lượng: {item.quantity} × {formatPrice(item.price)}
                        </div>
                      </div>
                      <div className={styles.itemTotal}>
                        {formatPrice(item.quantity * item.price)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.orderFooter}>
                  <div>
                    <div className={styles.orderMeta}>
                      <span>Thanh toán:</span>
                      <strong>{PAYMENT_METHOD_TEXT[order.paymentMethod] || 'Không xác định'}</strong>
                    </div>
                    {order.voucher && (
                      <div className={styles.orderMeta}>
                        <span>Voucher:</span>
                        <strong>{order.voucher.code}</strong>
                      </div>
                    )}
                  </div>
                  <div className={styles.orderActions}>
                    <div className={styles.orderTotal}>
                      <strong>Tổng tiền: {formatPrice(order.totalAmount)}</strong>
                    </div>
                    {canCancel && (
                      <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? 'Đang hủy...' : 'Hủy đơn'}
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.detailButton}
                      onClick={() => handleViewDetails(order.id)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
        <div className={styles.titleRow} style={{ marginTop: 24 }}>
          <h2 className={styles.title} style={{ fontSize: '1.35rem' }}>Lịch sử đặt sửa chữa</h2>
          <Link to="/repair-packages" className={styles.shopButton}>
            Đặt lịch sửa chữa
          </Link>
        </div>

        {repairBookings.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Bạn chưa có lịch sửa chữa nào.</p>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {repairBookings.map((booking) => (
              <div key={`repair-${booking.id}`} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderId}>Đơn sửa chữa #{booking.id}</div>
                    <div className={styles.orderDate}>{formatDate(booking.createdAt)}</div>
                  </div>
                  <div className={styles.orderStatus}>
                    {getRepairStatusText(booking.status)}
                  </div>
                </div>

                <div className={styles.orderItems}>
                  <div className={styles.orderItem}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{booking.repairPackage?.serviceName || 'Gói sửa chữa'}</div>
                      <div className={styles.itemDetails}>Thiết bị: {booking.deviceModel || '-'} | Lịch hẹn: {booking.appointmentDate || '-'} {booking.appointmentTime || ''}</div>
                      <div className={styles.itemDetails}>Danh mục: {booking.repairPackage?.phoneType || '-'} / {booking.repairPackage?.serviceCategory || '-'}</div>
                      <div className={styles.itemDetails}>Kỹ thuật viên: {booking.technicianName || 'Chưa nhận'}</div>
                      {booking.progressNote && <div className={styles.itemDetails}>Tiến trình: {booking.progressNote}</div>}
                    </div>
                    <div className={styles.itemTotal}>{formatPrice(booking.totalAmount)}</div>
                  </div>
                </div>

                <div className={styles.orderFooter}>
                  <div className={styles.orderMeta}>
                    <span>Thanh toán:</span>
                    <strong>{PAYMENT_METHOD_TEXT[booking.paymentMethod] || booking.paymentMethod || 'Không xác định'}</strong>
                  </div>
                  <div className={styles.orderActions}>
                    {(booking.paymentMethod === 'VNPAY' || booking.paymentMethod === 'PAYOS') && booking.status !== 'PAID' && (
                      <Link to={`/repair-payment/${booking.id}`} className={styles.detailButton}>
                        Thanh toán ngay
                      </Link>
                    )}
                    <Link to="/my-repair-schedules" className={styles.detailButton}>
                      Xem lịch sửa chữa
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {isDetailOpen && (
        <div className={styles.detailOverlay} onClick={closeDetailPanel}>
          <div className={styles.detailPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.detailHeader}>
              <div>
                <p className={styles.detailTitle}>Chi tiết đơn hàng #{selectedOrder?.id}</p>
                {selectedOrder?.createdAt && (
                  <p className={styles.detailSubtitle}>{formatDate(selectedOrder.createdAt)}</p>
                )}
              </div>
              <button type="button" className={styles.detailClose} onClick={closeDetailPanel}>
                ×
              </button>
            </div>

            {detailLoading ? (
              <div className={styles.detailLoading}>
                <div className={styles.spinner}></div>
              </div>
            ) : selectedOrder ? (
              <>
                <div className={styles.detailStatusRow}>
                  <span>Trạng thái hiện tại:</span>
                  <span
                    className={styles.detailStatusBadge}
                    style={{
                      color: getStatusColor(selectedOrder.status),
                      backgroundColor: getStatusBackground(selectedOrder.status)
                    }}
                  >
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailSectionTitle}>Thông tin giao hàng</p>
                  <ul className={styles.detailInfoList}>
                    <li>
                      <span>Người nhận:</span>
                      <strong>{selectedOrder.orderInfo?.fullName || 'Không có'}</strong>
                    </li>
                    <li>
                      <span>Số điện thoại:</span>
                      <strong>{selectedOrder.orderInfo?.phone || '-'}</strong>
                    </li>
                    <li>
                      <span>Địa chỉ:</span>
                      <strong>{formatAddress(selectedOrder.orderInfo)}</strong>
                    </li>
                  </ul>
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailSectionTitle}>Sản phẩm</p>
                  <div className={styles.detailItems}>
                    {getOrderItems(selectedOrder).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.detailItem}
                        onClick={() => handleProductClick(item.product?.id)}
                      >
                        <div>
                          <p className={styles.detailItemName}>
                            {item.product?.name || 'Sản phẩm'}
                            {item.variant && (
                              <span className={styles.variantName}> - {item.variant.name}</span>
                            )}
                          </p>
                          <p className={styles.detailItemMeta}>
                            {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className={styles.detailItemTotal}>{formatPrice(item.quantity * item.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailSectionTitle}>Thanh toán</p>
                  <ul className={styles.detailInfoList}>
                    <li>
                      <span>Phương thức:</span>
                      <strong>{PAYMENT_METHOD_TEXT[selectedOrder.paymentMethod] || 'Không xác định'}</strong>
                    </li>
                    <li>
                      <span>Tổng tiền:</span>
                      <strong>{formatPrice(selectedOrder.totalAmount)}</strong>
                    </li>
                    {selectedOrder.voucher && (
                      <li>
                        <span>Voucher:</span>
                        <strong>{selectedOrder.voucher.code}</strong>
                      </li>
                    )}
                  </ul>
                </div>

                {detailError && <div className={styles.errorBanner}>{detailError}</div>}

                {selectedOrder.canCancel && (
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => handleCancelOrder(selectedOrder.id, { fromDetail: true })}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
                  </button>
                )}
              </>
            ) : (
              <p className={styles.emptyDetail}>Không tìm thấy thông tin đơn hàng.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
