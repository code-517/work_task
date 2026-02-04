const express = require('express');
const router = express.Router();
const db = require('../db');

// 獲取所有商品
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM products';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 新增商品
router.post('/', (req, res) => {
  const { name, price, image, stock } = req.body; // Include stock in the request body

  const sql = 'INSERT INTO products (name, price, image, stock) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, price, image, stock || 0], (err, result) => { // Default stock to 0 if not provided
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '商品新增成功', id: result.insertId });
  });
});

// 更新商品
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, image, stock } = req.body; // Include stock in the request body
  const sql = 'UPDATE products SET name = ?, price = ?, image = ?, stock = ? WHERE id = ?';
  db.query(sql, [name, price, image, stock, id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '商品更新成功' });
  });
});

// 刪除商品
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM products WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '商品刪除成功' });
  });
});

module.exports = router;