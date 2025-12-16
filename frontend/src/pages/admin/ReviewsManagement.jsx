import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, userAPI } from '../../services/api';
import api from '../../services/api';
import styles from './ReviewsManagement.module.css';

function ReviewsManagement() {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseContent, setResponseContent] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [productImages, setProductImages] = useState({});
  const [selectedRating, setSelectedRating] = useState(0); // 0 = tất cả, 1-5 = số sao

  useEffect(() => {
    loadAdminInfo();
    loadReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, selectedRating]);

  const loadAdminInfo = () => {
    const adminId = localStorage.getItem('adminId');
    const username = localStorage.getItem('username');
    if (adminId && username) {
      setAdminInfo({ 
        id: parseInt(adminId), 
        username 
      });
    } else {
      // Fallback - try to get from API
      api.get('/auth/user-info').then(response => {
        if (response.data.success && response.data.data) {
          const adminData = response.data.data;
          setAdminInfo({ 
            id: adminData.id || 1, 
            username: adminData.username || username 
          });
        }
      }).catch(() => {
        if (username) {
          setAdminInfo({ id: 1, username });
        }
      });
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      // Load all reviews - we'll need to create this endpoint or use existing one
      // For now, we'll need to get reviews from products
      const response = await adminAPI.getAllReviews();
      const reviewsData = response.data || [];
      
      // Load responses for each review
      const reviewsWithResponses = await Promise.all(
        reviewsData.map(async (review) => {
          try {
            const responseRes = await adminAPI.getResponseByReview(review.id);
            return {
              ...review,
              response: responseRes.data || null
            };
          } catch (error) {
            return {
              ...review,
              response: null
            };
          }
        })
      );
      
      setReviews(reviewsWithResponses);
      
      // Load product images
      const imagePromises = reviewsData
        .filter(review => review.product && review.product.id)
        .map(async (review) => {
          try {
            const imagesRes = await userAPI.getProductImages(review.product.id);
            const images = imagesRes.data || [];
            if (images.length > 0) {
              return {
                productId: review.product.id,
                imageUrl: images[0].imageData 
                  ? `data:image/jpeg;base64,${images[0].imageData}` 
                  : null
              };
            }
            return { productId: review.product.id, imageUrl: null };
          } catch (error) {
            return { productId: review.product.id, imageUrl: null };
          }
        });
      
      const images = await Promise.all(imagePromises);
      const imagesMap = {};
      images.forEach(({ productId, imageUrl }) => {
        if (productId) {
          imagesMap[productId] = imageUrl;
        }
      });
      setProductImages(imagesMap);
    } catch (error) {
      console.error('Error loading reviews:', error);
      alert('Có lỗi khi tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = [...reviews];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(review =>
        review.content?.toLowerCase().includes(term) ||
        review.customer?.fullName?.toLowerCase().includes(term) ||
        review.product?.name?.toLowerCase().includes(term)
      );
    }

    // Filter by rating
    if (selectedRating > 0) {
      filtered = filtered.filter(review => review.rating === selectedRating);
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredReviews(filtered);
  };

  const getRatingCount = (rating) => {
    if (rating === 0) {
      return reviews.length;
    }
    return reviews.filter(review => review.rating === rating).length;
  };

  const handleSubmitResponse = async (reviewId) => {
    if (!adminInfo) {
      alert('Không tìm thấy thông tin admin');
      return;
    }

    if (!responseContent.trim()) {
      alert('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setSubmittingResponse(true);
      await adminAPI.addResponseToReview(reviewId, adminInfo.id, responseContent.trim());
      alert('Phản hồi đã được gửi thành công!');
      setResponseContent('');
      setSelectedReview(null);
      await loadReviews();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Có lỗi khi gửi phản hồi');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleDeleteResponse = async (responseId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) {
      return;
    }

    try {
      await adminAPI.deleteResponse(responseId);
      alert('Đã xóa phản hồi thành công!');
      await loadReviews();
    } catch (error) {
      console.error('Error deleting response:', error);
      alert('Có lỗi khi xóa phản hồi');
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách đánh giá...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Đánh giá</h1>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm đánh giá..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.ratingFilter}>
          <div className={styles.ratingFilterLabel}>Lọc theo số sao:</div>
          <div className={styles.ratingButtons}>
            <button
              className={`${styles.ratingButton} ${selectedRating === 0 ? styles.active : ''}`}
              onClick={() => setSelectedRating(0)}
            >
              <span>Tất cả</span>
              <span className={styles.ratingCount}>({getRatingCount(0)})</span>
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                className={`${styles.ratingButton} ${selectedRating === rating ? styles.active : ''}`}
                onClick={() => setSelectedRating(rating)}
              >
                <div className={styles.ratingStars}>
                  {renderStars(rating)}
                </div>
                <span className={styles.ratingCount}>({getRatingCount(rating)})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không tìm thấy đánh giá nào</p>
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {filteredReviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
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

              {review.product && (
                <div className={styles.productInfo}>
                  <div className={styles.productImageContainer}>
                    {productImages[review.product.id] ? (
                      <img 
                        src={productImages[review.product.id]} 
                        alt={review.product.name}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.productDetails}>
                    <strong>Sản phẩm:</strong>{' '}
                    <Link 
                      to={`/product/${review.product.id}`}
                      className={styles.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {review.product.name || 'N/A'}
                    </Link>
                  </div>
                </div>
              )}

              <div className={styles.reviewContent}>
                {review.content}
              </div>

              {/* Existing Response */}
              {review.response && (
                <div className={styles.existingResponse}>
                  <div className={styles.responseHeader}>
                    <div className={styles.responseAvatar}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className={styles.responseInfo}>
                      <div className={styles.responseName}>Phản hồi từ Admin</div>
                      <div className={styles.responseDate}>
                        {formatDate(review.response.repliedAt)}
                      </div>
                    </div>
                    <button
                      className={styles.deleteResponseButton}
                      onClick={() => handleDeleteResponse(review.response.id)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.responseContent}>
                    {review.response.content}
                  </div>
                </div>
              )}

              {/* Response Form */}
              {!review.response && (
                <div className={styles.responseForm}>
                  {selectedReview === review.id ? (
                    <>
                      <textarea
                        className={styles.responseTextarea}
                        value={responseContent}
                        onChange={(e) => setResponseContent(e.target.value)}
                        placeholder="Nhập phản hồi của bạn..."
                        rows="3"
                      />
                      <div className={styles.responseActions}>
                        <button
                          className={styles.cancelResponseButton}
                          onClick={() => {
                            setSelectedReview(null);
                            setResponseContent('');
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          className={styles.submitResponseButton}
                          onClick={() => handleSubmitResponse(review.id)}
                          disabled={submittingResponse || !responseContent.trim()}
                        >
                          {submittingResponse ? 'Đang gửi...' : 'Gửi phản hồi'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className={styles.addResponseButton}
                      onClick={() => setSelectedReview(review.id)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Phản hồi đánh giá này
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsManagement;

