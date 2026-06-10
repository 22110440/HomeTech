import axios from 'axios';
import { API_BASE_URL } from '../config/runtime';

export const getApiErrorMessage = (
  error,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.'
) => {
  const data = error?.response?.data;
  const rawMessage =
    typeof error?.message === 'string' ? error.message.trim() : '';

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    const message = data.message || data.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  if (!error?.response) {
    if (
      rawMessage &&
      !/network error|failed to fetch|econnrefused|timeout|load failed/i.test(
        rawMessage
      )
    ) {
      return rawMessage;
    }
    return 'Không thể kết nối backend. Vui lòng kiểm tra server và database.';
  }

  return rawMessage || fallback;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm token vào header nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Xử lý response và refresh token nếu cần
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Bỏ qua lỗi network hoặc lỗi không có response
    if (!error.response) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Chỉ redirect nếu không phải là request đến auth endpoint
        if (!originalRequest.url.includes('/auth/')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  // Đăng ký
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  // Đăng ký admin
  registerAdmin: async (username, email, password) => {
    const response = await api.post('/auth/register-admin', {
      username,
      email,
      password,
    });
    return response.data;
  },

  registerTechnician: async (username, email, password) => {
    const response = await api.post('/auth/register-technician', {
      username,
      email,
      password,
    });
    return response.data;
  },

  // Đăng nhập
  login: async (usernameOrEmail, password) => {
    const response = await api.post('/auth/login', {
      usernameOrEmail,
      password,
    });
    return response.data;
  },

  // Đăng nhập admin
  loginAdmin: async (usernameOrEmail, password) => {
    const response = await api.post('/auth/admin/login', {
      usernameOrEmail,
      password,
    });
    return response.data;
  },

  // Quên mật khẩu
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  // Đặt lại mật khẩu
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  // Xác thực email
  verifyEmail: async (token) => {
    const response = await api.get('/auth/verify-email', {
      params: { token },
    });
    return response.data;
  },

  // Đăng xuất
  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // Orders
  // Lấy tất cả đơn hàng của admin (nếu bạn đã thêm endpoint /admin/all)
  getAllOrdersAdmin: async () => {
    const response = await api.get('/orders/admin/all');
    return response.data;
  },

  // Lấy đơn hàng theo trạng thái (đã có rồi nhưng giữ lại cho rõ)
  getOrdersByStatusAdmin: async (status) => {
    const response = await api.get(`/orders/admin/status/${status}`);
    return response.data;
  },

  // Lấy chi tiết đơn hàng
  getOrderDetail: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Cập nhật trạng thái đơn hàng
  updateOrderStatus: async (orderId, newStatus) => {
    const response = await api.put(`/orders/${orderId}/status`, null, {
      params: { newStatus }
    });
    return response.data;
  },

  // Hủy đơn bởi admin
  cancelOrderByAdmin: async (orderId) => {
    const response = await api.put(`/orders/${orderId}/cancel/admin`);
    return response.data;
  },

  // Kiểm tra có thể hủy đơn không
  canCancelOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/can-cancel`);
    return response.data;
  },

  // Lấy danh sách trạng thái đơn hàng (dùng cho select)
  getOrderStatuses: async () => {
    const response = await api.get('/orders/statuses');
    return response.data;
  },

  // Vouchers
  getAllVouchers: async () => {
    const response = await api.get('/vouchers');
    return response.data;
  },

  createVoucher: async (voucher) => {
    const response = await api.post('/vouchers', voucher);
    return response.data;
  },

  updateVoucher: async (id, voucher) => {
    const response = await api.put(`/vouchers/${id}`, voucher);
    return response.data;
  },

  deleteVoucher: async (id) => {
    const response = await api.delete(`/vouchers/${id}`);
    return response.data;
  },

  // =================== BỔ SUNG VÀO userAPI (nếu người dùng cần xem đơn hàng của mình) ===================

  // User xem danh sách đơn hàng của mình
  getMyOrders: async (userId) => {
    const response = await api.get(`/orders/user/${userId}`);
    return response.data;
  },

  // User xem đơn hàng theo trạng thái
  getMyOrdersByStatus: async (userId, status) => {
    const response = await api.get(`/orders/user/${userId}/status/${status}`);
    return response.data;
  },

  // User hủy đơn hàng (trong 30 phút)
  cancelOrderByUser: async (userId, orderId) => {
    const response = await api.put(`/orders/${orderId}/cancel/user/${userId}`);
    return response.data;
  },

  // Preview đơn hàng trước khi đặt
  previewOrder: async (userId, voucherCode = null, productId = null, quantity = null) => {
    const params = { userId };
    if (voucherCode) params.voucherCode = voucherCode;
    if (productId) params.productId = productId;
    if (Number.isInteger(quantity)) params.quantity = quantity;

    const response = await api.get('/orders/preview', {
      params
    });
    return response.data;
  },

  // Tạo đơn hàng
  createOrder: async (userId, options = {}) => {
    const { voucherCode, paymentMethod, productId, quantity } = options;
    const params = {};
    if (voucherCode) {
      params.voucherCode = voucherCode;
    }
    if (paymentMethod) {
      params.paymentMethod = paymentMethod;
    }
    if (productId) {
      params.productId = productId;
    }
    if (Number.isInteger(quantity)) {
      params.quantity = quantity;
    }
    const response = await api.post(`/orders/create/${userId}`, null, {
      params
    });
    return response.data;
  },
  getAllOrders: async () => {
    const response = await api.get('/orders/admin/all');
    return response.data;
  },

  getOrdersByStatus: async (status) => {
    const response = await api.get(`/orders/admin/status/${status}`);
    return response.data;
  },

  getOrdersByUser: async (userId) => {
    const response = await api.get(`/orders/user/${userId}`);
    return response.data;
  },

  broadcastNotification: async (payload) => {
    const response = await api.post('/admin/notifications/broadcast', payload);
    return response.data;
  },

  broadcastMarketingEmail: async (payload) => {
    const response = await api.post('/admin/marketing/email', payload);
    return response.data;
  },

  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Products
  getAllProducts: async () => {
    const response = await api.get('/products/all');
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (product) => {
    const response = await api.post('/products', product);
    return response.data;
  },

  updateProduct: async (id, product) => {
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  toggleProduct: async (id) => {
    const response = await api.put(`/products/${id}/toggle`);
    return response.data;
  },

  uploadProductImages: async (productId, files, variantId = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (variantId) {
      formData.append('variantId', variantId);
    }
    const response = await api.post(`/products/${productId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProductImages: async (productId) => {
    const response = await api.get(`/products/${productId}/images`);
    return response.data;
  },

  deleteProductImage: async (imageId) => {
    const response = await api.delete(`/products/images/${imageId}`);
    return response.data;
  },

  updateImageDisplayOrder: async (imageId, displayOrder) => {
    const response = await api.put(`/products/images/${imageId}/display-order`, {
      displayOrder: displayOrder,
    });
    return response.data;
  },

  // Marketing content (banners, sliders, footer)
  getSiteBanners: async (type = null) => {
    const response = await api.get('/admin/content/banners', {
      params: type ? { type } : undefined,
    });
    return response.data;
  },

  getBannerById: async (id) => {
    const response = await api.get(`/admin/content/banners/${id}`);
    return response.data;
  },

  createBanner: async (payload) => {
    const config = payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
    const response = await api.post('/admin/content/banners', payload, config);
    return response.data;
  },

  updateBanner: async (id, payload) => {
    const config = payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
    const response = await api.put(`/admin/content/banners/${id}`, payload, config);
    return response.data;
  },

  toggleBanner: async (id, active) => {
    const response = await api.put(`/admin/content/banners/${id}/toggle`, null, {
      params: typeof active === 'boolean' ? { active } : undefined,
    });
    return response.data;
  },

  deleteBanner: async (id) => {
    const response = await api.delete(`/admin/content/banners/${id}`);
    return response.data;
  },

  getFooterContent: async () => {
    const response = await api.get('/admin/content/footer');
    return response.data;
  },

  updateFooterContent: async (payload) => {
    const response = await api.put('/admin/content/footer', payload);
    return response.data;
  },

  // Sort products
  sortProductsByPriceAsc: async () => {
    const response = await api.get('/products/sort/price/asc');
    return response.data;
  },

  sortProductsByPriceDesc: async () => {
    const response = await api.get('/products/sort/price/desc');
    return response.data;
  },

  sortProductsBySoldAsc: async () => {
    const response = await api.get('/products/sort/sold/asc');
    return response.data;
  },

  sortProductsBySoldDesc: async () => {
    const response = await api.get('/products/sort/sold/desc');
    return response.data;
  },

  // Categories
  getAllCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  // Category attributes
  getCategoryAttributes: async (categoryId) => {
    const response = await api.get(`/categories/${categoryId}/attributes`);
    return response.data;
  },

  createCategoryAttribute: async (categoryId, attribute) => {
    const response = await api.post(`/categories/${categoryId}/attributes`, attribute);
    return response.data;
  },

  updateCategoryAttribute: async (attributeId, attribute) => {
    const response = await api.put(`/categories/attributes/${attributeId}`, attribute);
    return response.data;
  },

  deleteCategoryAttribute: async (attributeId) => {
    const response = await api.delete(`/categories/attributes/${attributeId}`);
    return response.data;
  },

  getCategoryById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  getCategoryInfo: async (id) => {
    const response = await api.get(`/categories/${id}/info`);
    return response.data;
  },

  createCategory: async (category) => {
    const response = await api.post('/categories', category);
    return response.data;
  },

  updateCategory: async (id, category) => {
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Revenue
  getRevenueStats: async (params) => {
    const response = await api.get('/revenue/stats', { params });
    return response.data;
  },

  getRevenueTopProducts: async (params) => {
    const response = await api.get('/revenue/top-products', { params });
    return response.data;
  },

  // Users
  getAllUsers: async () => {
    const response = await api.get('/users/all');
    return response.data;
  },

  getUsersCount: async () => {
    const response = await api.get('/users/count');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUserStatus: async (id, enabled) => {
    const response = await api.put(`/users/${id}/status`, { enabled });
    return response.data;
  },

  searchUsers: async (keyword) => {
    const response = await api.get('/users/search', {
      params: { keyword }
    });
    return response.data;
  },

  // Repair service packages (admin)
  getAllRepairPackagesAdmin: async (phoneType = null) => {
    const response = await api.get('/admin/repair-packages', {
      params: phoneType ? { phoneType } : {}
    });
    return response.data;
  },

  getRepairPackageByIdAdmin: async (id) => {
    const response = await api.get(`/admin/repair-packages/${id}`);
    return response.data;
  },

  createRepairPackageAdmin: async (formData) => {
    const response = await api.post('/admin/repair-packages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateRepairPackageAdmin: async (id, formData) => {
    const response = await api.put(`/admin/repair-packages/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteRepairPackageAdmin: async (id) => {
    const response = await api.delete(`/admin/repair-packages/${id}`);
    return response.data;
  },


  // Repair phone categories (admin)
  getAllRepairPhoneCategoriesAdmin: async () => {
    const response = await api.get('/admin/repair-phone-categories');
    return response.data;
  },

  createRepairPhoneCategoryAdmin: async (payload) => {
    const response = await api.post('/admin/repair-phone-categories', payload);
    return response.data;
  },

  updateRepairPhoneCategoryAdmin: async (id, payload) => {
    const response = await api.put(`/admin/repair-phone-categories/${id}`, payload);
    return response.data;
  },

  deleteRepairPhoneCategoryAdmin: async (id) => {
    const response = await api.delete(`/admin/repair-phone-categories/${id}`);
    return response.data;
  },

  // Repair service categories (admin)
  getAllRepairServiceCategoriesAdmin: async () => {
    const response = await api.get('/admin/repair-service-categories');
    return response.data;
  },

  createRepairServiceCategoryAdmin: async (payload) => {
    const response = await api.post('/admin/repair-service-categories', payload);
    return response.data;
  },

  updateRepairServiceCategoryAdmin: async (id, payload) => {
    const response = await api.put(`/admin/repair-service-categories/${id}`, payload);
    return response.data;
  },

  deleteRepairServiceCategoryAdmin: async (id) => {
    const response = await api.delete(`/admin/repair-service-categories/${id}`);
    return response.data;
  },
  // Repair categories (admin)
  getAllRepairCategoriesAdmin: async () => {
    const response = await api.get('/admin/repair-categories');
    return response.data;
  },

  createRepairCategoryAdmin: async (payload) => {
    const response = await api.post('/admin/repair-categories', payload);
    return response.data;
  },

  updateRepairCategoryAdmin: async (id, payload) => {
    const response = await api.put(`/admin/repair-categories/${id}`, payload);
    return response.data;
  },

  deleteRepairCategoryAdmin: async (id) => {
    const response = await api.delete(`/admin/repair-categories/${id}`);
    return response.data;
  },

  getAllRepairBookingsAdmin: async () => {
    const response = await api.get('/admin/repair-bookings');
    return response.data;
  },

  createRepairBookingAdmin: async (payload) => {
    const response = await api.post('/admin/repair-bookings', payload);
    return response.data;
  },

  updateRepairBookingAdmin: async (bookingId, payload) => {
    const response = await api.put(`/admin/repair-bookings/${bookingId}`, payload);
    return response.data;
  },

  deleteRepairBookingAdmin: async (bookingId) => {
    const response = await api.delete(`/admin/repair-bookings/${bookingId}`);
    return response.data;
  },

  updateRepairBookingProgressAdmin: async (bookingId, payload) => {
    const response = await api.put(`/admin/repair-bookings/${bookingId}/progress`, payload);
    return response.data;
  },

  // Reviews Management
  getAllReviews: async () => {
    const response = await api.get('/reviews/all');
    return response.data;
  },

  hideReview: async (reviewId) => {
    const response = await api.put(`/reviews/${reviewId}/hide`);
    return response.data;
  },

  showReview: async (reviewId) => {
    const response = await api.put(`/reviews/${reviewId}/show`);
    return response.data;
  },

  // Review Responses
  addResponseToReview: async (reviewId, adminId, content) => {
    const response = await api.post(`/reviews/${reviewId}/response`, null, {
      params: { adminId, content }
    });
    return response.data;
  },

  deleteResponse: async (responseId) => {
    const response = await api.delete(`/reviews/response/${responseId}`);
    return response.data;
  },

  getResponseByReview: async (reviewId) => {
    const response = await api.get(`/reviews/${reviewId}/response`);
    return response.data;
  },
};
// User API (Public)
export const userAPI = {
  // Products
  getAllProducts: async () => {
    const response = await api.get('/products');
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getProductImages: async (productId) => {
    const response = await api.get(`/products/${productId}/images`);
    return response.data;
  },

  getProductVariants: async (productId) => {
    const response = await api.get(`/products/${productId}/variants`);
    return response.data;
  },

  getActiveProductsByCategory: async (categoryId) => {
    const response = await api.get(`/products/category/${categoryId}/active`);
    return response.data;
  },

  searchProducts: async (keyword) => {
    const response = await api.get('/products/search', {
      params: { keyword }
    });
    return response.data;
  },

  getTopSelling: async () => {
    const response = await api.get('/products/top-selling');
    return response.data;
  },

  getNewestProducts: async () => {
    const response = await api.get('/products/newest');
    return response.data;
  },

  getLast7DaysProducts: async () => {
    const response = await api.get('/products/last-7-days');
    return response.data;
  },

  // Categories
  getAllCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  getCategoryById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Cart
  getCart: async (userId) => {
    const response = await api.get(`/cart/user/${userId}`);
    return response.data;
  },
  createOrder: async (userId, options = {}) => {
    const { voucherCode, paymentMethod, productId, quantity } = options;
    const params = {};
    if (voucherCode) params.voucherCode = voucherCode;
    if (paymentMethod) params.paymentMethod = paymentMethod;
    if (productId) params.productId = productId;
    if (Number.isInteger(quantity)) params.quantity = quantity;
    const response = await api.post(`/orders/create/${userId}`, null, {
      params
    });
    return response.data;
  },

  addToCart: async (userId, productId, quantity = 1, variantId = null) => {
    // Gửi params trong URL query string cho POST request
    try {
      let url = `/cart/add?userId=${userId}&productId=${productId}&quantity=${quantity}`;
      if (variantId) {
        url += `&variantId=${variantId}`;
      }
      const response = await api.post(
        url,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  },

  increaseCartItem: async (userId, itemId) => {
    const response = await api.put(`/cart/increase/${userId}/${itemId}`);
    return response.data;
  },

  decreaseCartItem: async (userId, itemId) => {
    const response = await api.put(`/cart/decrease/${userId}/${itemId}`);
    return response.data;
  },

  deleteCartItem: async (userId, itemId) => {
    const response = await api.delete(`/cart/remove/${userId}/${itemId}`);
    return response.data;
  },

  // Favorites
  getFavorites: async (userId) => {
    const response = await api.get(`/favorites/user/${userId}`);
    return response.data;
  },

  addFavorite: async (userId, productId) => {
    const response = await api.post('/favorites', null, {
      params: { userId, productId }
    });
    return response.data;
  },

  removeFavorite: async (userId, productId) => {
    const response = await api.delete('/favorites', {
      params: { userId, productId }
    });
    return response.data;
  },

  checkFavorite: async (userId, productId) => {
    const response = await api.get(`/favorites/user/${userId}/product/${productId}`);
    return response.data;
  },

  // Reviews
  getProductReviews: async (productId) => {
    const response = await api.get(`/reviews/product/${productId}`);
    return response.data;
  },

  // Marketing content
  getHeroBanners: async () => {
    const response = await api.get('/content/banners', {
      params: { type: 'BANNER' }
    });
    return response.data;
  },

  getSliderItems: async () => {
    const response = await api.get('/content/sliders');
    return response.data;
  },

  getFooterContent: async () => {
    const response = await api.get('/content/footer');
    return response.data;
  },

  getProductRating: async (productId) => {
    const response = await api.get(`/reviews/rating/${productId}`);
    return response.data;
  },

  createReview: async (productId, customerId, rating, content, images = []) => {
    const response = await api.post('/reviews', images || [], {
      params: { productId, customerId, rating, content }
    });
    return response.data;
  },

  // Responses
  getReviewResponse: async (reviewId) => {
    const response = await api.get(`/reviews/${reviewId}/response`);
    return response.data;
  },

  addReviewResponse: async (reviewId, adminId, content) => {
    const response = await api.post(`/reviews/${reviewId}/response`, null, {
      params: { adminId, content }
    });
    return response.data;
  },

  deleteReviewResponse: async (responseId) => {
    const response = await api.delete(`/reviews/response/${responseId}`);
    return response.data;
  },

  // Orders
  getOrders: async (userId) => {
    const response = await api.get(`/orders/user/${userId}`);
    return response.data;
  },

  previewOrder: async (userId, voucherCode = null, productId = null, quantity = null) => {
    const params = { userId };
    if (voucherCode) params.voucherCode = voucherCode;
    if (productId) params.productId = productId;
    if (Number.isInteger(quantity)) params.quantity = quantity;
    const response = await api.get('/orders/preview', {
      params,
    });
    return response.data;
  },

  getOrdersByStatus: async (userId, status) => {
    const response = await api.get(`/orders/user/${userId}/status/${status}`);
    return response.data;
  },

  getOrderDetail: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  getOrderStatuses: async () => {
    const response = await api.get('/orders/statuses');
    return response.data;
  },

  canCancelOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/can-cancel`);
    return response.data;
  },

  cancelOrder: async (orderId, userId) => {
    const response = await api.put(`/orders/${orderId}/cancel/user/${userId}`);
    return response.data;
  },


  // Repair packages & bookings

  getRepairPhoneCategories: async () => {
    const response = await api.get('/repair-phone-categories');
    return response.data;
  },

  getRepairServiceCategories: async () => {
    const response = await api.get('/repair-service-categories');
    return response.data;
  },

  getRepairCategories: async () => {
    const response = await api.get('/repair-categories');
    return response.data;
  },

  getRepairPackages: async (phoneType = null) => {
    const response = await api.get('/repair-packages', {
      params: phoneType ? { phoneType } : {}
    });
    return response.data;
  },

  getRepairPackageDetail: async (id) => {
    const response = await api.get(`/repair-packages/${id}`);
    return response.data;
  },

  createRepairBooking: async (payload) => {
    const response = await api.post('/repair-bookings', payload);
    return response.data;
  },

  updateRepairPaymentMethod: async (bookingId, paymentMethod) => {
    const response = await api.put(`/repair-bookings/${bookingId}/payment-method`, { paymentMethod });
    return response.data;
  },

  getRepairHistory: async (customerId) => {
    const response = await api.get(`/repair-bookings/history/${customerId}`);
    return response.data;
  },

  createRepairVnPayPayment: async (bookingId) => {
    const response = await api.post(`/repair-bookings/${bookingId}/payment/vnpay`);
    return response.data;
  },

  createRepairPayOsPayment: async (bookingId) => {
    const response = await api.post(`/repair-bookings/${bookingId}/payment/payos`);
    return response.data;
  },
  // Expenses
  getExpenses: async (userId, startDate, endDate, groupBy = 'DAY') => {
    const response = await api.get('/orders/my-expenses', {
      params: { userId, startDate, endDate, groupBy }
    });
    return response.data;
  },
};

export default api;

export const paymentAPI = {
  createVnPayPayment: async (orderId) => {
    const response = await api.post('/payment/vnpay/create', null, {
      params: { orderId }
    });
    return response.data;
  },
  createPayOsPayment: async (orderId) => {
  const response = await api.post('/payment/payos/create', null, {
    params: { orderId: orderId }
  });
  return response.data;
}
  
};

export const notificationAPI = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  getUnread: async () => {
    const response = await api.get('/notifications/unread');
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },
  markAsRead: async (notificationId) => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
  delete: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};

export const chatAPI = {
  getMyConversation: async () => {
    const response = await api.get('/chat/conversations/me');
    return response.data;
  },
  getConversationMessages: async (conversationId) => {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },
  getAdminConversations: async () => {
    const response = await api.get('/chat/conversations/admin');
    return response.data;
  },
  sendMessage: async (conversationId, content, file = null) => {
  const formData = new FormData();
  if (conversationId) formData.append('conversationId', conversationId);
  if (content) formData.append('content', content);
  if (file) formData.append('file', file);

  const response = await api.post('/chat/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/chat/unread-count');
    return response.data;
  },
  markAsReadForCustomer: async () => {
    const response = await api.post('/chat/mark-read');
    return response.data;
  },
  getOrCreateAdminConversationForUser: async (userId) => {
    // Backend mapping: @GetMapping("/admin/customer/{userId}/conversation") under @RequestMapping("/api/chat")
    const response = await api.get(`/chat/admin/customer/${userId}/conversation`);
    return response.data;
  },
};

export const chatbotAPI = {
  getSettings: async () => {
    const response = await api.get('/admin/chatbot/settings');
    return response.data;
  },
  updateSettings: async (settings) => {
    const response = await api.post('/admin/chatbot/settings', settings);
    return response.data;
  },
  getRules: async () => {
    const response = await api.get('/admin/chatbot/rules');
    return response.data;
  },
  createRule: async (rule) => {
    const response = await api.post('/admin/chatbot/rules', rule);
    return response.data;
  },
  updateRule: async (id, rule) => {
    const response = await api.put(`/admin/chatbot/rules/${id}`, rule);
    return response.data;
  },
  deleteRule: async (id) => {
    const response = await api.delete(`/admin/chatbot/rules/${id}`);
    return response.data;
  },
};

const TRADE_IN_API_BASE_URL = 'http://localhost:8001';

const tradeInApi = axios.create({
  baseURL: TRADE_IN_API_BASE_URL,
});

export const tradeInAPI = {
  getPricing: async () => {
    const response = await tradeInApi.get('/pricing');
    return response.data;
  },

  savePricing: async (payload) => {
    const response = await tradeInApi.post('/pricing', payload);
    return response.data;
  },

  analyzeTradeInImages: async (payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    const response = await tradeInApi.post('/analyze/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  analyzeTradeInVideo: async (file, sampleInterval = 15) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sample_interval', String(sampleInterval));
    const response = await tradeInApi.post('/analyze/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
