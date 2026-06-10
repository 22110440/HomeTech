import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../../services/api';
import api from '../../services/api';
import styles from './UsersManagement.module.css';

function UsersManagement({ onOpenChat }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleType: 'ADMIN',
  });
  const [adminFormError, setAdminFormError] = useState('');
  const [adminFormSuccess, setAdminFormSuccess] = useState('');
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm]);

  const isUserEnabled = (user) => user?.account?.enabled !== false;

  const getRoleString = (user) => {
    const role = user?.account?.role;
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return role.name || role.toString();
    return String(role);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      console.log('Users API response:', response);
      
      // adminAPI.getAllUsers() trả về response.data từ axios
      // response.data từ backend là List<User> trực tiếp
      let usersData = [];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        usersData = response.data;
      } else {
        usersData = [];
      }
      
      console.log('Parsed users data:', usersData);
      console.log('Number of users:', usersData.length);
      
      if (usersData.length === 0) {
        console.warn('No users found in response');
        setUsers([]);
        return;
      }
      
      // Filter only customers (not admins)
      // Role có thể là enum string "USER" hoặc object
      const customers = usersData.filter(user => {
        if (!user) {
          return false;
        }

        if (!user.account) {
          console.log('User', user.id, 'has no account');
          return false;
        }

        const roleString = getRoleString(user);
        console.log('User', user.id, 'role:', roleString, 'account:', user.account);
        return roleString === 'USER' || roleString === 'ROLE_USER';
      });
      
      console.log('Filtered customers count:', customers.length);
      console.log('Filtered customers:', customers);
      setUsers(customers);
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data);
      alert('Có lỗi khi tải danh sách người dùng: ' + (error.response?.data?.message || error.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.id?.toString().includes(term) ||
        user.account?.username?.toLowerCase().includes(term) ||
        user.fullName?.toLowerCase().includes(term) ||
        user.account?.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term)
      );
    }

    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    setFilteredUsers(filtered);
  };

  const handleToggleUserStatus = async (user) => {
    if (!user) return;

    const currentlyEnabled = isUserEnabled(user);
    const confirmMessage = currentlyEnabled
      ? 'Bạn có chắc muốn khóa tài khoản người dùng này?'
      : 'Bạn có chắc muốn mở khóa tài khoản người dùng này?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setStatusUpdatingUserId(user.id);
      await adminAPI.updateUserStatus(user.id, !currentlyEnabled);

      setUsers(prev =>
        prev.map(u =>
          u.id === user.id
            ? {
                ...u,
                account: {
                  ...u.account,
                  enabled: !currentlyEnabled,
                },
              }
            : u
        )
      );

      setSelectedUser(prev =>
        prev && prev.id === user.id
          ? {
              ...prev,
              account: {
                ...prev.account,
                enabled: !currentlyEnabled,
              },
            }
          : prev
      );

      setUserProfile(prev =>
        prev && prev.id === user.id
          ? { ...prev, enabled: !currentlyEnabled }
          : prev
      );
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Không thể cập nhật trạng thái tài khoản');
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  const handleViewProfile = async (userId) => {
    try {
      setLoadingProfile(true);
      setShowProfileModal(true);
      setUserOrders([]);
      setLoadingOrders(true);
      
      // Load user info
      let userData = null;
      try {
        // adminAPI.getUserById trả về response.data (User object) hoặc throw error nếu 404
        userData = await adminAPI.getUserById(userId);
        console.log('User data from getUserById:', userData);
      } catch (userError) {
        console.error('Error loading user:', userError);
        if (userError.response?.status === 404) {
          alert('Không tìm thấy người dùng với ID: ' + userId);
        } else {
          alert('Có lỗi khi tải thông tin người dùng: ' + (userError.response?.data?.message || userError.message));
        }
        setShowProfileModal(false);
        setLoadingOrders(false);
        return;
      }
      
      if (!userData) {
        alert('Không tìm thấy thông tin người dùng');
        setShowProfileModal(false);
        setLoadingOrders(false);
        return;
      }

      setSelectedUser(userData);
      
      // Load detailed profile (có thể fail nếu user chưa có profile hoặc không phải Customer)
      let profileData = {};
      try {
        const profileResponse = await api.get(`/profile/${userId}`);
        profileData = profileResponse.data || {};
        console.log('Profile data:', profileData);
      } catch (profileError) {
        console.warn('Could not load detailed profile (user may not have profile yet):', profileError);
        // Nếu không load được profile, vẫn hiển thị thông tin cơ bản từ userData
        profileData = {};
      }
      
      // Merge user data with profile data
      setUserProfile({
        id: userData?.id || userId,
        username: userData?.account?.username || '',
        email: userData?.account?.email || '',
        fullName: userData?.fullName || '',
        phone: profileData?.phone || userData?.phone || '',
        dateOfBirth: profileData?.dateOfBirth || '',
        addressLine: profileData?.addressLine || '',
        commune: profileData?.commune || '',
        district: profileData?.district || '',
        city: profileData?.city || '',
        enabled: userData?.account?.enabled !== false
      });

      try {
        const ordersResponse = await adminAPI.getOrdersByUser(userId);
        const ordersData = Array.isArray(ordersResponse?.data)
          ? ordersResponse.data
          : Array.isArray(ordersResponse)
            ? ordersResponse
            : [];
        setUserOrders(ordersData);
      } catch (ordersError) {
        console.warn('Could not load user orders:', ordersError);
        setUserOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      console.error('Error details:', error.response?.data);
      alert('Có lỗi khi tải thông tin người dùng: ' + (error.response?.data?.message || error.message || 'Unknown error'));
      setShowProfileModal(false);
    } finally {
      setLoadingProfile(false);
      setLoadingOrders(false);
    }
  };

  const handleCloseModal = () => {
    setShowProfileModal(false);
    setUserProfile(null);
    setUserOrders([]);
    setSelectedUser(null);
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
    if (!userProfile) return 'Chưa cập nhật';
    
    const hasAddressLine = userProfile.addressLine && userProfile.addressLine.trim() !== '' && userProfile.addressLine !== 'Chưa cập nhật';
    const hasCommune = userProfile.commune && userProfile.commune.trim() !== '' && userProfile.commune !== 'Chưa cập nhật';
    const hasDistrict = userProfile.district && userProfile.district.trim() !== '' && userProfile.district !== 'Chưa cập nhật';
    const hasCity = userProfile.city && userProfile.city.trim() !== '' && userProfile.city !== 'Chưa cập nhật';
    
    if (!hasCity) {
      return 'Chưa cập nhật';
    }
    
    const parts = [];
    if (hasAddressLine) parts.push(userProfile.addressLine);
    if (hasCommune) parts.push(userProfile.commune);
    if (hasDistrict) parts.push(userProfile.district);
    if (hasCity) parts.push(userProfile.city);
    
    return parts.length > 0 ? parts.join(', ') : 'Chưa cập nhật';
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '0₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatOrderDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatusBadge = (enabled) => (
    <span className={`${styles.statusBadge} ${enabled ? styles.statusActive : styles.statusLocked}`}>
      {enabled ? 'Đang hoạt động' : 'Đã khóa'}
    </span>
  );

  const orderStatusMap = {
    WAITING_CONFIRMATION: { label: 'Chờ xác nhận', color: styles.statusWarning },
    CONFIRMED: { label: 'Đã xác nhận', color: styles.statusInfo },
    SHIPPED: { label: 'Đang giao', color: styles.statusPurple },
    COMPLETED: { label: 'Hoàn thành', color: styles.statusSuccess },
    CANCELLED: { label: 'Đã hủy', color: styles.statusDanger },
  };

  const renderOrderStatus = (status) => {
    const info = orderStatusMap[status] || { label: status || 'Không xác định', color: styles.statusMuted };
    return <span className={`${styles.orderStatus} ${info.color}`}>{info.label}</span>;
  };

  const handleStartChat = (user) => {
    if (!user?.id) return;
    if (onOpenChat) {
      onOpenChat(user.id);
    } else {
      navigate('/admin');
    }
  };

  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setAdminFormError('');
    setAdminFormSuccess('');
  };

  const handleCreateStaffAccount = async (e) => {
    e.preventDefault();
    setAdminFormError('');
    setAdminFormSuccess('');

    if (!adminForm.username || !adminForm.email || !adminForm.password || !adminForm.confirmPassword) {
      setAdminFormError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminFormError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (adminForm.password.length < 6) {
      setAdminFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setAdminFormLoading(true);
      const response = adminForm.roleType === 'THO'
        ? await authAPI.registerTechnician(
            adminForm.username,
            adminForm.email,
            adminForm.password,
          )
        : await authAPI.registerAdmin(
            adminForm.username,
            adminForm.email,
            adminForm.password,
          );

      if (response?.success) {
        setAdminFormSuccess(
          response.message ||
            `Tạo tài khoản ${adminForm.roleType === 'THO' ? 'thợ sửa chữa' : 'admin'} thành công! Vui lòng kiểm tra email để xác thực tài khoản.`,
        );
        setAdminForm({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          roleType: adminForm.roleType,
        });
      } else {
        setAdminFormError(response?.message || 'Tạo tài khoản thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Failed to create staff account:', error);
      setAdminFormError(
        error.response?.data?.message || 'Tạo tài khoản thất bại. Vui lòng thử lại.',
      );
    } finally {
      setAdminFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách người dùng...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Người dùng</h1>
        <button
          type="button"
          className={styles.addAdminButton}
          onClick={() => setShowAdminForm((prev) => !prev)}
        >
          {showAdminForm ? 'Đóng form tạo tài khoản' : 'Thêm Admin/Thợ'}
        </button>
      </div>

      {showAdminForm && (
        <div className={styles.adminRegisterSection}>
          <h2 className={styles.sectionTitle}>Tạo tài khoản nhân sự mới</h2>
          <p className={styles.sectionSubtitle}>
            Admin hiện tại có thể tạo tài khoản admin hoặc tài khoản thợ sửa chữa từ cùng một form.
          </p>
          <form className={styles.adminForm} onSubmit={handleCreateStaffAccount}>
            {adminFormError && (
              <div className={styles.alertError}>
                {adminFormError}
              </div>
            )}
            {adminFormSuccess && (
              <div className={styles.alertSuccess}>
                {adminFormSuccess}
              </div>
            )}
            <div className={styles.adminFormRow}>
              <div className={styles.adminFormGroup}>
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={adminForm.username}
                  onChange={handleAdminFormChange}
                  placeholder={adminForm.roleType === 'THO' ? 'Tên đăng nhập thợ sửa chữa' : 'Tên đăng nhập admin'}
                  required
                />
              </div>
              <div className={styles.adminFormGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={adminForm.email}
                  onChange={handleAdminFormChange}
                  placeholder={adminForm.roleType === 'THO' ? 'Email thợ sửa chữa' : 'Email admin'}
                  required
                />
              </div>
            </div>
            <div className={styles.adminFormRow}>
              <div className={styles.adminFormGroup}>
                <label>Vai trò</label>
                <select
                  name="roleType"
                  value={adminForm.roleType}
                  onChange={handleAdminFormChange}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="THO">Thợ sửa chữa</option>
                </select>
              </div>
              <div className={styles.adminFormGroup}></div>
            </div>

            <div className={styles.adminFormRow}>
              <div className={styles.adminFormGroup}>
                <label>Mật khẩu</label>
                <input
                  type="password"
                  name="password"
                  value={adminForm.password}
                  onChange={handleAdminFormChange}
                  placeholder="Mật khẩu (ít nhất 6 ký tự)"
                  required
                  minLength={6}
                />
              </div>
              <div className={styles.adminFormGroup}>
                <label>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={adminForm.confirmPassword}
                  onChange={handleAdminFormChange}
                  placeholder="Nhập lại mật khẩu"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className={styles.adminFormActions}>
              <button type="submit" disabled={adminFormLoading}>
                {adminFormLoading ? 'Đang tạo...' : 'Tạo tài khoản nhân sự'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không tìm thấy người dùng nào</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const enabled = isUserEnabled(user);
                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.account?.username || 'N/A'}</td>
                    <td>{user.fullName || 'Chưa cập nhật'}</td>
                    <td>{user.account?.email || 'N/A'}</td>
                    <td>{user.phone || 'Chưa cập nhật'}</td>
                    <td>{renderStatusBadge(enabled)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.viewButton}
                          onClick={() => handleViewProfile(user.id)}
                        >
                          Xem profile
                        </button>
                        <button
                          className={styles.chatButton}
                          title="Chat với khách hàng"
                          onClick={() => handleStartChat(user)}
                        >
                          💬
                        </button>
                        <button
                          className={`${styles.lockButton} ${enabled ? styles.locked : styles.unlocked}`}
                          disabled={statusUpdatingUserId === user.id}
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {statusUpdatingUserId === user.id
                            ? 'Đang cập nhật...'
                            : enabled
                              ? 'Khóa'
                              : 'Mở khóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Thông tin người dùng</h2>
              <button
                className={styles.modalClose}
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            {loadingProfile ? (
              <div className={styles.modalLoading}>
                <div className={styles.spinner}></div>
                <p>Đang tải thông tin...</p>
              </div>
            ) : userProfile ? (
              <div className={styles.profileInfo}>
                <div className={styles.avatarSection}>
                  <div className={styles.avatar}>
                    {userProfile.fullName?.charAt(0)?.toUpperCase() || userProfile.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <h3 className={styles.profileName}>{userProfile.fullName || userProfile.username}</h3>
                  <div className={styles.modalActionsRow}>
                    {renderStatusBadge(userProfile.enabled)}
                    <button
                      className={`${styles.lockButton} ${userProfile.enabled ? styles.locked : styles.unlocked}`}
                      disabled={statusUpdatingUserId === userProfile.id}
                      onClick={() => handleToggleUserStatus(selectedUser || { id: userProfile.id, account: { enabled: userProfile.enabled } })}
                    >
                      {statusUpdatingUserId === userProfile.id
                        ? 'Đang cập nhật...'
                        : userProfile.enabled
                          ? 'Khóa tài khoản'
                          : 'Mở khóa tài khoản'}
                    </button>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <div className={styles.infoItem}>
                    <label>ID:</label>
                    <span>{userProfile.id}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Tên đăng nhập:</label>
                    <span>{userProfile.username || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email:</label>
                    <span>{userProfile.email || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Họ và tên:</label>
                    <span>{userProfile.fullName || 'Chưa cập nhật'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Số điện thoại:</label>
                    <span>{userProfile.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Ngày sinh:</label>
                    <span>{formatDate(userProfile.dateOfBirth)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Địa chỉ:</label>
                    <span>{formatAddress()}</span>
                  </div>
                </div>

                <div className={styles.ordersSection}>
                  <div className={styles.ordersHeader}>
                    <h3>Đơn hàng đã đặt</h3>
                    {loadingOrders && <div className={styles.smallSpinner}></div>}
                  </div>

                  {loadingOrders ? (
                    <div className={styles.ordersLoading}>
                      <div className={styles.spinner}></div>
                      <p>Đang tải đơn hàng...</p>
                    </div>
                  ) : userOrders.length === 0 ? (
                    <div className={styles.ordersEmpty}>
                      <p>Người dùng chưa có đơn hàng nào</p>
                    </div>
                  ) : (
                    <div className={styles.ordersTableWrapper}>
                      <table className={styles.ordersTable}>
                        <thead>
                          <tr>
                            <th>Mã đơn</th>
                            <th>Ngày đặt</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userOrders.map((order) => (
                            <tr key={order.id}>
                              <td>#{order.id}</td>
                              <td>{formatOrderDate(order.orderDate)}</td>
                              <td>{formatCurrency(order.totalAmount)}</td>
                              <td>{renderOrderStatus(order.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.modalError}>
                <p>Không thể tải thông tin người dùng</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;
