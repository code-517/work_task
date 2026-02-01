const mysql = require('mysql2');

// 建立 MySQL 連線
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // 替換為你的 MySQL 用戶名
  port: '3300',
  password: '1234', // 替換為你的 MySQL 密碼
  database: 'shopmart', // 替換為你的資料庫名稱
});

// 連線到資料庫
db.connect((err) => {
  if (err) {
    console.error('MySQL 連線失敗:', err.message);
  } else {
    console.log('已成功連線到 MySQL 資料庫');
  }
});

module.exports = db;