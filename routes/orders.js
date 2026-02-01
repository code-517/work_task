const express = require('express');
const router = express.Router();
const db = require('../db');

// 獲取所有訂單
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM orders';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 新增訂單
router.post('/', (req, res) => {
  const { userId, productList, totalAmount, status } = req.body;
  const sql = 'INSERT INTO orders (user_id, product_list, total_amount, status) VALUES (?, ?, ?, ?)';
  db.query(sql, [userId, JSON.stringify(productList), totalAmount, status], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '訂單新增成功', id: result.insertId });
  });
});

module.exports = router;