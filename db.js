const mysql = require('mysql2');
require('dotenv').config();

// 建立 MySQL 連線（使用 .env 變數）
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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