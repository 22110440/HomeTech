import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './VouchersManagement.module.css';

const emptyForm = {
  phoneType: '',
  serviceName: '',
  serviceCategory: '',
  description: '',
  price: '',
  estimatedDurationMinutes: '',
  active: true
};

export default function RepairPackagesManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllRepairPackagesAdmin();
      setItems(response?.data || []);
    } catch (err) {
      setError('Không thể tải danh sách gói sửa chữa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((i) =>
      i.serviceName?.toLowerCase().includes(term) || i.phoneType?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      phoneType: item.phoneType || '',
      serviceName: item.serviceName || '',
      serviceCategory: item.serviceCategory || '',
      description: item.description || '',
      price: item.price ?? '',
      estimatedDurationMinutes: item.estimatedDurationMinutes ?? '',
      active: item.active ?? true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        phoneType: form.phoneType,
        serviceName: form.serviceName,
        serviceCategory: form.serviceCategory,
        description: form.description,
        price: Number(form.price),
        estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
        active: form.active
      };
      if (editingId) {
        await adminAPI.updateRepairPackageAdmin(editingId, payload);
      } else {
        await adminAPI.createRepairPackageAdmin(payload);
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || 'Lưu gói sửa chữa thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa gói sửa chữa này?')) return;
    try {
      await adminAPI.deleteRepairPackageAdmin(id);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || 'Xóa thất bại');
    }
  };

  if (loading) return <div className={styles.loadingContainer}><p>Đang tải...</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý gói sửa chữa</h1>
          <p className={styles.subtitle}>Ví dụ: sửa pin iPhone X</p>
        </div>
        <button className={styles.createButton} onClick={openCreate}>+ Thêm gói sửa chữa</button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm theo tên gói / loại máy" />
        </div>
      </div>

      {error && <p>{error}</p>}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên gói</th>
              <th>Loại máy</th>
              <th>Danh mục dịch vụ</th>
              <th>Giá</th>
              <th>Thời lượng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.serviceName}</td>
                <td>{item.phoneType}</td>
                <td>{item.serviceCategory}</td>
                <td>{Number(item.price || 0).toLocaleString('vi-VN')} đ</td>
                <td>{item.estimatedDurationMinutes} phút</td>
                <td>{item.active ? 'Đang mở' : 'Ẩn'}</td>
                <td>
                  <button className={styles.actionButton} onClick={() => openEdit(item)}>Sửa</button>
                  <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(item.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h2>{editingId ? 'Cập nhật gói' : 'Thêm gói sửa chữa'}</h2></div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <input placeholder="Tên gói (VD: Sửa pin iPhone X)" value={form.serviceName} onChange={(e) => setForm((p) => ({ ...p, serviceName: e.target.value }))} required />
              <input placeholder="Loại máy (VD: iPhone X)" value={form.phoneType} onChange={(e) => setForm((p) => ({ ...p, phoneType: e.target.value }))} required />
              <input placeholder="Danh mục dịch vụ (VD: Thay màn hình)" value={form.serviceCategory} onChange={(e) => setForm((p) => ({ ...p, serviceCategory: e.target.value }))} required />
              <input type="number" placeholder="Giá" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
              <input type="number" placeholder="Thời lượng (phút)" value={form.estimatedDurationMinutes} onChange={(e) => setForm((p) => ({ ...p, estimatedDurationMinutes: e.target.value }))} required />
              <textarea placeholder="Mô tả" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={4} />
              <label>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Đang hoạt động
              </label>
              <button className={styles.submitButton} type="submit">Lưu</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
