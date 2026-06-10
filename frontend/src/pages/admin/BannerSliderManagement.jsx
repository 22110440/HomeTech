import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './BannerSliderManagement.module.css';

const bannerTemplate = {
  displayOrder: 0,
  type: 'BANNER',
  active: true,
  showOnMobile: true,
};

const footerTemplate = {
  id: null,
  about: '',
  hotline: '',
  email: '',
  address: '',
  supportHours: '',
  facebookUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  tiktokUrl: '',
  active: true,
};

function BannerSliderManagement() {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [formData, setFormData] = useState(bannerTemplate);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [footerForm, setFooterForm] = useState(footerTemplate);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const [bannerRes, sliderRes, footerRes] = await Promise.all([
        adminAPI.getSiteBanners('BANNER'),
        adminAPI.getSiteBanners('SLIDER'),
        adminAPI.getFooterContent().catch(() => ({ data: footerTemplate })),
      ]);
      setBanners(bannerRes.data || []);
      setSliders(sliderRes.data || []);
      setFooterForm({ ...footerTemplate, ...(footerRes.data || {}) });
    } catch (error) {
      console.error('Load marketing content failed:', error);
      showStatus('error', 'Không thể tải dữ liệu marketing');
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
    e.target.value = '';
  };

  const handleFooterChange = (e) => {
    const { name, value } = e.target;
    setFooterForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    const editingItem = [...banners, ...sliders].find((item) => item.id === editingId);
    const sliderLimitReached =
      formData.type === 'SLIDER' &&
      sliders.length >= 2 &&
      editingItem?.type !== 'SLIDER';

    if (sliderLimitReached) {
      showStatus('error', 'Slider cố định hai bên chỉ được quản lý tối đa 2 ảnh');
      return;
    }

    if (!editingId && !imageFile) {
      showStatus('error', 'Vui lòng chọn file ảnh từ máy');
      return;
    }

    const payload = new FormData();
    payload.append('type', formData.type);
    payload.append('displayOrder', String(Number(formData.displayOrder) || 0));
    payload.append('active', String(Boolean(formData.active)));
    payload.append('showOnMobile', String(Boolean(formData.showOnMobile)));
    if (imageFile) {
      payload.append('image', imageFile);
    }

    try {
      if (editingId) {
        await adminAPI.updateBanner(editingId, payload);
        showStatus('success', 'Cập nhật banner thành công');
      } else {
        await adminAPI.createBanner(payload);
        showStatus('success', 'Tạo banner mới thành công');
      }
      await loadContent();
      handleResetForm();
    } catch (error) {
      console.error('Save banner failed:', error);
      showStatus('error', error.response?.data?.message || error.response?.data?.error || 'Không thể lưu banner');
    }
  };

  const handleFooterSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateFooterContent(footerForm);
      showStatus('success', 'Đã cập nhật footer cho khách hàng');
      await loadContent();
    } catch (error) {
      console.error('Save footer failed:', error);
      showStatus('error', error.response?.data?.message || 'Không thể lưu footer');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      displayOrder: item.displayOrder ?? 0,
      type: item.type || 'BANNER',
      active: item.active,
      showOnMobile: item.showOnMobile,
    });
    setImageFile(null);
    setImagePreview(item.imageUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingId(null);
    setFormData(bannerTemplate);
    setImageFile(null);
    setImagePreview('');
  };

  const handleToggle = async (item) => {
    try {
      await adminAPI.toggleBanner(item.id, !item.active);
      showStatus('success', `Đã ${item.active ? 'ẩn' : 'hiển thị'} ${item.type.toLowerCase()}`);
      await loadContent();
    } catch (error) {
      console.error('Toggle banner failed:', error);
      showStatus('error', 'Không thể thay đổi trạng thái');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Xác nhận xóa ảnh #${item.id}?`)) return;
    try {
      await adminAPI.deleteBanner(item.id);
      showStatus('success', 'Đã xóa banner/slider');
      await loadContent();
    } catch (error) {
      console.error('Delete banner failed:', error);
      showStatus('error', 'Không thể xóa banner/slider');
    }
  };

  const renderList = (items, title) => (
    <div className={styles.listSection}>
      <div className={styles.listHeader}>
        <h3>{title}</h3>
        <span>{items.length} mục</span>
      </div>
      <div className={styles.cardList}>
        {items.map((item) => (
          <div key={item.id} className={`${styles.card} ${!item.active ? styles.cardMuted : ''}`}>
            <div className={styles.cardImage} style={{ backgroundImage: `url(${item.imageUrl})` }} />
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <h4>{item.type === 'SLIDER' ? 'Ảnh cố định cạnh trang' : 'Banner trang chủ'} #{item.id}</h4>
                <span className={`${styles.statusBadge} ${item.active ? styles.active : styles.inactive}`}>
                  {item.active ? 'Đang hiển thị' : 'Đã ẩn'}
                </span>
              </div>
              <div className={styles.meta}>
                <span>Thứ tự: {item.displayOrder ?? 0}</span>
                <span>Loại: {item.type}</span>
                {item.imageFileName && <span>File: {item.imageFileName}</span>}
              </div>
              <div className={styles.cardActions}>
                <button type="button" onClick={() => handleEdit(item)}>Sửa</button>
                <button type="button" onClick={() => handleToggle(item)}>
                  {item.active ? 'Ẩn' : 'Hiển thị'}
                </button>
                <button type="button" className={styles.danger} onClick={() => handleDelete(item)}>
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <div className={styles.emptyState}>Chưa có dữ liệu</div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  const editingItem = [...banners, ...sliders].find((item) => item.id === editingId);
  const sliderLimitReached =
    formData.type === 'SLIDER' &&
    sliders.length >= 2 &&
    editingItem?.type !== 'SLIDER';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Quản lý Banner & Slider</h2>
          <p>Thiết lập nội dung hiển thị tại trang chủ cho khách hàng</p>
        </div>
        {statusMessage && (
          <div className={`${styles.status} ${styles[statusMessage.type]}`}>
            {statusMessage.message}
          </div>
        )}
      </header>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3>{editingId ? 'Sửa banner/slider' : 'Thêm banner/slider'}</h3>
            <p>Điền thông tin để hiển thị banner trên trang chủ</p>
          </div>
          {editingId && (
            <button type="button" className={styles.linkBtn} onClick={handleResetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>
        <form className={styles.form} onSubmit={handleBannerSubmit}>
          <label className={styles.imagePicker}>
            <span>Ảnh hiển thị</span>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <div className={styles.imagePickerBody}>
              {imagePreview ? (
                <img src={imagePreview} alt="Ảnh banner/slider" />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <strong>Chọn file ảnh từ máy</strong>
                  <small>Khuyến nghị: banner ngang cho Banner, ảnh dọc cho Slider hai bên.</small>
                </div>
              )}
            </div>
          </label>
          <div className={styles.formGrid}>
            <label>
              Thứ tự hiển thị
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                min="0"
              />
            </label>
            <label>
              Loại
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="BANNER">Banner trang chủ</option>
                <option value="SLIDER">Ảnh cố định hai bên</option>
              </select>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              Hiển thị
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                name="showOnMobile"
                checked={formData.showOnMobile}
                onChange={handleChange}
              />
              Hiển thị trên mobile
            </label>
          </div>
          {sliderLimitReached && (
            <p className={styles.limitNotice}>
              Slider cố định hai bên đã đủ 2 ảnh. Hãy sửa/xóa ảnh hiện có nếu muốn thay thế.
            </p>
          )}
          <div className={styles.formActions}>
            <button type="submit" disabled={sliderLimitReached}>
              {editingId ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </section>

      {renderList(banners, 'Banner trang chủ')}
      {renderList(sliders, 'Ảnh cố định hai bên (tối đa 2)')}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3>Nội dung Footer khách hàng</h3>
            <p>Cập nhật thông tin liên hệ hiển thị ở cuối trang</p>
          </div>
        </div>
        <form className={styles.form} onSubmit={handleFooterSubmit}>
          <div className={styles.formGrid}>
            <label>
              Giới thiệu ngắn
              <textarea
                name="about"
                value={footerForm.about}
                onChange={handleFooterChange}
                rows={3}
              />
            </label>
            <label>
              Hotline
              <input name="hotline" value={footerForm.hotline} onChange={handleFooterChange} />
            </label>
            <label>
              Email
              <input name="email" value={footerForm.email} onChange={handleFooterChange} />
            </label>
            <label>
              Địa chỉ
              <input name="address" value={footerForm.address} onChange={handleFooterChange} />
            </label>
            <label>
              Thời gian hỗ trợ
              <input name="supportHours" value={footerForm.supportHours} onChange={handleFooterChange} />
            </label>
            <label>
              Facebook
              <input name="facebookUrl" value={footerForm.facebookUrl} onChange={handleFooterChange} />
            </label>
            <label>
              Instagram
              <input name="instagramUrl" value={footerForm.instagramUrl} onChange={handleFooterChange} />
            </label>
            <label>
              YouTube
              <input name="youtubeUrl" value={footerForm.youtubeUrl} onChange={handleFooterChange} />
            </label>
            <label>
              TikTok
              <input name="tiktokUrl" value={footerForm.tiktokUrl} onChange={handleFooterChange} />
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit">Lưu footer</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default BannerSliderManagement;
