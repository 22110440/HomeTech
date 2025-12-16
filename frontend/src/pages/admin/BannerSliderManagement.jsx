import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './BannerSliderManagement.module.css';

const bannerTemplate = {
  title: '',
  subtitle: '',
  imageUrl: '',
  redirectUrl: '',
  buttonText: '',
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
  const [footerForm, setFooterForm] = useState(footerTemplate);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    loadContent();
  }, []);

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

  const handleFooterChange = (e) => {
    const { name, value } = e.target;
    setFooterForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      displayOrder: Number(formData.displayOrder) || 0,
    };
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
      showStatus('error', error.response?.data?.message || 'Không thể lưu banner');
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
      title: item.title || '',
      subtitle: item.subtitle || '',
      imageUrl: item.imageUrl || '',
      redirectUrl: item.redirectUrl || '',
      buttonText: item.buttonText || '',
      displayOrder: item.displayOrder ?? 0,
      type: item.type || 'BANNER',
      active: item.active,
      showOnMobile: item.showOnMobile,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setEditingId(null);
    setFormData(bannerTemplate);
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
    if (!window.confirm(`Xác nhận xóa ${item.title}?`)) return;
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
                <h4>{item.title}</h4>
                <span className={`${styles.statusBadge} ${item.active ? styles.active : styles.inactive}`}>
                  {item.active ? 'Đang hiển thị' : 'Đã ẩn'}
                </span>
              </div>
              {item.subtitle && <p className={styles.cardSubtitle}>{item.subtitle}</p>}
              <div className={styles.meta}>
                <span>Thứ tự: {item.displayOrder ?? 0}</span>
                <span>Loại: {item.type}</span>
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
          <div className={styles.formGrid}>
            <label>
              Tiêu đề
              <input name="title" value={formData.title} onChange={handleChange} required />
            </label>
            <label>
              Tiêu đề phụ
              <input name="subtitle" value={formData.subtitle} onChange={handleChange} />
            </label>
            <label>
              Ảnh (URL)
              <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} required />
            </label>
            <label>
              Liên kết chuyển hướng
              <input name="redirectUrl" value={formData.redirectUrl} onChange={handleChange} />
            </label>
            <label>
              Nội dung nút
              <input name="buttonText" value={formData.buttonText} onChange={handleChange} />
            </label>
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
                <option value="BANNER">Banner</option>
                <option value="SLIDER">Slider</option>
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
          <div className={styles.formActions}>
            <button type="submit">{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
          </div>
        </form>
      </section>

      {renderList(banners, 'Banner trang chủ')}
      {renderList(sliders, 'Slider khuyến mãi')}

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

