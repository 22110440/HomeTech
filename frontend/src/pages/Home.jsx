import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { userAPI, authAPI } from '../services/api';
import api from '../services/api';
import AnnouncementBar from '../components/AnnouncementBar';
import styles from './Home.module.css';

const PRODUCTS_LOAD_STEP = 20;

function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userInfo, setUserInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [productImages, setProductImages] = useState({});
  const [cartItemCount, setCartItemCount] = useState(0);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sortOption, setSortOption] = useState('default'); // default, priceAsc, priceDesc, soldAsc, soldDesc
  const [heroBanners, setHeroBanners] = useState([]);
  const [sliderItems, setSliderItems] = useState([]);
  const [footerContent, setFooterContent] = useState(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_LOAD_STEP);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category');
    setSearchKeyword(keyword);
    setSelectedCategoryId(category ? Number(category) : null);
  }, [searchParams]);

  useEffect(() => {
    if (!heroBanners.length) return undefined;
    const intervalId = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(intervalId);
  }, [heroBanners]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest(`.${styles.userMenuContainer}`)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Debounce search
  useEffect(() => {
    if (searchKeyword.trim()) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        performSearch(searchKeyword);
      }, 500); // Wait 500ms after user stops typing

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // If search is empty, restore all products
      if (allProducts.length > 0) {
        setProducts(allProducts);
        setIsSearching(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword]);

  useEffect(() => {
    setVisibleProductCount(PRODUCTS_LOAD_STEP);
  }, [searchKeyword, selectedCategoryId, sortOption, products.length]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user info, products, categories, top selling in parallel
      const token = localStorage.getItem('accessToken');
      const [
        userRes,
        productsRes,
        categoriesRes,
        topSellingRes,
        heroRes,
        sliderRes,
        footerRes
      ] = await Promise.all([
        token ? api.get('/auth/user-info').catch(() => ({ data: { success: false } })) : Promise.resolve({ data: { success: false } }),
        userAPI.getAllProducts().catch(() => ({ data: [] })),
        userAPI.getAllCategories().catch(() => ({ data: [] })),
        userAPI.getTopSelling().catch(() => ({ data: [] })),
        userAPI.getHeroBanners().catch(() => ({ data: [] })),
        userAPI.getSliderItems().catch(() => ({ data: [] })),
        userAPI.getFooterContent().catch(() => ({ data: null }))
      ]);

      if (userRes.data.success) {
        setUserInfo(userRes.data.data);
        // Load cart count
        loadCartCount(userRes.data.data.id);
      }

      const allProductsData = productsRes.data || [];
      // Chỉ lấy sản phẩm active (hidden = false)
      const activeProducts = allProductsData.filter(p => !p.hidden);
      setAllProducts(activeProducts); // Store all products for search
      setProducts(activeProducts);

      setCategories(categoriesRes.data || []);
      setTopSelling(topSellingRes.data || []);
      setHeroBanners(heroRes.data || []);
      setSliderItems(sliderRes.data || []);
      setFooterContent(footerRes.data || null);
      setActiveBannerIndex(0);

      // Load images for all products
      const imagePromises = activeProducts.map(async (product) => {
        try {
          const imagesRes = await userAPI.getProductImages(product.id);
          // imagesRes là {success: true, data: [...], message: "..."}
          const images = imagesRes.data || [];

          console.log(`[DEBUG] Product ${product.id}:`, {
            fullResponse: imagesRes,
            imagesArray: images,
            imagesLength: images.length
          });

          if (images.length > 0) {
            // Lấy ảnh đầu tiên
            const firstImage = images[0];

            console.log(`[DEBUG] Product ${product.id} - First image object:`, {
              id: firstImage.id,
              fileName: firstImage.fileName,
              hasImageData: !!firstImage.imageData,
              imageDataType: typeof firstImage.imageData,
              imageDataLength: firstImage.imageData?.length,
              imageDataPreview: firstImage.imageData?.substring(0, 100)
            });

            let imageUrl = null;

            if (firstImage && firstImage.imageData) {
              const imageData = firstImage.imageData;

              if (typeof imageData === 'string' && imageData.trim().length > 0) {
                // Thêm prefix data URL nếu chưa có
                if (imageData.startsWith('data:')) {
                  imageUrl = imageData;
                } else {
                  imageUrl = `data:image/jpeg;base64,${imageData}`;
                }
                console.log(`[SUCCESS] Product ${product.id} - Image URL created, length: ${imageUrl.length}`);
              } else {
                console.warn(`[WARN] Product ${product.id} - imageData is not a valid string:`, imageData);
              }
            } else {
              console.warn(`[WARN] Product ${product.id} - No imageData in firstImage`);
            }

            return {
              productId: product.id,
              imageUrl: imageUrl
            };
          } else {
            console.warn(`[WARN] Product ${product.id} - No images returned from API`);
          }
        } catch (err) {
          console.error(`[ERROR] Product ${product.id} - Error:`, err);
        }
        return { productId: product.id, imageUrl: null };
      });

      const images = await Promise.all(imagePromises);
      const imagesMap = {};
      images.forEach(img => {
        if (img && img.imageUrl) {
          imagesMap[img.productId] = img.imageUrl;
          console.log(`[FINAL] Product ${img.productId} - Image URL set:`, img.imageUrl.substring(0, 50) + '...');
        } else {
          console.warn(`[FINAL] Product ${img?.productId} - No image URL`);
        }
      });
      console.log('[FINAL] Complete imagesMap:', Object.keys(imagesMap).map(id => ({ id, hasUrl: !!imagesMap[id] })));
      setProductImages(imagesMap);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const renderFixedSideAd = (item, side) => {
    if (!item?.imageUrl) return null;
    const className = `${styles.fixedSideAd} ${side === 'left' ? styles.fixedSideAdLeft : styles.fixedSideAdRight}`;
    const image = <img src={item.imageUrl} alt="HomeTech promotion" />;
    const redirectUrl = item.redirectUrl || '';

    if (redirectUrl.startsWith('/')) {
      return (
        <Link key={item.id || side} to={redirectUrl} className={className}>
          {image}
        </Link>
      );
    }

    if (redirectUrl) {
      return (
        <a key={item.id || side} href={redirectUrl} target="_blank" rel="noopener noreferrer" className={className}>
          {image}
        </a>
      );
    }

    return (
      <div key={item.id || side} className={className}>
        {image}
      </div>
    );
  };

  const performSearch = async (keyword) => {
    if (!keyword.trim()) {
      setProducts(allProducts);
      setIsSearching(false);
      return;
    }

    try {
      setSelectedCategoryId(null); // Reset category filter when searching
      const response = await userAPI.searchProducts(keyword);
      const searchResults = response.data || [];
      setProducts(searchResults.filter(p => !p.hidden));
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to client-side search
      const filtered = allProducts.filter(p =>
        p.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        p.description?.toLowerCase().includes(keyword.toLowerCase())
      );
      setProducts(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      setIsSearching(true);
      performSearch(searchKeyword);
    }
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setProducts(allProducts);
    setSelectedCategoryId(null);
    setIsSearching(false);
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSearchKeyword(''); // Clear search when filtering by category
    setShowCategoryDropdown(false); // Close dropdown
  };

  const handleShowAllProducts = () => {
    setSelectedCategoryId(null);
    setSearchKeyword('');
    setProducts(allProducts);
    setSortOption('default');
  };

  const handleSort = async (option) => {
    setSortOption(option);

    if (option === 'default') {
      setProducts(allProducts);
      return;
    }

    try {
      let sortedData = [];
      switch (option) {
        case 'priceAsc': {
          const priceAscRes = await userAPI.sortProductsByPriceAsc();
          sortedData = priceAscRes.data || [];
          break;
        }
        case 'priceDesc': {
          const priceDescRes = await userAPI.sortProductsByPriceDesc();
          sortedData = priceDescRes.data || [];
          break;
        }
        case 'soldAsc': {
          const soldAscRes = await userAPI.sortProductsBySoldAsc();
          sortedData = soldAscRes.data || [];
          break;
        }
        case 'soldDesc': {
          const soldDescRes = await userAPI.sortProductsBySoldDesc();
          sortedData = soldDescRes.data || [];
          break;
        }
        default:
          sortedData = allProducts;
      }

      // Filter only active products
      const activeSorted = sortedData.filter(p => !p.hidden);
      setProducts(activeSorted);

      // If category is selected, filter by category after sorting
      if (selectedCategoryId) {
        // The filteredProducts will handle category filtering
      }
    } catch (error) {
      console.error('Error sorting products:', error);
      // Fallback to client-side sort
      const currentProducts = selectedCategoryId
        ? products.filter(p => p.category?.id === selectedCategoryId)
        : products;
      const sorted = [...currentProducts].sort((a, b) => {
        switch (option) {
          case 'priceAsc':
            return a.price - b.price;
          case 'priceDesc':
            return b.price - a.price;
          case 'soldAsc':
            return (a.soldCount || 0) - (b.soldCount || 0);
          case 'soldDesc':
            return (b.soldCount || 0) - (a.soldCount || 0);
          default:
            return 0;
        }
      });
      setProducts(sorted);
    }
  };

  // Filter products by selected category
  const getFilteredProducts = () => {
    if (!selectedCategoryId) {
      return products;
    }
    return products.filter(product => product.category?.id === selectedCategoryId);
  };

  const filteredProducts = getFilteredProducts();
  const visibleProducts = filteredProducts.slice(0, visibleProductCount);
  const visibleProductsEnd = Math.min(visibleProductCount, filteredProducts.length);
  const hasMoreProducts = visibleProductCount < filteredProducts.length;

  const handleLoadMoreProducts = () => {
    setVisibleProductCount((currentCount) => (
      Math.min(currentCount + PRODUCTS_LOAD_STEP, filteredProducts.length)
    ));
  };

  const loadCartCount = async (userId) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setCartItemCount(0);
        return;
      }
      const response = await userAPI.getCart(userId);
      const items = response.data || [];
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(totalCount);
    } catch (error) {
      console.error('Error loading cart count:', error);
      setCartItemCount(0);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  if (loading && products.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  const fixedSideSliderItems = sliderItems.slice(0, 2);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <AnnouncementBar />
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>HomeTech</span>
          </Link>

          <div className={styles.headerControls}>
            <div className={styles.newSearchContainer}>
              <input
                type="text"
                className={styles.newSearchInput}
                placeholder="Tìm kiếm sản phẩm..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e);
                  }
                }}
              />
              {isSearching && (
                <span className={styles.newSearchLoader}>⏳</span>
              )}
              {searchKeyword && !isSearching && (
                <button
                  type="button"
                  className={styles.newSearchClear}
                  onClick={handleClearSearch}
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                className={styles.newSearchBtn}
                onClick={handleSearch}
              >
                🔍
              </button>
            </div>

            {!searchKeyword.trim() && (
              <div className={styles.headerSortContainer}>
                <label className={styles.headerSortLabel}>Sắp xếp:</label>
                <select
                  className={styles.headerSortSelect}
                  value={sortOption}
                  onChange={(e) => handleSort(e.target.value)}
                >
                  <option value="default">Mặc định</option>
                  <option value="priceAsc">Giá: Tăng dần</option>
                  <option value="priceDesc">Giá: Giảm dần</option>
                  <option value="soldAsc">Lượt bán: Tăng dần</option>
                  <option value="soldDesc">Lượt bán: Giảm dần</option>
                </select>
              </div>
            )}
          </div>

          <nav className={styles.headerQuickLinks} aria-label="Dịch vụ chính">
            <Link to="/repair-packages" className={`${styles.headerQuickLink} ${styles.repairQuickLink}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-3-3 2.6-2.6Z" />
              </svg>
              <span>Sửa chữa</span>
            </Link>
            <Link to="/trade-in" className={`${styles.headerQuickLink} ${styles.tradeInQuickLink}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h11m0 0-3-3m3 3-3 3M16 17H5m0 0 3 3m-3-3 3-3" />
              </svg>
              <span>Thu cũ đổi mới</span>
            </Link>
          </nav>

          {/* Category Dropdown Button */}
          <div className={styles.categoryDropdownContainer}>
            <button
              className={styles.categoryDropdownButton}
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Danh mục</span>
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className={`${styles.dropdownArrow} ${showCategoryDropdown ? styles.dropdownArrowOpen : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCategoryDropdown && categories.length > 0 && (
              <div className={styles.categoryDropdownMenu}>
                <button
                  className={`${styles.categoryDropdownItem} ${!selectedCategoryId ? styles.activeCategory : ''}`}
                  onClick={handleShowAllProducts}
                >
                  Tất cả sản phẩm
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`${styles.categoryDropdownItem} ${selectedCategoryId === category.id ? styles.activeCategory : ''}`}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.headerActions}>
            <Link to="/cart" className={styles.cartIcon}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {userInfo && cartItemCount > 0 && (
                <span className={styles.cartBadge}>{cartItemCount}</span>
              )}
            </Link>
            {userInfo ? (
              <div className={styles.userMenuContainer}>
                <button
                  className={styles.userMenuButton}
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.userIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={styles.username}>{userInfo.username}</span>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className={`${styles.dropdownArrow} ${showUserDropdown ? styles.rotated : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserDropdown && (
                  <div className={styles.userDropdown}>
                    <Link
                      to="/profile"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Thông tin cá nhân</span>
                    </Link>
                    <Link
                      to="/orders"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Đơn hàng của tôi</span>
                    </Link>
                    <Link
                      to="/expenses"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Xem chi tiêu</span>
                    </Link>
                    <Link
                      to="/favorites"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>Danh sách yêu thích</span>
                    </Link>
                    <Link
                      to="/repair-packages"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Sản phẩm sửa chữa</span>
                    </Link>
                    <Link
                      to="/my-repair-schedules"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Lịch sửa chữa của tôi</span>
                    </Link>
                    <div className={styles.dropdownDivider}></div>
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={styles.loginButton}>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Categories Navigation */}
      {categories.length > 0 && (
        <nav className={styles.categoriesNav}>
          <div className={styles.categoriesContent}>
            <button
              className={`${styles.categoryLink} ${!selectedCategoryId ? styles.activeCategoryLink : ''}`}
              onClick={handleShowAllProducts}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${styles.categoryLink} ${selectedCategoryId === category.id ? styles.activeCategoryLink : ''}`}
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Banner & Hero Slider */}
      {!searchKeyword.trim() && (
        heroBanners.length > 0 ? (
          <section className={styles.heroCarousel}>
            <div
              className={styles.heroSlides}
              style={{ transform: `translateX(-${activeBannerIndex * 100}%)` }}
            >
              {heroBanners.map((banner, index) => (
                <div
                  key={banner.id || index}
                  className={`${styles.heroSlide} ${index === activeBannerIndex ? styles.heroSlideActive : ''}`}
                  style={{ backgroundImage: `url(${banner.imageUrl})` }}
                />
              ))}
            </div>
            <div className={styles.heroDots}>
              {heroBanners.map((banner, index) => (
                <button
                  key={banner.id || `dot-${index}`}
                  className={`${styles.heroDot} ${index === activeBannerIndex ? styles.heroDotActive : ''}`}
                  onClick={() => setActiveBannerIndex(index)}
                  aria-label={`Chuyển đến banner ${index + 1}`}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.banner}>
            <div className={styles.bannerContent}>
              <h1 className={styles.bannerTitle}>Chào mừng đến với HomeTech</h1>
              <p className={styles.bannerSubtitle}>Thiết bị gia đình thông minh - Chất lượng hàng đầu</p>
            </div>
          </section>
        )
      )}

      {/* Fixed Side Slider Images */}
      {!searchKeyword.trim() && fixedSideSliderItems.length > 0 && (
        <div className={styles.fixedSideAds} aria-label="Ảnh khuyến mãi cố định hai bên">
          {renderFixedSideAd(fixedSideSliderItems[0], 'left')}
          {renderFixedSideAd(fixedSideSliderItems[1], 'right')}
        </div>
      )}

      {/* Top Selling Products */}
      {topSelling.length > 0 && !selectedCategoryId && !searchKeyword.trim() && sortOption === 'default' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Sản phẩm bán chạy</h2>
          </div>
          <div className={`${styles.productsGrid} ${styles.fiveColumnProductsGrid}`}>
            {topSelling.slice(0, 10).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={styles.productCard}
              >
                <div className={styles.productImageContainer}>
                  {productImages[product.id] ? (
                    <>
                      <img
                        key={`img-${product.id}-${productImages[product.id]?.substring(0, 20)}`}
                        src={productImages[product.id]}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => {
                          console.error(`[IMG ERROR] Product ${product.id}:`, {
                            src: productImages[product.id]?.substring(0, 100),
                            error: e
                          });
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                        onLoad={() => {
                          console.log(`[IMG SUCCESS] Product ${product.id} - Image loaded`);
                        }}
                      />
                      <div className={styles.productImagePlaceholder} style={{ display: 'none' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {product.soldCount > 0 && (
                    <div className={styles.badge}>Bán chạy</div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>{formatPrice(product.price)}</div>
                  {product.soldCount > 0 && (
                    <div className={styles.productSold}>Đã bán: {product.soldCount}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Products */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              {searchKeyword.trim()
                ? `Kết quả tìm kiếm: "${searchKeyword}"`
                : selectedCategoryId
                  ? `${categories.find(c => c.id === selectedCategoryId)?.name || 'Danh mục'}`
                  : sortOption !== 'default'
                    ? `Tất cả sản phẩm`
                    : 'Tất cả sản phẩm'}
            </h2>
            <p className={styles.loadMoreSummary}>
              {filteredProducts.length > 0
                ? `Đang hiển thị ${visibleProductsEnd}/${filteredProducts.length} sản phẩm`
                : 'Không có sản phẩm phù hợp'}
            </p>
          </div>
        </div>
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <>
            <div className={`${styles.productsGrid} ${styles.fiveColumnProductsGrid}`}>
              {visibleProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className={styles.productCard}
                >
                  <div className={styles.productImageContainer}>
                    {productImages[product.id] ? (
                      <>
                        <img
                          key={`img-all-${product.id}-${productImages[product.id]?.substring(0, 20)}`}
                          src={productImages[product.id]}
                          alt={product.name}
                          className={styles.productImage}
                          onError={(e) => {
                            console.error(`[IMG ERROR] Product ${product.id}:`, {
                              src: productImages[product.id]?.substring(0, 100),
                              error: e
                            });
                            e.target.style.display = 'none';
                            const placeholder = e.target.nextElementSibling;
                            if (placeholder) {
                              placeholder.style.display = 'flex';
                            }
                          }}
                          onLoad={() => {
                            console.log(`[IMG SUCCESS] Product ${product.id} - Image loaded`);
                          }}
                        />
                        <div className={styles.productImagePlaceholder} style={{ display: 'none' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </>
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
                    {product.soldCount > 0 && (
                      <div className={styles.productSold}>Đã bán: {product.soldCount}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {hasMoreProducts && (
              <div className={styles.loadMoreContainer}>
                <button
                  type="button"
                  className={styles.loadMoreButton}
                  onClick={handleLoadMoreProducts}
                >
                  <span>Xem thêm</span>
                  <svg className={styles.loadMoreIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {footerContent && (
        <footer className={styles.footer}>
          <div className={styles.footerGrid}>
            <div className={`${styles.footerColumn} ${styles.footerBrand}`}>
              <h3>HomeTech</h3>
              <p>{footerContent.about}</p>
              <div className={styles.footerSocials}>
                {footerContent.facebookUrl && (
                  <a href={footerContent.facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink}>
                    Facebook
                  </a>
                )}
                {footerContent.instagramUrl && (
                  <a href={footerContent.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink}>
                    Instagram
                  </a>
                )}
                {footerContent.youtubeUrl && (
                  <a href={footerContent.youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink}>
                    YouTube
                  </a>
                )}
                {footerContent.tiktokUrl && (
                  <a href={footerContent.tiktokUrl} target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink}>
                    TikTok
                  </a>
                )}
              </div>
            </div>
            <div className={styles.footerColumn}>
              <h4>Liên hệ</h4>
              <ul className={styles.footerContact}>
                {footerContent.hotline && <li>Hotline: <a href={`tel:${footerContent.hotline}`}>{footerContent.hotline}</a></li>}
                {footerContent.email && <li>Email: <a href={`mailto:${footerContent.email}`}>{footerContent.email}</a></li>}
                {footerContent.address && <li>Địa chỉ: {footerContent.address}</li>}
              </ul>
            </div>
            <div className={styles.footerColumn}>
              <h4>Hỗ trợ</h4>
              <ul className={styles.footerContact}>
                <li>Thời gian: {footerContent.supportHours}</li>
                <li><Link to="/orders">Theo dõi đơn hàng</Link></li>
                <li><Link to="/favorites">Danh sách yêu thích</Link></li>
                <li><Link to="/repair-packages">Sản phẩm sửa chữa</Link></li>
                <li><Link to="/my-repair-schedules">Lịch sửa chữa của tôi</Link></li>
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© {new Date().getFullYear()} HomeTech. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default Home;
