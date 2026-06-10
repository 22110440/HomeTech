import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Checkout.module.css';
import api, { userAPI, paymentAPI } from '../services/api';

const PAYMENT_OPTIONS = [
  {
    id: 'COD',
    label: 'Thanh toán khi nhận hàng (COD)',
    description: 'Thanh toán trực tiếp cho tài xế khi nhận hàng.',
    comingSoon: false,
  },
  {
    id: 'VNPAY',
    label: 'VNPAY',
    description: 'Thanh toán nhanh qua cổng VNPAY.',
    comingSoon: false,
  },
  {
    id: 'PAYOS',
    label: 'PayOS (QR/Chuyển khoản)',
    description: 'Thanh toán qua cổng PayOS.',
    comingSoon: false,
  },
  {
    id: 'MOMO',
    label: 'Ví MoMo',
    description: 'Đang phát triển',
    comingSoon: true,
  },
  {
    id: 'CARD',
    label: 'Thẻ ngân hàng / Visa / MasterCard',
    description: 'Đang phát triển',
    comingSoon: true,
  },
];

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userInfo, setUserInfo] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [voucherCode, setVoucherCode] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [voucherFeedback, setVoucherFeedback] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const buyNowContext = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const isBuyNow = searchParams.get('buyNow') === '1';
    const productIdParam = searchParams.get('productId');
    const quantityParam = parseInt(searchParams.get('quantity'), 10);
    const safeQuantity = Number.isFinite(quantityParam) && quantityParam > 0 ? quantityParam : 1;

    if (isBuyNow && productIdParam) {
      const parsedId = Number(productIdParam);
      return {
        isBuyNow: true,
        productId: Number.isNaN(parsedId) ? null : parsedId,
        quantity: safeQuantity,
      };
    }

    return { isBuyNow: false, productId: null, quantity: 0 };
  }, [location.search]);
  const isBuyNowMode = Boolean(buyNowContext.isBuyNow && buyNowContext.productId);

  useEffect(() => {
    loadUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userInfo?.id) {
      return;
    }

    if (isBuyNowMode) {
      loadBuyNowItem(buyNowContext.productId, buyNowContext.quantity);
    } else {
      loadCart(userInfo.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo, isBuyNowMode, buyNowContext.productId, buyNowContext.quantity]);

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await api.get('/auth/user-info');
      if (response.data?.success) {
        setUserInfo(response.data.data);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('loadUserInfo error:', error);
      navigate('/login');
    }
  };

  const loadBuyNowItem = async (productId, quantity) => {
    if (!productId) {
      navigate('/cart');
      return;
    }

    try {
      setLoading(true);
      const response = await userAPI.getProductById(productId);
      const productData = response.data;

      if (!productData || productData.stock <= 0) {
        alert('Sản phẩm hiện không khả dụng. Vui lòng chọn sản phẩm khác.');
        navigate(`/product/${productId}`);
        return;
      }

      const safeQuantity = Math.min(Math.max(quantity, 1), productData.stock);
      if (safeQuantity !== quantity) {
        alert(`Số lượng được điều chỉnh thành ${safeQuantity} do tồn kho hạn chế.`);
      }

      setCartItems([
        {
          id: `buy-now-${productId}`,
          product: productData,
          quantity: safeQuantity,
        },
      ]);
      setVoucherPreview(null);
      setVoucherFeedback('');
      setVoucherError('');
    } catch (error) {
      console.error('loadBuyNowItem error:', error);
      alert(error?.response?.data?.message || 'Không thể tải thông tin sản phẩm.');
      navigate(`/product/${productId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async (userId) => {
    try {
      setLoading(true);
      const response = await userAPI.getCart(userId);
      // Response có thể là { success: true, data: [...] } hoặc trực tiếp là array
      const items = (response.data && Array.isArray(response.data)) 
        ? response.data 
        : (Array.isArray(response) ? response : []);
      setCartItems(items);
      setVoucherPreview(null);
      setVoucherFeedback('');
      setVoucherError('');
    } catch (error) {
      console.error('loadCart error:', error);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        if (item.product?.price) {
          return sum + item.product.price * item.quantity;
        }
        return sum;
      }, 0),
    [cartItems]
  );

  const pricing = useMemo(() => {
    if (voucherPreview) {
      return {
        subtotal: voucherPreview.subtotal ?? subtotal,
        discount: voucherPreview.discount ?? 0,
        finalTotal: voucherPreview.finalTotal ?? subtotal,
      };
    }
    return {
      subtotal,
      discount: 0,
      finalTotal: subtotal,
    };
  }, [voucherPreview, subtotal]);

  const getPaymentLabel = () => {
    const option = PAYMENT_OPTIONS.find((opt) => opt.id === paymentMethod);
    return option?.label || 'Thanh toán';
  };

  const handlePlaceOrder = async () => {
    if (!userInfo?.id) {
      navigate('/login');
      return;
    }
    if (!isBuyNowMode && cartItems.length === 0) {
      alert('Không có sản phẩm để thanh toán.');
      return;
    }
    try {
      setPlacingOrder(true);
      const activeQuantity = isBuyNowMode
        ? cartItems[0]?.quantity || buyNowContext.quantity
        : null;
      const orderOptions = {
        voucherCode: voucherCode.trim() || undefined,
        paymentMethod,
      };

      console.log('🔍 Checkout.handlePlaceOrder - paymentMethod:', paymentMethod);
      console.log('🔍 Checkout.handlePlaceOrder - orderOptions:', orderOptions);

      if (isBuyNowMode) {
        orderOptions.productId = buyNowContext.productId;
        orderOptions.quantity = activeQuantity;
      }

      const response = await userAPI.createOrder(userInfo.id, orderOptions);
      console.log('🔍 Checkout.handlePlaceOrder - createOrder response:', response);
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || 'Không thể tạo đơn hàng');
      }
      const createdOrder = response?.data;
      if (!createdOrder?.id) {
        throw new Error('Không lấy được thông tin đơn hàng');
      }

      if (paymentMethod === 'VNPAY') {
        const paymentResponse = await paymentAPI.createVnPayPayment(createdOrder?.id);
        if (!paymentResponse?.success || !paymentResponse?.paymentUrl) {
          throw new Error(paymentResponse?.message || 'Không thể khởi tạo thanh toán VNPAY');
        }
        window.location.href = paymentResponse.paymentUrl;
        return;
      }

      if (paymentMethod === 'PAYOS') {
        console.log('🔍 Checkout.handlePlaceOrder - Creating PayOS payment for order:', createdOrder?.id);
        const paymentResponse = await paymentAPI.createPayOsPayment(createdOrder?.id);
        console.log('🔍 Checkout.handlePlaceOrder - PayOS payment response:', paymentResponse);
        if (!paymentResponse?.success || !paymentResponse?.checkoutUrl) {
          console.error('❌ Checkout.handlePlaceOrder - PayOS payment failed:', paymentResponse);
          throw new Error(paymentResponse?.message || 'Không thể khởi tạo thanh toán PayOS');
        }
        console.log('✅ Checkout.handlePlaceOrder - Redirecting to PayOS checkout:', paymentResponse.checkoutUrl);
        window.location.href = paymentResponse.checkoutUrl;
        return;
      }

      const successParams = new URLSearchParams({
        orderId: String(createdOrder.id),
        method: paymentMethod,
      });
      const finalAmount = createdOrder.totalAmount ?? pricing.finalTotal;
      if (finalAmount !== undefined && finalAmount !== null) {
        successParams.set('amount', String(finalAmount));
      }
      navigate(`/order-success?${successParams.toString()}`);
    } catch (error) {
      console.error('handlePlaceOrder error:', error);
      alert(error?.response?.data?.error || error.message || 'Không thể đặt hàng');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleApplyVoucher = async () => {
    if (!userInfo?.id) {
      navigate('/login');
      return;
    }
    setVoucherError('');
    setVoucherFeedback('');

    try {
      setApplyingVoucher(true);
      const trimmedCode = voucherCode.trim();
      const activeQuantity = isBuyNowMode
        ? cartItems[0]?.quantity || buyNowContext.quantity
        : null;
      const response = await userAPI.previewOrder(
        userInfo.id,
        trimmedCode.length ? trimmedCode : null,
        isBuyNowMode ? buyNowContext.productId : null,
        isBuyNowMode ? activeQuantity : null
      );
      setVoucherPreview(response);
      setVoucherFeedback(response?.message || 'Áp dụng voucher thành công');
    } catch (error) {
      console.error('handleApplyVoucher error:', error);
      setVoucherPreview(null);
      setVoucherError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          'Không thể áp dụng voucher. Vui lòng thử lại.'
      );
    } finally {
      setApplyingVoucher(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.checkoutLayout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Thông tin nhận hàng</h2>
              <Link to="/profile">Chỉnh sửa</Link>
            </div>
            <div className={styles.addressBox}>
              <p className={styles.addressName}>{userInfo?.fullName || userInfo?.username}</p>
              <p className={styles.addressPhone}>{userInfo?.phone || 'Chưa cập nhật'}</p>
              <p className={styles.addressLine}>
                {[
                  userInfo?.addressLine,
                  userInfo?.commune,
                  userInfo?.district,
                  userInfo?.city,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Chưa có địa chỉ giao hàng. Vui lòng cập nhật hồ sơ.'}
              </p>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Sản phẩm</h2>
              {isBuyNowMode ? (
                <Link to={`/product/${buyNowContext.productId}`}>Quay lại sản phẩm</Link>
              ) : (
                <Link to="/cart">Chỉnh sửa giỏ hàng</Link>
              )}
            </div>
            <div className={styles.itemsList}>
              {cartItems.length === 0 && (
                <p className={styles.emptyState}>Giỏ hàng của bạn đang trống</p>
              )}
              {cartItems.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>
                      {item.product?.name || 'Sản phẩm'}
                      {item.variant && (
                        <span className={styles.variantName}> - {item.variant.name}</span>
                      )}
                    </p>
                    <span className={styles.itemQuantity}>x{item.quantity}</span>
                  </div>
                  <div className={styles.itemPrice}>
                    {formatCurrency(item.product?.price || 0)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Phương thức thanh toán</h2>
            </div>
            <div className={styles.paymentMethods}>
              {PAYMENT_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`${styles.paymentOption} ${
                    paymentMethod === option.id ? styles.paymentOptionActive : ''
                  } ${option.comingSoon ? styles.paymentOptionDisabled : ''}`}
                >
                  <input
                    className={styles.paymentInput}
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    disabled={option.comingSoon}
                    checked={paymentMethod === option.id}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  <span className={styles.paymentMark} aria-hidden="true"></span>
                  <div className={styles.paymentContent}>
                    <div className={styles.paymentTopLine}>
                      <span className={styles.paymentCode}>{option.id}</span>
                      {option.comingSoon && <span className={styles.badge}>Sắp ra mắt</span>}
                    </div>
                    <p className={styles.paymentLabel}>{option.label}</p>
                    <p className={styles.paymentDescription}>{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Đơn hàng</h2>
            </div>
            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span>{formatCurrency(pricing.subtotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Phí vận chuyển</span>
              <span>Miễn phí</span>
            </div>
            <div className={styles.summaryRow}>
              <label htmlFor="voucherCode">Voucher</label>
              <div className={styles.voucherRow}>
                <input
                  id="voucherCode"
                  type="text"
                  placeholder="Nhập mã nếu có"
                  value={voucherCode}
                  onChange={(event) => setVoucherCode(event.target.value)}
                />
                <button
                  type="button"
                  className={styles.applyVoucherButton}
                  onClick={handleApplyVoucher}
                  disabled={applyingVoucher || cartItems.length === 0}
                >
                  {applyingVoucher ? 'Đang áp dụng...' : 'Áp dụng'}
                </button>
              </div>
            </div>
            {voucherFeedback && (
              <p className={styles.voucherMessage}>{voucherFeedback}</p>
            )}
            {voucherError && <p className={styles.voucherError}>{voucherError}</p>}
            {pricing.discount > 0 && (
              <div className={styles.summaryRow}>
                <span>Giảm giá</span>
                <span className={styles.discountValue}>
                  -{formatCurrency(pricing.discount)}
                </span>
              </div>
            )}
            <div className={styles.summaryTotal}>
              <span>Tổng cộng</span>
              <span>{formatCurrency(pricing.finalTotal)}</span>
            </div>
            <button
              className={styles.placeOrderButton}
              onClick={handlePlaceOrder}
              disabled={placingOrder || cartItems.length === 0}
            >
              {placingOrder
                ? 'Đang xử lý...'
                : `${getPaymentLabel()} (${formatCurrency(pricing.finalTotal)})`}
            </button>
            <p className={styles.notice}>
              Bằng việc đặt hàng, bạn đồng ý với{' '}
              <Link to="/terms" className={styles.link}>
                Điều khoản dịch vụ
              </Link>{' '}
              của HomeTech.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
