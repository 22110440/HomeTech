import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './VouchersManagement.module.css';

const emptyForm = { name: '', active: true };

export default function RepairCategoriesManagement() {
  const [phoneItems, setPhoneItems] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('phone');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [searchPhone, setSearchPhone] = useState('');
  const [searchService, setSearchService] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [phoneRes, serviceRes] = await Promise.all([
        adminAPI.getAllRepairPhoneCategoriesAdmin(),
        adminAPI.getAllRepairServiceCategoriesAdmin(),
      ]);
      setPhoneItems(phoneRes?.data || []);
      setServiceItems(serviceRes?.data || []);
    } catch {
      setError('Không thể tải danh mục sửa chữa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPhoneItems = useMemo(() => {
    if (!searchPhone.trim()) return phoneItems;
    const keyword = searchPhone.toLowerCase();
    return phoneItems.filter((item) => item.name?.toLowerCase().includes(keyword));
  }, [phoneItems, searchPhone]);

  const filteredServiceItems = useMemo(() => {
    if (!searchService.trim()) return serviceItems;
    const keyword = searchService.toLowerCase();
    return serviceItems.filter((item) => item.name?.toLowerCase().includes(keyword));
  }, [serviceItems, searchService]);

  const openCreate = (type) => {
    setModalType(type);
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (type, item) => {
    setModalType(type);
    setEditingId(item.id);
    setForm({ name: item.name || '', active: item.active ?? true });
    setShowModal(true);
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    const payload = { ...form, name: form.name.trim() };

    try {
      if (modalType === 'phone') {
        if (editingId) await adminAPI.updateRepairPhoneCategoryAdmin(editingId, payload);
        else await adminAPI.createRepairPhoneCategoryAdmin(payload);
      } else {
        if (editingId) await adminAPI.updateRepairServiceCategoryAdmin(editingId, payload);
        else await adminAPI.createRepairServiceCategoryAdmin(payload);
      }

      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || 'Lưu danh mục thất bại');
    }
  };

  const removeCategory = async (type, id) => {
    if (!window.confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    try {
      if (type === 'phone') await adminAPI.deleteRepairPhoneCategoryAdmin(id);
      else await adminAPI.deleteRepairServiceCategoryAdmin(id);
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
          <h1 className={styles.title}>Quản lý danh mục sửa chữa</h1>
          <p className={styles.subtitle}>Quản lý riêng danh mục điện thoại và danh mục dịch vụ sửa chữa.</p>
        </div>
      </div>

      {error && <p>{error}</p>}

      <section style={{ marginBottom: 28 }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Danh mục điện thoại</h2>
          <button className={styles.createButton} onClick={() => openCreate('phone')}>+ Thêm danh mục điện thoại</button>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <input
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Tìm danh mục điện thoại"
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục điện thoại</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPhoneItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.active ? 'Đang mở' : 'Ẩn'}</td>
                  <td>
                    <button className={styles.actionButton} onClick={() => openEdit('phone', item)}>Sửa</button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => removeCategory('phone', item.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className={styles.header}>
          <h2 className={styles.title}>Danh mục dịch vụ sửa chữa</h2>
          <button className={styles.createButton} onClick={() => openCreate('service')}>+ Thêm danh mục dịch vụ</button>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <input
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              placeholder="Tìm danh mục dịch vụ sửa chữa"
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục dịch vụ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredServiceItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.active ? 'Đang mở' : 'Ẩn'}</td>
                  <td>
                    <button className={styles.actionButton} onClick={() => openEdit('service', item)}>Sửa</button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => removeCategory('service', item.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {editingId
                  ? `Sửa ${modalType === 'phone' ? 'danh mục điện thoại' : 'danh mục dịch vụ'}`
                  : `Thêm ${modalType === 'phone' ? 'danh mục điện thoại' : 'danh mục dịch vụ'}`}
              </h2>
            </div>
            <form className={styles.form} onSubmit={saveCategory}>
              <input
                placeholder={modalType === 'phone' ? 'VD: iPhone 14 Series' : 'VD: Thay pin'}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                />{' '}
                Đang hoạt động
              </label>
              <button className={styles.submitButton} type="submit">Lưu</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
