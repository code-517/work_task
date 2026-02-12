import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ThankYouPage.module.css'; // 可選，為感謝頁面設置樣式

function ThankYouPage() {
  return (
    <div className={styles.thankYouPage}>
      <h1>感謝您的訂購！</h1>
      <p>您的訂單已成功提交，我們將盡快處理。</p>
      <Link to="/">
        <button className={styles.backToStoreButton}>返回商店</button>
      </Link>
    </div>
  );
}

export default ThankYouPage;