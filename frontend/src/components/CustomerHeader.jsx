import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import styles from './CustomerHeader.module.css';

export default function CustomerHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await userAPI.getAllCategories();
        setCategories(res?.data || []);
      } catch {
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/?keyword=${encodeURIComponent(q)}` : '/');
  };

  const isHome = location.pathname === '/';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.leftGroup}>
          {!isHome && (
            <button className={styles.backButton} onClick={() => navigate(-1)} type="button">
              ← Quay lại
            </button>
          )}
          <Link to="/" className={styles.brand}>HomeTech</Link>
        </div>

        <form className={styles.searchForm} onSubmit={submit}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm sản phẩm / dịch vụ sửa chữa..."
          />
          <button type="submit">Tìm</button>
        </form>

        <nav className={styles.nav}>
          <Link to="/">Mua hàng</Link>
          <Link to="/repair-packages">Sửa chữa</Link>
          <Link to="/trade-in">Thu cũ đổi mới</Link>
        </nav>
      </div>

      {categories.length > 0 && (
        <div className={styles.categoriesBar}>
          <div className={styles.categoriesInner}>
            {categories.map((category) => (
              <Link key={category.id} to={`/?category=${category.id}`} className={styles.categoryItem}>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
