import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userAPI, authAPI } from '../services/api';
import api from '../services/api';
import styles from './Cart.module.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [productImages, setProductImages] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.id) {
      loadCart();
    }
  }, [userInfo]);

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await api.get('/auth/user-info');
      if (response.data.success) {
        setUserInfo(response.data.data);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      navigate('/login');
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await userAPI.getCart(userInfo.id);
      console.log('Cart API response:', response);
      // Response có thể là { success: true, data: [...] } hoặc trực tiếp là array
      const items = (response.data && Array.isArray(response.data)) 
        ? response.data 
        : (Array.isArray(response) ? response : []);
      console.log('Cart items:', items);
      console.log('Items count:', items.length);
      setCartItems(items);

      // Load images for all products
      const imagePromises = items.map(async (item) => {
        if (item.product && item.product.id) {
          try {
            const imagesRes = await userAPI.getProductImages(item.product.id);
            const images = imagesRes.data || [];
            if (images.length > 0 && images[0].imageData) {
              const imageData = images[0].imageData;
              const imageUrl = imageData.startsWith('data:') 
                ? imageData 
                : `data:image/jpeg;base64,${imageData}`;
              return { productId: item.product.id, imageUrl };
            }
          } catch (err) {
            console.error(`Error loading image for product ${item.product.id}:`, err);
          }
        }
        return null;
      });

      const images = await Promise.all(imagePromises);
      const imagesMap = {};
      images.forEach(img => {
        if (img && img.imageUrl) {
          imagesMap[img.productId] = img.imageUrl;
        }
      });
      setProductImages(imagesMap);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrease = async (itemId) => {
    try {
      // Optimistic update - update UI ngay lập tức
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );

      // Gọi API để sync với backend
      const response = await userAPI.increaseCartItem(userInfo.id, itemId);
      console.log('Increase response:', response);
      
      // Kiểm tra response có thành công không
      if (response && response.success === false) {
        throw new Error(response.message || 'Failed to increase quantity');
      }
    } catch (error) {
      console.error('Error increasing quantity:', error);
      console.error('Error details:', error.response?.data);
      alert('Có lỗi xảy ra khi tăng số lượng: ' + (error.response?.data?.message || error.message));
      // Reload cart nếu có lỗi để đồng bộ lại
      loadCart();
    }
  };

  const handleDecrease = async (itemId) => {
    try {
      // Tìm item hiện tại để kiểm tra
      const currentItem = cartItems.find(item => item.id === itemId);
      if (!currentItem || currentItem.quantity <= 1) {
        alert('Số lượng tối thiểu là 1. Vui lòng xóa sản phẩm nếu không muốn mua.');
        return;
      }

      // Optimistic update - update UI ngay lập tức
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );

      // Gọi API để sync với backend
      const response = await userAPI.decreaseCartItem(userInfo.id, itemId);
      console.log('Decrease response:', response);
      
      // Kiểm tra response có thành công không
      if (response && response.success === false) {
        throw new Error(response.message || 'Failed to decrease quantity');
      }
    } catch (error) {
      console.error('Error decreasing quantity:', error);
      console.error('Error details:', error.response?.data);
      alert('Có lỗi xảy ra khi giảm số lượng: ' + (error.response?.data?.message || error.message));
      // Reload cart nếu có lỗi để đồng bộ lại
      loadCart();
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      return;
    }
    try {
      // Optimistic update - xóa khỏi UI ngay lập tức
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));

      // Gọi API để sync với backend
      await userAPI.deleteCartItem(userInfo.id, itemId);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Có lỗi xảy ra khi xóa sản phẩm');
      // Reload cart nếu có lỗi để đồng bộ lại
      loadCart();
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.clear();
      navigate('/login');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.product && item.product.price) {
        return total + (item.product.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      alert('Giỏ hàng của bạn đang trống.');
      return;
    }
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>HomeTech</span>
          </Link>

          <div className={styles.headerActions}>
            <Link to="/" className={styles.homeButton}>
              Trang chủ
            </Link>
            {userInfo ? (
              <>
                <span className={styles.username}>{userInfo.username}</span>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className={styles.loginButton}>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Cart Content */}
      <div className={styles.cartContent}>
        <div className={styles.cartHeader}>
          <h1 className={styles.cartTitle}>Giỏ hàng của tôi</h1>
          {cartItems.length > 0 && (
            <p className={styles.cartSubtitle}>
              {totalItems} {totalItems === 1 ? 'sản phẩm' : 'sản phẩm'}
            </p>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className={styles.emptyCart}>
            <svg className={styles.emptyCartIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2>Giỏ hàng của bạn đang trống</h2>
            <p>Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
            <Link to="/" className={styles.shopButton}>
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className={styles.cartBody}>
            <div className={styles.cartItems}>
              {cartItems.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemImage}>
                    {productImages[item.product?.id] ? (
                      <img
                        src={productImages[item.product.id]}
                        alt={item.product?.name || 'Product'}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={styles.imagePlaceholder} style={{ display: productImages[item.product?.id] ? 'none' : 'flex' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div className={styles.itemInfo}>
                    <Link to={`/product/${item.product?.id}`} className={styles.itemName}>
                      {item.product?.name || 'Sản phẩm không tồn tại'}
                      {item.variant && (
                        <span className={styles.variantName}> - {item.variant.name}</span>
                      )}
                    </Link>
                    <div className={styles.itemPrice}>
                      {item.product?.price ? formatPrice(item.product.price) : 'N/A'}
                    </div>
                  </div>

                  <div className={styles.itemQuantity}>
                    <button
                      onClick={() => handleDecrease(item.id)}
                      className={styles.quantityButton}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className={styles.quantityValue}>{item.quantity}</span>
                    <button
                      onClick={() => handleIncrease(item.id)}
                      className={styles.quantityButton}
                    >
                      +
                    </button>
                  </div>

                  <div className={styles.itemTotal}>
                    {item.product?.price ? formatPrice(item.product.price * item.quantity) : 'N/A'}
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className={styles.deleteButton}
                    title="Xóa sản phẩm"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.cartSummary}>
              <div className={styles.summaryHeader}>
                <h2>Tổng kết đơn hàng</h2>
              </div>
              <div className={styles.summaryContent}>
                <div className={styles.summaryRow}>
                  <span>Tạm tính:</span>
                  <span>{formatPrice(calculateTotal())}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Phí vận chuyển:</span>
                  <span>Miễn phí</span>
                </div>
                <div className={styles.summaryDivider}></div>
                <div className={styles.summaryRowTotal}>
                  <span>Tổng cộng:</span>
                  <span>{formatPrice(calculateTotal())}</span>
                </div>
              </div>
              <button
                className={styles.checkoutButton}
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
              >
                Thanh toán
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

