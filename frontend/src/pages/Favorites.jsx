import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import api from '../services/api';
import styles from './Favorites.module.css';

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [productImages, setProductImages] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.id) {
      loadFavorites();
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
        navigate('/login');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/login');
      }
    }
  };

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getFavorites(userInfo.id);
      if (response.success) {
        const products = response.data || [];
        setFavorites(products);
        await loadProductImages(products);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setError('Không thể tải danh sách yêu thích, vui lòng thử lại sau.');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProductImages = async (products) => {
    if (!products.length) {
      setProductImages({});
      return;
    }

    const entries = await Promise.all(
      products.map(async (product) => {
        try {
          const imageRes = await userAPI.getProductImages(product.id);
          if (imageRes.success && Array.isArray(imageRes.data) && imageRes.data.length > 0) {
            const firstImage = imageRes.data[0];
            if (firstImage.imageData) {
              return [product.id, `data:image/jpeg;base64,${firstImage.imageData}`];
            }
          }
        } catch (err) {
          console.error(`Error loading images for product ${product.id}:`, err);
        }
        return [product.id, null];
      })
    );

    const imageMap = entries.reduce((acc, [productId, imageUrl]) => {
      if (imageUrl) {
        acc[productId] = imageUrl;
      }
      return acc;
    }, {});

    setProductImages(imageMap);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
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
        <h1 className={styles.title}>Danh sách yêu thích</h1>
        {error && <div className={styles.errorMessage}>{error}</div>}

        {favorites.length === 0 ? (
          <div className={styles.emptyState}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.emptyIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p>Bạn chưa có sản phẩm yêu thích nào</p>
            <Link to="/" className={styles.shopButton}>
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {favorites.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={styles.productCard}
              >
                <div className={styles.productImageContainer}>
                  {productImages[product.id] ? (
                    <img
                      src={productImages[product.id]}
                      alt={product.name}
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
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>{formatPrice(product.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;

