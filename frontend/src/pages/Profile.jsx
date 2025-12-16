import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import styles from './Profile.module.css';

function Profile() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    phone: '',
    addressLine: '',
    commune: '',
    district: '',
    city: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserInfo();
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
        const userData = response.data.data;
        setUserInfo(userData);
        
        // Load detailed profile if user has ID
        if (userData.id) {
          try {
            const profileResponse = await api.get(`/profile/${userData.id}`);
            const profileData = profileResponse.data;
            
            // Merge profile data with user info
            setUserInfo({
              ...userData,
              dateOfBirth: profileData.dateOfBirth || '',
              addressLine: profileData.addressLine || '',
              commune: profileData.commune || '',
              district: profileData.district || '',
              city: profileData.city || '',
              phone: profileData.phone || ''
            });
            
            // Set form data
            setFormData({
              dateOfBirth: profileData.dateOfBirth || '',
              phone: profileData.phone || '',
              addressLine: profileData.addressLine || '',
              commune: profileData.commune || '',
              district: profileData.district || '',
              city: profileData.city || ''
            });
          } catch (profileError) {
            console.warn('Could not load detailed profile:', profileError);
          }
        }
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
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate phone number - must be exactly 10 digits
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Số điện thoại phải có đúng 10 chữ số';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!userInfo || !userInfo.id) {
      alert('Không tìm thấy thông tin người dùng');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setUpdating(true);
      
      const formDataToSend = new FormData();
      const dto = {
        fullName: userInfo.fullName || '',
        email: userInfo.email || '',
        phone: formData.phone || '',
        dateOfBirth: formData.dateOfBirth,
        addressLine: formData.addressLine,
        commune: formData.commune,
        district: formData.district,
        city: formData.city
      };
      
      formDataToSend.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
      
      await api.put(`/profile/${userInfo.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Cập nhật thông tin thành công!');
      setShowUpdateModal(false);
      await loadUserInfo(); // Reload to show updated info
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatAddress = () => {
    // Kiểm tra xem có thông tin địa chỉ nào không
    const hasAddressLine = userInfo?.addressLine && userInfo.addressLine.trim() !== '' && userInfo.addressLine !== 'Chưa cập nhật';
    const hasCommune = userInfo?.commune && userInfo.commune.trim() !== '' && userInfo.commune !== 'Chưa cập nhật';
    const hasDistrict = userInfo?.district && userInfo.district.trim() !== '' && userInfo.district !== 'Chưa cập nhật';
    const hasCity = userInfo?.city && userInfo.city.trim() !== '' && userInfo.city !== 'Chưa cập nhật';
    
    // Nếu không có thành phố/tỉnh (phần quan trọng nhất), chỉ hiển thị "Chưa cập nhật"
    if (!hasCity) {
      return 'Chưa cập nhật';
    }
    
    // Nếu có thành phố/tỉnh, ghép các phần có giá trị
    const parts = [];
    if (hasAddressLine) parts.push(userInfo.addressLine);
    if (hasCommune) parts.push(userInfo.commune);
    if (hasDistrict) parts.push(userInfo.district);
    if (hasCity) parts.push(userInfo.city);
    
    return parts.length > 0 ? parts.join(', ') : 'Chưa cập nhật';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
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
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Thông tin cá nhân</h1>
          <button
            className={styles.updateButton}
            onClick={() => setShowUpdateModal(true)}
          >
            Cập nhật thông tin
          </button>
        </div>
        
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {userInfo.fullName?.charAt(0)?.toUpperCase() || userInfo.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h2 className={styles.userName}>{userInfo.fullName || userInfo.username}</h2>
          </div>

          <div className={styles.infoSection}>
            <div className={styles.infoItem}>
              <label>Tên đăng nhập:</label>
              <span>{userInfo.username || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Email:</label>
              <span>{userInfo.email || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Họ và tên:</label>
              <span>{userInfo.fullName || 'Chưa cập nhật'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Số điện thoại:</label>
              <span>{userInfo.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Ngày sinh:</label>
              <span>{formatDate(userInfo.dateOfBirth)}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Địa chỉ:</label>
              <span>{formatAddress()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUpdateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Cập nhật thông tin</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowUpdateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Tên đăng nhập:</label>
                <input
                  type="text"
                  value={userInfo.username || ''}
                  disabled
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email:</label>
                <input
                  type="email"
                  value={userInfo.email || ''}
                  disabled
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Họ và tên:</label>
                <input
                  type="text"
                  value={userInfo.fullName || ''}
                  disabled
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone">Số điện thoại:</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    // Limit to 10 digits
                    const limitedValue = value.slice(0, 10);
                    setFormData({ ...formData, phone: limitedValue });
                    // Clear error when user types
                    if (errors.phone) {
                      setErrors({ ...errors, phone: '' });
                    }
                  }}
                  placeholder="Ví dụ: 0123456789"
                  className={`${styles.formInput} ${errors.phone ? styles.formInputError : ''}`}
                  maxLength={10}
                />
                {errors.phone && (
                  <span className={styles.errorMessage}>{errors.phone}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dateOfBirth">Ngày sinh:</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="addressLine">Địa chỉ (Số nhà, tên đường):</label>
                <input
                  id="addressLine"
                  type="text"
                  value={formData.addressLine}
                  onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                  placeholder="Ví dụ: 123 Đường ABC"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="commune">Phường/Xã:</label>
                <input
                  id="commune"
                  type="text"
                  value={formData.commune}
                  onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                  placeholder="Ví dụ: Phường 1"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="district">Quận/Huyện:</label>
                <input
                  id="district"
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Ví dụ: Quận 1"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="city">Thành phố/Tỉnh:</label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowUpdateModal(false)}
                  disabled={updating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={updating}
                >
                  {updating ? 'Đang cập nhật...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

