const express = require('express');
const router = express.Router();
const db = require('../db');

// 獲取所有訂單
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM orders';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Database query error:', err); // 新增錯誤日誌
      return res.status(500).json({ error: err.message });
    }    res.json(results);
  });
});

// 新增訂單
router.post('/', (req, res) => {
  const { userId, productList, totalAmount, status } = req.body;

  // 驗證請求資料
  if (!userId || !productList || !totalAmount || !status) {
    return res.status(400).json({ error: '所有欄位都是必填的' });
  }

  // 檢查庫存是否足夠
  const checkStockPromises = productList.map((item) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT stock FROM products WHERE id = ?';
      db.query(sql, [item.productId], (err, results) => {
        if (err) return reject(err);
        if (results[0].stock < item.quantity) {
          return reject(new Error(`商品 ID ${item.productId} 庫存不足`));
        }
        resolve();
      });
    });
  });

  Promise.all(checkStockPromises)
    .then(() => {
      // 扣減庫存
      const updateStockPromises = productList.map((item) => {
        return new Promise((resolve, reject) => {
          const sql = 'UPDATE products SET stock = stock - ? WHERE id = ?';
          db.query(sql, [item.quantity, item.productId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });

      return Promise.all(updateStockPromises);
    })
    .then(() => {
      // 建立訂單
      const sql = 'INSERT INTO orders (user_id, product_list, total_amount, status) VALUES (?, ?, ?, ?)';
      db.query(sql, [userId, JSON.stringify(productList), totalAmount, status], (err, result) => {
        if (err) {
          console.error('Database insert error:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log('Order added successfully:', result);
        res.json({ message: '訂單新增成功', id: result.insertId });
      });
    })
    .catch((err) => {
      res.status(400).json({ error: err.message });
    });
});
module.exports = router;