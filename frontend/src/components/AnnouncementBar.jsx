import styles from './AnnouncementBar.module.css';

const announcementItems = [
  {
    icon: 'flame',
    tone: 'hot',
    label: 'Hot sale',
    text: 'Giảm đến 30% cho iPhone, Samsung, Xiaomi'
  },
  {
    icon: 'gift',
    tone: 'gift',
    label: 'Quà tặng',
    text: 'Tặng cường lực và ốp lưng cho sản phẩm áp dụng'
  },
  // {
  //   icon: 'card',
  //   tone: 'pay',
  //   label: 'Trả góp',
  //   text: '0% qua thẻ tín dụng và đối tác thanh toán'
  // },
  {
    icon: 'shield',
    tone: 'trust',
    label: 'Cam kết',
    text: 'Máy chính hãng, nguồn gốc rõ ràng, bảo hành minh bạch'
  },
  {
    icon: 'refresh',
    tone: 'swap',
    label: 'Đổi trả',
    text: '1 đổi 1 trong 7 ngày nếu lỗi phần cứng'
  }
];

function AnnouncementIcon({ name }) {
  const paths = {
    flame: (
      <>
        <path d="M12 22c4.4 0 7.5-3.1 7.5-7.2 0-2.8-1.6-5.2-4.8-7.7.2 2.1-.5 3.7-2.1 4.7.1-2.9-1.7-5.4-4.5-8.1.4 3.5-1.2 5.4-2.7 7.2-1 1.2-1.9 2.3-1.9 3.9C3.5 18.9 6.7 22 12 22Z" />
        <path d="M9.4 17.2c0 1.7 1.2 2.8 2.7 2.8 1.6 0 2.8-1.1 2.8-2.8 0-1.2-.7-2.2-2.2-3.4 0 1-.4 1.7-1.1 2.1-.1-1.2-.8-2.2-2-3.4.2 1.5-.4 2.3-.9 3.1-.2.4-.3.9-.3 1.6Z" />
      </>
    ),
    gift: (
      <>
        <path d="M20 12v8H4v-8" />
        <path d="M2.5 8h19v4h-19z" />
        <path d="M12 8v12" />
        <path d="M12 8H8.8a2.1 2.1 0 1 1 0-4.2C11 3.8 12 8 12 8Z" />
        <path d="M12 8h3.2a2.1 2.1 0 1 0 0-4.2C13 3.8 12 8 12 8Z" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.5 19 6v5.7c0 4.4-2.7 7.7-7 9.3-4.3-1.6-7-4.9-7-9.3V6l7-2.5Z" />
        <path d="m8.8 12.2 2.1 2.1 4.4-4.7" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M18.2 12A6.4 6.4 0 0 0 6.8 7.8L4 12" />
        <path d="M5.8 12a6.4 6.4 0 0 0 11.4 4.2L20 12" />
      </>
    )
  };

  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function AnnouncementGroup({ hidden = false }) {
  return (
    <div className={styles.marqueeGroup} aria-hidden={hidden}>
      {announcementItems.map((item) => (
        <span key={`${item.icon}-${item.label}`} className={`${styles.announcementItem} ${styles[item.tone]}`}>
          <span className={styles.iconWrap}>
            <AnnouncementIcon name={item.icon} />
          </span>
          <span className={styles.copy}>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.text}>{item.text}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function AnnouncementBar() {
  return (
    <div className={styles.announcementBar} role="region" aria-label="Thông báo khuyến mãi">
      <div className={styles.marqueeViewport}>
        <div className={styles.marqueeTrack}>
          <AnnouncementGroup />
          <AnnouncementGroup hidden />
        </div>
      </div>
    </div>
  );
}
