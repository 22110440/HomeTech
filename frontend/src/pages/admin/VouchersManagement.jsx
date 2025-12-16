import { useEffect, useMemo, useState } from 'react';
import styles from './VouchersManagement.module.css';
import { adminAPI } from '../../services/api';

const emptyForm = {
  code: '',
  discountPercent: '',
  discountAmount: '',
  minOrderValue: '',
  usageLimit: '',
  startDate: '',
  endDate: '',
  active: true,
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch (err) {
    return value;
  }
};

export default function VouchersManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVouchers();
  }, []);

  const filteredVouchers = useMemo(() => {
    if (!searchTerm.trim()) return vouchers;
    const term = searchTerm.toLowerCase();
    return vouchers.filter(
      (voucher) =>
        voucher.code?.toLowerCase().includes(term) ||
        (voucher.description && voucher.description.toLowerCase().includes(term))
    );
  }, [vouchers, searchTerm]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllVouchers();
      const data = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
      setVouchers(data);
    } catch (err) {
      console.error('Failed to load vouchers', err);
      setError('Không thể tải danh sách voucher. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (voucher) => {
    setEditingId(voucher.id);
    setForm({
      code: voucher.code || '',
      discountPercent: voucher.discountPercent ?? '',
      discountAmount: voucher.discountAmount ?? '',
      minOrderValue: voucher.minOrderValue ?? '',
      usageLimit: voucher.usageLimit ?? '',
      startDate: voucher.startDate ? voucher.startDate.slice(0, 16) : '',
      endDate: voucher.endDate ? voucher.endDate.slice(0, 16) : '',
      active: voucher.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildPayload = () => {
    const payload = {
      code: form.code.trim(),
      discountPercent: form.discountPercent === '' ? null : Number(form.discountPercent),
      discountAmount: form.discountAmount === '' ? null : Number(form.discountAmount),
      minOrderValue: form.minOrderValue === '' ? 0 : Number(form.minOrderValue),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      active: form.active,
    };
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = buildPayload();
      let response;
      if (editingId) {
        response = await adminAPI.updateVoucher(editingId, payload);
      } else {
        response = await adminAPI.createVoucher(payload);
      }
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || 'Không thể lưu voucher');
      }
      await loadVouchers();
      closeModal();
    } catch (err) {
      console.error('Failed to save voucher', err);
      setError(err?.response?.data?.error || err.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (voucher) => {
    if (!window.confirm(`Xóa voucher ${voucher.code}?`)) return;
    try {
      const response = await adminAPI.deleteVoucher(voucher.id);
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || 'Không thể xóa voucher');
      }
      setVouchers((prev) => prev.filter((item) => item.id !== voucher.id));
    } catch (err) {
      alert(err?.response?.data?.error || err.message || 'Xóa voucher thất bại');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu voucher...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Voucher</h1>
          <p className={styles.subtitle}>Tạo mã giảm giá, giới hạn lượt dùng và thời gian áp dụng</p>
        </div>
        <button className={styles.createButton} onClick={openCreateModal}>
          + Thêm voucher
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 10-14 0 7 7 0 0014 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredVouchers.length === 0 ? (
        <div className={styles.emptyState}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Chưa có voucher nào</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Giảm</th>
                <th>Đơn tối thiểu</th>
                <th>Lượt sử dụng</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td className={styles.codeCol}>{voucher.code}</td>
                  <td>
                    {voucher.discountPercent
                      ? `${voucher.discountPercent}%`
                      : formatCurrency(voucher.discountAmount)}
                  </td>
                  <td>{formatCurrency(voucher.minOrderValue)}</td>
                  <td>
                    {voucher.usedCount || 0}/{voucher.usageLimit || 0}
                  </td>
                  <td>
                    <div className={styles.dateRange}>
                      <span>{formatDateTime(voucher.startDate)}</span>
                      <span>→</span>
                      <span>{formatDateTime(voucher.endDate)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${voucher.active ? styles.badgeActive : styles.badgeInactive}`}>
                      {voucher.active ? 'Đang mở' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button className={styles.actionButton} onClick={() => openEditModal(voucher)}>
                        Sửa
                      </button>
                      <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(voucher)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? 'Cập nhật voucher' : 'Thêm voucher'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>
            {error && <div className={styles.errorBanner}>{error}</div>}
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <label>
                  Mã voucher
                  <input
                    name="code"
                    value={form.code}
                    onChange={handleInputChange}
                    placeholder="VD: SALE10"
                    required
                  />
                </label>
                <label>
                  Giảm %
                  <input
                    name="discountPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.discountPercent}
                    onChange={handleInputChange}
                    placeholder="VD: 10"
                  />
                </label>
                <label>
                  Giảm tiền (VND)
                  <input
                    name="discountAmount"
                    type="number"
                    min="0"
                    value={form.discountAmount}
                    onChange={handleInputChange}
                    placeholder="VD: 50000"
                  />
                </label>
              </div>

              <div className={styles.formRow}>
                <label>
                  Đơn tối thiểu (VND)
                  <input
                    name="minOrderValue"
                    type="number"
                    min="0"
                    value={form.minOrderValue}
                    onChange={handleInputChange}
                    placeholder="VD: 200000"
                  />
                </label>
                <label>
                  Giới hạn lượt dùng
                  <input
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={form.usageLimit}
                    onChange={handleInputChange}
                    placeholder="VD: 100"
                    required
                  />
                </label>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active}
                    onChange={handleInputChange}
                  />
                  Đang kích hoạt
                </label>
              </div>

              <div className={styles.formRow}>
                <label>
                  Bắt đầu
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </label>
                <label>
                  Kết thúc
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                <button type="button" className={styles.cancelButton} onClick={closeModal} disabled={submitting}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

