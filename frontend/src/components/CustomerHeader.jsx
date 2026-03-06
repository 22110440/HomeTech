import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CustomerHeader.module.css';

export default function CustomerHeader() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/repair-packages?keyword=${encodeURIComponent(q)}` : '/repair-packages');
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>HomeTech</Link>
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
    </header>
  );
}
