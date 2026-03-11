import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { userAPI } from '../services/api';
import styles from './RepairPackages.module.css';

export default function RepairPackages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await userAPI.getRepairPackages();
        setItems(res?.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = items.filter((i) =>
    !keyword.trim() || i.serviceName?.toLowerCase().includes(keyword.toLowerCase()) || i.phoneType?.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Sản phẩm sửa chữa</h1>
      </div>
      <input className={styles.search} placeholder="Tìm theo tên gói hoặc dòng máy" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {loading ? <p>Đang tải...</p> : (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <article key={item.id} className={styles.card}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.serviceName} className={styles.packageImage} />}
              <h3>{item.serviceName}</h3>
              <p>Loại máy: {item.phoneType}</p>
              <p>Danh mục: {item.serviceCategory}</p>
              <p>{item.description}</p>
              <strong>{Number(item.price || 0).toLocaleString('vi-VN')} đ</strong>
              <Link to={`/repair-packages/${item.id}`} className={styles.btn}>Xem chi tiết</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
