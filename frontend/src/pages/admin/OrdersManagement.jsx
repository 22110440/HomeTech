// src/pages/admin/OrdersManagement.jsx
import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './ProductsManagement.module.css';

const STATUS_META = {
  WAITING_CONFIRMATION: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
  SHIPPED: { label: 'Đang giao', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
};

const statusKeys = Object.keys(STATUS_META);
const statusFilters = ['ALL', ...statusKeys];

const normalizeOrderPayload = (payload) => {
  if (!payload) return [];

  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.data?.content,
    payload?.content,
    payload?.results,
    payload?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const getStatusLabel = (status) =>
  status === 'ALL' ? 'Tất cả' : STATUS_META[status]?.label || status;

const dedupeOrdersById = (orders) => {
  const map = new Map();
  orders.forEach((order) => {
    if (!order) return;
    const key = order.id ?? `${order?.customer?.id ?? Math.random()}`;
    if (!map.has(key)) {
      map.set(key, order);
    }
  });
  return Array.from(map.values());
};

const formatOrderAddress = (orderInfo) => {
  if (!orderInfo) return 'Chưa cập nhật';
  if (orderInfo.fullAddress && orderInfo.fullAddress !== '-') {
    return orderInfo.fullAddress;
  }
  const parts = [orderInfo.street, orderInfo.ward, orderInfo.district, orderInfo.city].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Chưa cập nhật';
};

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusSelection, setStatusSelection] = useState('WAITING_CONFIRMATION');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const stats = useMemo(() => {
    const summary = {
      total: orders.length,
      WAITING_CONFIRMATION: 0,
      CONFIRMED: 0,
      SHIPPED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    orders.forEach((order) => {
      if (summary[order.status] !== undefined) {
        summary[order.status] += 1;
      }
    });
    return summary;
  }, [orders]);

  const fetchOrdersByStatuses = async () => {
    const results = await Promise.all(
      statusKeys.map(async (status) => {
        try {
          const response = await adminAPI.getOrdersByStatusAdmin(status);
          if (response && response.success === false) {
            console.warn(`Không thể tải đơn trạng thái ${status}`, response.message);
            return [];
          }
          return normalizeOrderPayload(response);
        } catch (error) {
          console.error(`fetchOrdersByStatuses error (${status}):`, error);
          return [];
        }
      })
    );
    return results.flat();
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [allResponse, statusOrders] = await Promise.all([
        adminAPI.getAllOrdersAdmin(),
        fetchOrdersByStatuses(),
      ]);

      if (allResponse && allResponse.success === false) {
        throw new Error(allResponse.message || 'Không thể tải đơn hàng');
      }

      const normalizedAll = normalizeOrderPayload(allResponse);
      const merged = dedupeOrdersById([...normalizedAll, ...statusOrders]);

      const sorted = [...merged].sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );

      setOrders(sorted);
    } catch (error) {
      console.error('loadOrders error:', error);
      alert(error.message || 'Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder?.status) {
      setStatusSelection(selectedOrder.status);
    }
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const snapshot = order.orderInfo || {};
      const contactName = snapshot.fullName?.toLowerCase() || order.customer?.username?.toLowerCase();
      const contactEmail = snapshot.email?.toLowerCase() || order.customer?.email?.toLowerCase();
      const contactPhone = snapshot.phone || order.customer?.phone;
      const normalizedPhone = contactPhone ? contactPhone.toString().toLowerCase() : '';
      const matchSearch =
        !term ||
        order.id?.toString().includes(term) ||
        contactName?.includes(term) ||
        contactEmail?.includes(term) ||
        normalizedPhone.includes(term);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const meta = STATUS_META[newStatus];
    if (
      !window.confirm(
        `Chuyển trạng thái đơn #${orderId} sang "${meta?.label || newStatus}"?`
      )
    ) {
      return;
    }
    try {
      setUpdatingStatus(true);
      const response = await adminAPI.updateOrderStatus(orderId, newStatus);
      if (!response.success) throw new Error(response.message);
      await loadOrders();
      setSelectedOrder(response.data);
      alert('Cập nhật trạng thái thành công');
    } catch (error) {
      alert(error.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Hủy đơn hàng #${orderId}?`)) return;
    try {
      const response = await adminAPI.cancelOrderByAdmin(orderId);
      if (!response.success) throw new Error(response.message);
      await loadOrders();
      setSelectedOrder(response.data);
      alert('Đã hủy đơn hàng');
    } catch (error) {
      alert(error.message || 'Không thể hủy đơn hàng');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý đơn hàng</h1>
        <button className={styles.addButton} onClick={loadOrders}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20l-5-.001V14" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l6.586 6.586a2 2 0 002.828 0L20 4M4 20l6.632-6.632" />
          </svg>
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Tổng đơn</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        {statusKeys.map((status) => (
          <div key={status} className={styles.statItem}>
            <span className={styles.statLabel}>{STATUS_META[status].label}</span>
            <span className={styles.statValue}>{stats[status]}</span>
          </div>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2m1.7-4.5a6.2 6.2 0 11-12.4 0 6.2 6.2 0 0112.4 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm ID, khách hàng, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={styles.statusFilterGroup}>
          {statusFilters.map((status) => (
            <button
              key={status}
              type="button"
              className={`${styles.statusFilterButton} ${
                statusFilter === status ? styles.activeStatusFilterButton : ''
              }`}
              onClick={() => setStatusFilter(status)}
            >
              <span>{getStatusLabel(status)}</span>
              <span
                className={`${styles.statusFilterCount} ${
                  statusFilter === status ? styles.statusFilterCountActive : ''
                }`}
              >
                {status === 'ALL' ? stats.total : stats[status] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không có đơn hàng nào phù hợp</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Trạng thái</th>
                <th>Tổng tiền</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)}>
                  <td>#{order.id}</td>
                  <td className={styles.categoryName}>
                    <div>{order.orderInfo?.fullName || order.customer?.username || 'Khách lẻ'}</div>
                    <small style={{ color: '#6b7280' }}>
                      {order.orderInfo?.email || order.customer?.email || '—'}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        STATUS_META[order.status]?.color || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_META[order.status]?.label || order.status}
                    </span>
                  </td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      title="Xem chi tiết"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className={styles.modal} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Đơn hàng #{selectedOrder.id}</h2>
              <button className={styles.closeButton} onClick={() => setSelectedOrder(null)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <p><strong>Khách hàng:</strong> {selectedOrder.orderInfo?.fullName || selectedOrder.customer?.username || 'Khách lẻ'}</p>
                <p><strong>Email:</strong> {selectedOrder.orderInfo?.email || selectedOrder.customer?.email || '—'}</p>
                <p><strong>Số điện thoại:</strong> {selectedOrder.orderInfo?.phone || selectedOrder.customer?.phone || '—'}</p>
                <p><strong>Địa chỉ giao:</strong> {formatOrderAddress(selectedOrder.orderInfo)}</p>
              </div>
              <div className="space-y-3">
                <p><strong>Tổng tiền:</strong> <span className="text-xl font-semibold text-green-600">{formatCurrency(selectedOrder.totalAmount)}</span></p>
                <p><strong>Trạng thái:</strong>{' '}
                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      STATUS_META[selectedOrder.status]?.color || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {STATUS_META[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </p>
                <p><strong>Ngày tạo:</strong> {formatDateTime(selectedOrder.createdAt)}</p>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-3">Danh sách sản phẩm</h3>
            <div className="border rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3">Sản phẩm</th>
                    <th className="text-center px-4 py-3">SL</th>
                    <th className="text-right px-4 py-3">Đơn giá</th>
                    <th className="text-right px-4 py-3">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Không có sản phẩm
                      </td>
                    </tr>
                  ) : (
                    (selectedOrder.items || []).map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3">
                          {item.product?.name || 'Sản phẩm đã xóa'}
                          {item.variant && (
                            <span className="ml-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              - {item.variant.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <div className="flex flex-col gap-3 w-full">
                <label className="text-sm font-medium text-gray-600">
                  Chọn trạng thái mới
                </label>
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={statusSelection}
                    onChange={(event) => setStatusSelection(event.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {statusFilters
                      .filter((status) => status !== 'ALL')
                      .map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status]?.label || status}
                        </option>
                      ))}
                  </select>
                  <button
                    className={styles.submitButton}
                    disabled={updatingStatus || statusSelection === selectedOrder.status}
                    onClick={() => handleUpdateStatus(selectedOrder.id, statusSelection)}
                  >
                    {updatingStatus ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full">
                <button
                  className={`${styles.submitButton} bg-red-600 hover:bg-red-700`}
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  disabled={selectedOrder.status === 'CANCELLED'}
                >
                  Hủy đơn
                </button>
                <button className={styles.cancelButton} onClick={() => setSelectedOrder(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}