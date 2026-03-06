import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './VouchersManagement.module.css';

const emptyForm = { phoneType: '', serviceCategory: '', active: true };

export default function RepairCategoriesManagement() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const res = await adminAPI.getAllRepairCategoriesAdmin();
    setItems(res?.data || []);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm({ phoneType: item.phoneType, serviceCategory: item.serviceCategory, active: item.active }); setShowModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (editingId) await adminAPI.updateRepairCategoryAdmin(editingId, payload);
    else await adminAPI.createRepairCategoryAdmin(payload);
    setShowModal(false);
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm('Xóa danh mục sửa chữa này?')) return;
    await adminAPI.deleteRepairCategoryAdmin(id);
    await load();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý danh mục sửa chữa</h1>
          <p className={styles.subtitle}>Mỗi danh mục gồm: Loại máy + Loại dịch vụ.</p>
        </div>
        <button className={styles.createButton} onClick={openCreate}>+ Thêm danh mục</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Loại máy</th>
              <th>Loại dịch vụ</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.phoneType}</td>
                <td>{item.serviceCategory}</td>
                <td>{item.active ? 'Đang mở' : 'Ẩn'}</td>
                <td>
                  <button className={styles.actionButton} onClick={() => openEdit(item)}>Sửa</button>
                  <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => remove(item.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h2>{editingId ? 'Sửa danh mục' : 'Thêm danh mục'}</h2></div>
            <form className={styles.form} onSubmit={submit}>
              <input placeholder="Loại máy (VD: iPhone X)" value={form.phoneType} onChange={(e) => setForm((p) => ({ ...p, phoneType: e.target.value }))} required />
              <input placeholder="Loại dịch vụ (VD: Thay màn hình)" value={form.serviceCategory} onChange={(e) => setForm((p) => ({ ...p, serviceCategory: e.target.value }))} required />
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
