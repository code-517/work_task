const mysql = require('mysql2');

// 建立 MySQL 連線
const db = mysql.createConnection({
  host: 'trolley.proxy.rlwy.net',
  user: 'root',
  port: 36295,
  password: 'RmuDWQZIGISNQgSQYEBQwEwNNDgUrupK',
  database: 'railway',
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