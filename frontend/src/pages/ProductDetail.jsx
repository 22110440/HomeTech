import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userAPI, authAPI } from '../services/api';
import api from '../services/api';
import styles from './ProductDetail.module.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewResponses, setReviewResponses] = useState({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteUpdating, setFavoriteUpdating] = useState(false);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    loadProductData();
    loadUserInfo();
  }, [id]);

  useEffect(() => {
    if (userInfo && userInfo.id) {
      loadCartCount();
    }
  }, [userInfo]);

  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!userInfo || !product) {
        setIsFavorite(false);
        return;
      }
      try {
        setFavoriteLoading(true);
        const response = await userAPI.checkFavorite(userInfo.id, product.id);
        if (response.success) {
          setIsFavorite(Boolean(response.data?.isFavorite));
        } else {
          setIsFavorite(false);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
        setIsFavorite(false);
      } finally {
        setFavoriteLoading(false);
      }
    };

    fetchFavoriteStatus();
  }, [userInfo, product]);

  const loadProductData = async () => {
    try {
      setLoading(true);

      const [productRes, imagesRes, reviewsRes, ratingRes, variantsRes] = await Promise.all([
        userAPI.getProductById(id),
        userAPI.getProductImages(id),
        userAPI.getProductReviews(id),
        userAPI.getProductRating(id),
        userAPI.getProductVariants(id).catch(() => ({ data: [] })) // Nếu không có variants, trả về mảng rỗng
      ]);

      const productData = productRes.data;
      setProduct(productData);

      const imagesData = imagesRes.data || [];
      // Sắp xếp ảnh theo displayOrder
      const sortedImages = imagesData.sort((a, b) => {
        const orderA = a.displayOrder != null ? a.displayOrder : 0;
        const orderB = b.displayOrder != null ? b.displayOrder : 0;
        return orderA - orderB;
      });
      setImages(sortedImages.map(img => ({
        ...img,
        url: img.imageData ? `data:image/jpeg;base64,${img.imageData}` : null
      })));

      const reviewsData = reviewsRes.data || [];
      setReviews(reviewsData);

      const rating = ratingRes.data || 0;
      setAverageRating(rating);

      const variantsData = variantsRes.data || [];
      setVariants(variantsData);

      // Load responses for all reviews
      const responsePromises = reviewsData.map(async (review) => {
        try {
          const responseRes = await userAPI.getReviewResponse(review.id);
          return { reviewId: review.id, response: responseRes.data };
        } catch (error) {
          return { reviewId: review.id, response: null };
        }
      });

      const responses = await Promise.all(responsePromises);
      const responsesMap = {};
      responses.forEach(({ reviewId, response }) => {
        if (response) {
          responsesMap[reviewId] = response;
        }
      });
      setReviewResponses(responsesMap);

    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return; // Không có token thì không load user info
      }
      const response = await api.get('/auth/user-info');
      if (response.data.success) {
        setUserInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  };

  const loadCartCount = async () => {
    try {
      const response = await userAPI.getCart(userInfo.id);
      const items = response.data || [];
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(totalCount);
    } catch (error) {
      console.error('Error loading cart count:', error);
      setCartItemCount(0);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !userInfo) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      navigate('/login');
      return;
    }

    // Nếu có variants, bắt buộc phải chọn variant
    if (variants.length > 0 && !selectedVariant) {
      alert('Vui lòng chọn biến thể sản phẩm trước khi thêm vào giỏ hàng');
      return;
    }

    // Kiểm tra stock dựa trên variant hoặc product
    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
    if (quantity < 1 || quantity > availableStock) {
      alert(`Số lượng không hợp lệ. Vui lòng chọn từ 1 đến ${availableStock} sản phẩm.`);
      return;
    }

    try {
      setAddingToCart(true);
      console.log('Adding to cart:', { userId: userInfo.id, productId: product.id, quantity, variantId: selectedVariant?.id });
      const response = await userAPI.addToCart(userInfo.id, product.id, quantity, selectedVariant?.id);
      console.log('Add to cart response:', response);
      const variantName = selectedVariant ? ` (${selectedVariant.name})` : '';
      alert(`Đã thêm ${quantity} sản phẩm${variantName} vào giỏ hàng!`);
      setQuantity(1); // Reset về 1 sau khi thêm thành công
      loadCartCount(); // Refresh cart count
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigate('/login');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng: ' + errorMessage);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !userInfo) {
      alert('Vui lòng đăng nhập để mua hàng');
      navigate('/login');
      return;
    }

    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
    if (availableStock <= 0) {
      alert('Sản phẩm đã hết hàng');
      return;
    }

    if (quantity < 1 || quantity > availableStock) {
      alert(`Số lượng không hợp lệ. Vui lòng chọn từ 1 đến ${availableStock} sản phẩm.`);
      return;
    }

    let url = `/checkout?buyNow=1&productId=${product.id}&quantity=${quantity}`;
    if (selectedVariant) {
      url += `&variantId=${selectedVariant.id}`;
    }
    navigate(url);
  };

  const handleToggleFavorite = async () => {
    if (!userInfo) {
      alert('Vui lòng đăng nhập để sử dụng danh sách yêu thích');
      navigate('/login');
      return;
    }

    if (!product || favoriteLoading || favoriteUpdating) {
      return;
    }

    try {
      setFavoriteUpdating(true);
      if (isFavorite) {
        await userAPI.removeFavorite(userInfo.id, product.id);
        setIsFavorite(false);
      } else {
        await userAPI.addFavorite(userInfo.id, product.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      alert('Có lỗi xảy ra khi cập nhật danh sách yêu thích');
    } finally {
      setFavoriteUpdating(false);
    }
  };

  const handleIncreaseQuantity = () => {
    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
    if (product && quantity < availableStock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    if (product) {
      const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
      if (value < 1) {
        setQuantity(1);
      } else if (value > availableStock) {
        setQuantity(availableStock);
      } else {
        setQuantity(value);
      }
    }
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    // Reset quantity nếu vượt quá stock của variant mới
    if (variant && quantity > variant.stock) {
      setQuantity(variant.stock);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={i < rating ? styles.starFilled : styles.starEmpty}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!userInfo) {
      alert('Vui lòng đăng nhập để đánh giá sản phẩm');
      navigate('/login');
      return;
    }

    if (reviewRating === 0) {
      alert('Vui lòng chọn số sao đánh giá');
      return;
    }

    if (!reviewContent.trim()) {
      alert('Vui lòng nhập nội dung đánh giá');
      return;
    }

    try {
      setSubmittingReview(true);
      await userAPI.createReview(product.id, userInfo.id, reviewRating, reviewContent.trim());
      alert('Đánh giá đã được gửi thành công!');
      setReviewRating(0);
      setReviewContent('');
      setShowReviewForm(false);
      await loadProductData(); // Reload để hiển thị review mới
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Có lỗi xảy ra khi gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarSelector = (currentRating, onRatingChange) => {
    return (
      <div className={styles.starSelector}>
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            className={styles.starButton}
            onClick={() => onRatingChange(i + 1)}
            onMouseEnter={() => {
              // Highlight stars on hover
            }}
          >
            <svg
              className={i < currentRating ? styles.starFilled : styles.starEmpty}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Sản phẩm không tồn tại</h2>
          <Link to="/" className={styles.backButton}>Quay lại trang chủ</Link>
        </div>
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
            <Link to="/cart" className={styles.cartIcon}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className={styles.cartBadge}>{cartItemCount}</span>
              )}
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
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              ← Quay lại
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/">Trang chủ</Link>
        <span> / </span>
        <span>{product.name}</span>
      </div>

      {/* Product Detail */}
      <div className={styles.productDetail}>
        <div className={styles.productImages}>
          {images.length > 0 ? (
            <>
              <div className={styles.mainImage}>
                <img
                  src={images[selectedImageIndex]?.url}
                  alt={product.name}
                />
              </div>
              {images.length > 1 && (
                <div className={styles.thumbnailImages}>
                  {images.map((img, index) => (
                    <button
                      key={index}
                      className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.active : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={img.url} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.productInfo}>
          <h1 className={styles.productName}>{product.name}</h1>

          {averageRating > 0 && (
            <div className={styles.rating}>
              <div className={styles.ratingStars}>
                {renderStars(Math.round(averageRating))}
              </div>
              <span className={styles.ratingValue}>{averageRating.toFixed(1)}</span>
              <span className={styles.reviewCount}>({reviews.length} đánh giá)</span>
            </div>
          )}

          <div className={styles.priceSection}>
            <div className={styles.price}>{formatPrice(product.price)}</div>
          </div>

          <div className={styles.soldCount}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Đã bán: <strong>{product.soldCount || 0}</strong> sản phẩm</span>
          </div>

          {product.category && (
            <div className={styles.category}>
              <strong>Danh mục:</strong> {product.category.name}
            </div>
          )}

          {/* Variant Selection */}
          {variants.length > 0 && (
            <div className={styles.variantSelector}>
              <label className={styles.variantLabel}>
                <strong>Chọn biến thể:</strong>
              </label>
              <div className={styles.variantOptions}>
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={`${styles.variantOption} ${selectedVariant?.id === variant.id ? styles.variantSelected : ''} ${variant.stock <= 0 ? styles.variantOutOfStock : ''}`}
                    onClick={() => handleVariantChange(variant)}
                    disabled={variant.stock <= 0}
                  >
                    <span>{variant.name}</span>
                    {variant.stock <= 0 && <span className={styles.outOfStockBadge}>Hết hàng</span>}
                  </button>
                ))}
              </div>
              {selectedVariant && (
                <div className={styles.variantInfo}>
                  <strong>Tồn kho:</strong> {selectedVariant.stock > 0 ? `${selectedVariant.stock} sản phẩm` : 'Hết hàng'}
                </div>
              )}
            </div>
          )}

          {variants.length === 0 && (
            <div className={styles.stock}>
              <strong>Tồn kho:</strong> {product.stock > 0 ? `${product.stock} sản phẩm` : 'Hết hàng'}
            </div>
          )}

          {((selectedVariant && selectedVariant.stock > 0) || (!selectedVariant && product.stock > 0)) && (
            <div className={styles.quantitySelector}>
              <label className={styles.quantityLabel}>Số lượng:</label>
              <div className={styles.quantityControls}>
                <button
                  type="button"
                  className={styles.quantityButton}
                  onClick={handleDecreaseQuantity}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  className={styles.quantityInput}
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  max={selectedVariant ? selectedVariant.stock : product.stock}
                />
                <button
                  type="button"
                  className={styles.quantityButton}
                  onClick={handleIncreaseQuantity}
                  disabled={quantity >= (selectedVariant ? selectedVariant.stock : product.stock)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.addToCartButton}
              onClick={handleAddToCart}
              disabled={addingToCart || !userInfo || ((selectedVariant ? selectedVariant.stock : product.stock) <= 0)}
            >
              {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              className={styles.buyNowButton}
              onClick={handleBuyNow}
              disabled={!userInfo || ((selectedVariant ? selectedVariant.stock : product.stock) <= 0)}
            >
              Mua ngay
            </button>
            <button
              type="button"
              className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteButtonActive : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading || favoriteUpdating}
              title={isFavorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            >
              <span className={styles.favoriteIconWrapper}>
                <svg viewBox="0 0 24 24" className={styles.favoriteIcon}>
                  <path
                    d="M12 21.35l-1.45-1.32C6 15.36 3 12.28 3 8.5 3 6 5 4 7.5 4c1.74 0 3.41.81 4.5 2.09C13.09 4.81 14.76 4 16.5 4 19 4 21 6 21 8.5c0 3.78-3 6.86-7.55 11.54L12 21.35z"
                    fill={isFavorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={styles.favoritePulse} />
              </span>
            </button>
          </div>

          {product.description && (
            <div className={styles.descriptionSection}>
              <h3>Mô tả sản phẩm</h3>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <section className={styles.reviewsSection}>
        <div className={styles.reviewsHeader}>
          <h2 className={styles.reviewsTitle}>Đánh giá sản phẩm</h2>
          {userInfo && (
            <button
              className={styles.writeReviewButton}
              onClick={() => setShowReviewForm(!showReviewForm)}
            >
              {showReviewForm ? 'Hủy' : 'Viết đánh giá'}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && userInfo && (
          <form className={styles.reviewForm} onSubmit={handleSubmitReview}>
            <div className={styles.reviewFormGroup}>
              <label>Đánh giá của bạn:</label>
              {renderStarSelector(reviewRating, setReviewRating)}
            </div>
            <div className={styles.reviewFormGroup}>
              <label htmlFor="reviewContent">Nội dung đánh giá:</label>
              <textarea
                id="reviewContent"
                className={styles.reviewTextarea}
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                rows="5"
                required
              />
            </div>
            <div className={styles.reviewFormActions}>
              <button
                type="button"
                className={styles.cancelReviewButton}
                onClick={() => {
                  setShowReviewForm(false);
                  setReviewRating(0);
                  setReviewContent('');
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={styles.submitReviewButton}
                disabled={submittingReview || reviewRating === 0}
              >
                {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        )}

        {averageRating > 0 && (
          <div className={styles.ratingSummary}>
            <div className={styles.ratingSummaryLeft}>
              <div className={styles.averageRating}>{averageRating.toFixed(1)}</div>
              <div className={styles.ratingSummaryStars}>
                {renderStars(Math.round(averageRating))}
              </div>
              <div className={styles.totalReviews}>{reviews.length} đánh giá</div>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className={styles.noReviews}>
            <p>Chưa có đánh giá nào cho sản phẩm này</p>
            {userInfo && (
              <button
                className={styles.writeReviewButton}
                onClick={() => setShowReviewForm(true)}
              >
                Viết đánh giá đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className={styles.reviewsList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewerInfo}>
                    <div className={styles.reviewerAvatar}>
                      {review.customer?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className={styles.reviewerName}>
                        {review.customer?.fullName || 'Khách hàng'}
                      </div>
                      <div className={styles.reviewDate}>
                        {formatDate(review.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className={styles.reviewRating}>
                    {renderStars(review.rating)}
                  </div>
                </div>
                <div className={styles.reviewContent}>
                  {review.content}
                </div>
                {review.images && review.images.length > 0 && (
                  <div className={styles.reviewImages}>
                    {review.images.map((img, index) => (
                      <img
                        key={index}
                        src={img.imageData ? `data:image/jpeg;base64,${img.imageData}` : ''}
                        alt={`Review ${index + 1}`}
                        className={styles.reviewImage}
                      />
                    ))}
                  </div>
                )}

                {/* Admin Response */}
                {reviewResponses[review.id] && (
                  <div className={styles.adminResponse}>
                    <div className={styles.adminResponseHeader}>
                      <div className={styles.adminResponseAvatar}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div className={styles.adminResponseInfo}>
                        <div className={styles.adminResponseName}>
                          Phản hồi từ Admin
                        </div>
                        <div className={styles.adminResponseDate}>
                          {formatDate(reviewResponses[review.id].repliedAt)}
                        </div>
                      </div>
                    </div>
                    <div className={styles.adminResponseContent}>
                      {reviewResponses[review.id].content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProductDetail;

