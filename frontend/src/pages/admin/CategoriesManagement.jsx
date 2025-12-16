import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import styles from './CategoriesManagement.module.css';

export default function CategoriesManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', hidden: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [newAttribute, setNewAttribute] = useState({ name: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/categories', { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        console.error('Server returned error:', data.message);
        alert('Không thể tải danh sách danh mục: ' + data.message);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Có lỗi xảy ra khi tải danh sách: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Tên danh mục không được để trống');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      let response;
      // Gửi kèm danh sách thuộc tính để backend lưu/cập nhật
      const payload = {
        ...formData,
        attributes: attributes.map((attr) => ({
          id: attr.id || null,
          name: attr.name,
          code: attr.code || null,
        })),
      };
      if (editingCategory) {
        // Update
        response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        response = await fetch('/api/categories', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (data.success) {
        alert(editingCategory ? 'Cập nhật thành công' : 'Tạo mới thành công');
        setShowModal(false);
        fetchCategories();
        resetForm();
      } else {
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Có lỗi xảy ra khi lưu danh mục');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        alert('Xóa thành công');
        fetchCategories();
      } else {
        alert(data.message || 'Không thể xóa danh mục');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Có lỗi xảy ra khi xóa');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', hidden: false });
    setEditingCategory(null);
    setAttributes([]);
    setNewAttribute({ name: '' });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      hidden: category.hidden
    });

    // Load thuộc tính danh mục
    adminAPI
      .getCategoryAttributes(category.id)
      .then((res) => {
        if (res.success) {
          setAttributes(res.data || []);
        } else {
          setAttributes([]);
        }
      })
      .catch(() => setAttributes([]))
      .finally(() => setShowModal(true));
  };

  const handleAddAttribute = async () => {
    if (!newAttribute.name.trim()) {
      alert('Tên thuộc tính không được để trống');
      return;
    }

    // Nếu đang chỉnh sửa danh mục đã tồn tại -> tạo thuộc tính ngay trên server
    if (editingCategory) {
      try {
        const res = await adminAPI.createCategoryAttribute(editingCategory.id, {
          name: newAttribute.name.trim(),
          code: null,
        });
        if (!res.success) throw new Error(res.message || 'Không thể thêm thuộc tính');
        setAttributes((prev) => [...prev, res.data]);
        setNewAttribute({ name: '' });
      } catch (error) {
        alert(error.message || 'Không thể thêm thuộc tính');
      }
      return;
    }

    // Nếu đang tạo danh mục mới -> chỉ lưu tạm vào state, sẽ gửi lên sau khi tạo xong danh mục
    setAttributes((prev) => [
      ...prev,
      {
        // local-only object, chưa có id
        name: newAttribute.name.trim(),
      },
    ]);
    setNewAttribute({ name: '' });
  };

  const handleDeleteAttribute = async (attribute, index) => {
    // Nếu đang tạo danh mục mới hoặc thuộc tính chưa có id -> chỉ xoá trên state
    if (!editingCategory || !attribute.id) {
      setAttributes((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa thuộc tính này?')) return;
    try {
      const res = await adminAPI.deleteCategoryAttribute(attribute.id);
      if (!res.success) throw new Error(res.message || 'Không thể xóa thuộc tính');
      setAttributes((prev) => prev.filter((attr) => attr.id !== attribute.id));
    } catch (error) {
      alert(error.message || 'Không thể xóa thuộc tính');
    }
  };

  const handleEditAttribute = async (attribute, index) => {
    const currentName = attribute.name || '';
    const newName = window.prompt('Nhập tên thuộc tính mới', currentName);

    // Người dùng bấm Hủy hoặc không thay đổi gì
    if (!newName || newName.trim() === currentName) return;

    // Nếu thuộc tính chỉ tồn tại ở client (khi đang tạo danh mục mới)
    if (!attribute.id) {
      setAttributes((prev) =>
        prev.map((attr, i) =>
          i === index ? { ...attr, name: newName.trim() } : attr,
        ),
      );
      return;
    }

    try {
      const res = await adminAPI.updateCategoryAttribute(attribute.id, {
        ...attribute,
        name: newName.trim(),
      });
      if (!res.success) throw new Error(res.message || 'Không thể cập nhật thuộc tính');

      setAttributes((prev) =>
        prev.map((attr) => (attr.id === attribute.id ? res.data : attr)),
      );
    } catch (error) {
      alert(error.message || 'Không thể cập nhật thuộc tính');
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách danh mục...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Danh mục</h1>
        <button className={styles.addButton} onClick={openCreateModal}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm danh mục
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className={styles.emptyState}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <p>Chưa có danh mục nào</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td>#{category.id}</td>
                  <td className={styles.categoryName}>{category.name}</td>
                  <td>
                    <span className={category.hidden ?
                      'bg-red-100 text-red-800 px-2 py-1 rounded text-xs' :
                      'bg-green-100 text-green-800 px-2 py-1 rounded text-xs'
                    }>
                      {category.hidden ? 'Đang ẩn' : 'Hiển thị'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => openEditModal(category)}
                        title="Chỉnh sửa"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(category.id)}
                        title="Xóa"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCategory ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Tên danh mục</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên danh mục..."
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!formData.hidden}
                    onChange={(e) => setFormData({ ...formData, hidden: !e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Hiển thị danh mục này</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Thuộc tính danh mục</label>
                {attributes.length === 0 ? (
                  <p className={styles.helperText}>
                    {editingCategory
                      ? 'Chưa có thuộc tính nào cho danh mục này. Hãy thêm thuộc tính bên dưới.'
                      : 'Bạn có thể thêm các thuộc tính (ví dụ: RAM, Độ phân giải) cho danh mục này. Các thuộc tính sẽ được lưu sau khi bạn tạo danh mục.'}
                  </p>
                ) : (
                  <div className={styles.attributesList}>
                    {attributes.map((attr, index) => (
                      <div key={attr.id ?? `local-${index}`} className={styles.attributeItem}>
                        <div className={styles.attributeInfo}>
                          <span className={styles.attributeName}>{attr.name}</span>
                        </div>
                        <div className={styles.attributeActions}>
                          <button
                            type="button"
                            className={`${styles.attributeActionButton} ${styles.attributeEditButton}`}
                            onClick={() => handleEditAttribute(attr, index)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className={`${styles.attributeActionButton} ${styles.attributeDeleteButton}`}
                            onClick={() => handleDeleteAttribute(attr, index)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.attributeEditor}>
                  <input
                    type="text"
                    value={newAttribute.name}
                    onChange={(e) =>
                      setNewAttribute((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Tên thuộc tính (vd: RAM, Độ phân giải)"
                  />
                  <button
                    type="button"
                    className={styles.addAttributeButton}
                    onClick={handleAddAttribute}
                  >
                    Thêm thuộc tính
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={styles.cancelButton}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}