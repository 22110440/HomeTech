import { Link } from 'react-router-dom';

export default function TradeIn() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1>Thu cũ đổi mới</h1>
      <p>Tính năng đang được nâng cấp. Bạn có thể để lại thông tin để được tư vấn đổi máy.</p>
      <Link to="/">← Quay về mua hàng</Link>
    </div>
  );
}
